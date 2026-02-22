"""
NeuroTwin Backend
================
Emotionally Intelligent Digital Twin System for Student Connection.

Architecture:
  - FastAPI + Pydantic models for all interfaces
  - Snowflake Cortex for embeddings, sentiment, and summarization
  - LangChain (langchain-snowflake) for chain orchestration
  - Compatibility Scoring: weighted multi-factor model

All heavy lifting (embeddings, LLM calls) runs through Snowflake Cortex.
Adding new data fields = update the Pydantic model + Snowflake table. No routing changes.

Set DEMO_MODE=1 to run entirely in-memory without Snowflake credentials.
"""

from __future__ import annotations

import os
import json
import math
import time
import random
import hashlib
import logging
from queue import Empty, LifoQueue
from threading import Lock
from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from pydantic import BaseModel, Field

try:
    from cryptography.fernet import Fernet

    _HAS_CRYPTO = True
except ImportError:  # graceful fallback for dev environments
    _HAS_CRYPTO = False

try:
    from langchain_core.runnables import RunnableLambda

    _HAS_LANGCHAIN = True
except ImportError:
    _HAS_LANGCHAIN = False

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("neurotwin")
logging.getLogger("snowflake.connector").setLevel(logging.WARNING)

DEMO_MODE = os.environ.get("DEMO_MODE", "1") == "1"
ENABLE_CORTEX_EXPLANATIONS = os.environ.get("ENABLE_CORTEX_EXPLANATIONS", "0") == "1"

# Fernet symmetric encryption for journal text at rest
_ENCRYPTION_KEY = os.environ.get("ENCRYPTION_KEY", "")
_fernet = Fernet(_ENCRYPTION_KEY.encode()) if _HAS_CRYPTO and _ENCRYPTION_KEY else None


def _encrypt(text: str) -> str:
    """Encrypt text with Fernet if a key is configured, else return plain."""
    if _fernet:
        return _fernet.encrypt(text.encode()).decode()
    return text


def _decrypt(ciphertext: str) -> str:
    """Decrypt Fernet ciphertext if a key is configured, else return as-is."""
    if _fernet:
        try:
            return _fernet.decrypt(ciphertext.encode()).decode()
        except Exception:
            return ciphertext  # already plain or different key
    return ciphertext

if not DEMO_MODE:
    import snowflake.connector  # only import when actually needed

app = FastAPI(
    title="NeuroTwin API",
    description="Emotionally Intelligent Digital Twin System for Student Connection",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],            # tighten in production
    allow_methods=["*"],
    allow_headers=["*"],
)


class TimingMiddleware(BaseHTTPMiddleware):
    """Log request duration for every endpoint."""

    async def dispatch(self, request: Request, call_next):
        start = time.perf_counter()
        response = await call_next(request)
        elapsed_ms = (time.perf_counter() - start) * 1000
        logger.info(
            "%s %s → %d  %.0fms",
            request.method,
            request.url.path,
            response.status_code,
            elapsed_ms,
        )
        response.headers["X-Response-Time-Ms"] = f"{elapsed_ms:.1f}"
        return response


app.add_middleware(TimingMiddleware)

# ---------------------------------------------------------------------------
# Snowflake Connection Pool (production) / In-Memory Store (demo)
# ---------------------------------------------------------------------------

# === In-memory demo store ===
_demo_store: dict[str, dict] = {
    "students": {},
    "journal_entries": [],
    "mood_checkins": [],
    "twin_snapshots": {},
    "matches": [],
    "blocks": [],
    "safety_reports": [],
    "onboarding_responses": [],
    "notifications": [],
    "activities": [],
    "consents": {},
}

# SQL constants
_SQL_TWIN_BY_STUDENT = "SELECT * FROM twin_snapshots WHERE student_id = %s"
_SNOWFLAKE_POOL_SIZE = max(1, int(os.environ.get("SNOWFLAKE_POOL_SIZE", "4")))
_snowflake_pool: LifoQueue = LifoQueue(maxsize=_SNOWFLAKE_POOL_SIZE)
_snowflake_pool_lock = Lock()
_snowflake_conn_count = 0


def _sf_connect():
    """Return a Snowflake connection using env-based credentials."""
    return snowflake.connector.connect(
        account=os.environ["SNOWFLAKE_ACCOUNT"],
        user=os.environ["SNOWFLAKE_USER"],
        password=os.environ["SNOWFLAKE_PASSWORD"],
        database=os.environ.get("SNOWFLAKE_DATABASE", "NEUROTWIN_DB"),
        schema=os.environ.get("SNOWFLAKE_SCHEMA", "PUBLIC"),
        warehouse=os.environ.get("SNOWFLAKE_WAREHOUSE", "NEUROTWIN_WH"),
        role=os.environ.get("SNOWFLAKE_ROLE", "NEUROTWIN_APP_ROLE"),
        client_session_keep_alive=True,
    )


def _dispose_sf_conn(conn) -> None:
    global _snowflake_conn_count
    try:
        conn.close()
    finally:
        with _snowflake_pool_lock:
            _snowflake_conn_count = max(0, _snowflake_conn_count - 1)


def _acquire_sf_conn():
    global _snowflake_conn_count

    try:
        conn = _snowflake_pool.get_nowait()
    except Empty:
        with _snowflake_pool_lock:
            can_create = _snowflake_conn_count < _SNOWFLAKE_POOL_SIZE
            if can_create:
                _snowflake_conn_count += 1
        if can_create:
            return _sf_connect()
        conn = _snowflake_pool.get()

    try:
        cur = conn.cursor()
        cur.execute("SELECT 1")
        cur.close()
        return conn
    except Exception:
        _dispose_sf_conn(conn)
        with _snowflake_pool_lock:
            _snowflake_conn_count += 1
        return _sf_connect()


def _release_sf_conn(conn) -> None:
    try:
        _snowflake_pool.put_nowait(conn)
    except Exception:
        _dispose_sf_conn(conn)


def _execute(sql: str, params: tuple = (), *, fetch: bool = False):
    """Execute a query against Snowflake (skipped in DEMO_MODE)."""
    if DEMO_MODE:
        return [] if fetch else 0
    conn = _acquire_sf_conn()
    conn_broken = False
    cur = None
    try:
        cur = conn.cursor()
        cur.execute(sql, params)
        if fetch:
            cols = [d[0].lower() for d in cur.description]
            return [dict(zip(cols, row)) for row in cur.fetchall()]
        return cur.rowcount
    except Exception:
        conn_broken = True
        raise
    finally:
        if cur is not None:
            cur.close()
        if conn_broken:
            _dispose_sf_conn(conn)
        else:
            _release_sf_conn(conn)


def _ensure_student_exists(student_id: str, display_name: str = "") -> None:
    """Create a minimal students row when missing (idempotent)."""
    if DEMO_MODE:
        return
    resolved_name = display_name or student_id
    _execute(
        """
        MERGE INTO students AS tgt
        USING (SELECT %s AS student_id, %s AS display_name) AS src
        ON tgt.student_id = src.student_id
        WHEN NOT MATCHED THEN INSERT (student_id, display_name)
        VALUES (src.student_id, src.display_name)
        """,
        (student_id, resolved_name),
    )


# ---------------------------------------------------------------------------
# Pydantic Models  (the *single source of truth* for data shape)
# ---------------------------------------------------------------------------

class MoodLabel(str, Enum):
    happy = "happy"
    calm = "calm"
    sad = "sad"
    frustrated = "frustrated"
    anxious = "anxious"
    reflective = "reflective"
    tired = "tired"
    excited = "excited"


class JournalEntry(BaseModel):
    """Payload for POST /journal."""
    student_id: str = Field(..., description="Unique student identifier")
    text: str = Field(..., min_length=1, max_length=5000, description="Journal content (encrypted at rest)")
    mood_label: Optional[MoodLabel] = Field(None, description="Optional mood tag at write-time")
    tags: list[str] = Field(default_factory=list, description="Free-form tags like 'school', 'family'")


class MoodCheckIn(BaseModel):
    """Payload for POST /mood."""
    student_id: str
    mood_label: MoodLabel
    energy_level: int = Field(..., ge=1, le=10)
    stress_level: int = Field(..., ge=1, le=10)
    social_battery: int = Field(..., ge=1, le=10)
    notes: Optional[str] = Field(None, max_length=1000)


class TwinSnapshot(BaseModel):
    """
    The Emotional Digital Twin state.

    This model is the *living contract* between backend and frontend.
    To add a new dimension (e.g. `hobby_vector`), simply add a field here
    and the corresponding column to `twin_snapshots` in Snowflake.
    The API routing logic does not change.
    """
    student_id: str
    display_name: str = ""
    twin_embedding: list[float] = Field(default_factory=list, description="768-d Cortex embedding")
    emotion_distribution: dict[str, float] = Field(default_factory=dict)
    top_themes: list[str] = Field(default_factory=list)
    activity_preferences: list[str] = Field(default_factory=list)
    mood_stability: float = Field(0.0, ge=0, le=100)
    social_energy: float = Field(0.0, ge=0, le=100)
    shared_values_tags: list[str] = Field(default_factory=list)
    schedule_overlap: float = Field(0.0, ge=0, le=1, description="0-1 fraction")
    last_updated: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class PeerRecommendation(BaseModel):
    """A single match result returned to the frontend."""
    peer_id: str
    display_name: str
    compatibility_score: float = Field(..., ge=0, le=100)
    explanation: str
    shared_themes: list[str] = Field(default_factory=list)
    icebreaker: str = ""


class FeedbackPayload(BaseModel):
    student_id: str
    peer_id: str
    accepted: bool


class BlockPayload(BaseModel):
    student_id: str
    blocked_id: str


class ReportPayload(BaseModel):
    student_id: str
    reported_id: str
    reason: str = Field(..., min_length=1, max_length=1000)


class ActivityPayload(BaseModel):
    """Payload for POST /activity."""
    student_id: str
    activity_type: str = Field(..., min_length=1, max_length=64)
    description: Optional[str] = Field(None, max_length=500)
    duration_mins: Optional[int] = Field(None, ge=1)


class ConsentPayload(BaseModel):
    """Payload for POST /consent."""
    student_id: str
    consented: bool = True


class SignupPayload(BaseModel):
    """Payload for POST /signup."""
    student_id: str = Field(..., min_length=3, max_length=64, description="Unique username")
    display_name: str = Field(..., min_length=1, max_length=128)
    password: str = Field(..., min_length=4, max_length=128)
    school: str = Field("", max_length=256, description="Selected school / university")


class LoginPayload(BaseModel):
    """Payload for POST /login."""
    student_id: str
    password: str


def _hash_password(password: str) -> str:
    """Hash a password with SHA-256 + salt for storage."""
    salt = "neurotwin-salt-2026"  # In production, use per-user random salt
    return hashlib.sha256(f"{salt}:{password}".encode()).hexdigest()


def _verify_password(password: str, stored_hash: str) -> bool:
    """Check a password against its stored hash."""
    return _hash_password(password) == stored_hash


def _ensure_auth_columns() -> None:
    """Ensure auth-related columns exist for older deployments."""
    if DEMO_MODE:
        return
    try:
        _execute("ALTER TABLE students ADD COLUMN IF NOT EXISTS password_hash VARCHAR(128)")
    except Exception as exc:
        logger.warning("Auth schema auto-migration skipped: %s", exc)


# ---------------------------------------------------------------------------
# Snowflake Cortex Helpers (with demo-mode fallbacks)
# ---------------------------------------------------------------------------

_EMB_DIM = 768  # Snowflake Arctic Embed dimension

_EMOTION_KEYWORDS: dict[str, list[str]] = {
    "joy": ["happy", "grateful", "excited", "smile", "great", "love", "wonderful", "glad", "enjoy", "fun"],
    "calm": ["calm", "peace", "relax", "serene", "quiet", "mindful", "gentle", "steady", "content", "still"],
    "curiosity": ["curious", "wonder", "learn", "explore", "interesting", "discover", "why", "how", "think", "new"],
    "anxiety": ["anxious", "worry", "nervous", "stress", "overwhelm", "panic", "fear", "tense", "uneasy", "dread"],
    "sadness": ["sad", "lonely", "down", "cry", "miss", "hurt", "grief", "empty", "tired", "exhausted"],
    "frustration": ["frustrated", "angry", "annoyed", "stuck", "unfair", "hate", "irritate", "bother", "mad", "upset"],
}

_THEME_KEYWORDS: dict[str, list[str]] = {
    "Reflection": ["think", "reflect", "journal", "realize", "understand", "perspective", "looking back"],
    "Creativity": ["art", "create", "design", "music", "write", "paint", "imagine", "creative"],
    "Growth": ["grow", "improve", "learn", "better", "progress", "goal", "challenge", "develop"],
    "Social": ["friend", "talk", "hang out", "group", "social", "people", "together", "conversation"],
    "Nature": ["nature", "outside", "walk", "park", "tree", "fresh air", "garden", "hike"],
    "Music": ["music", "song", "listen", "play", "band", "guitar", "piano", "sing"],
    "Fitness": ["exercise", "run", "gym", "sport", "workout", "yoga", "stretch", "active"],
    "Family": ["family", "parent", "sibling", "home", "mom", "dad", "brother", "sister"],
    "Academic": ["school", "class", "study", "homework", "exam", "project", "grade", "teacher"],
    "Empathy": ["empathy", "kind", "care", "support", "help", "understand", "compassion", "listen"],
}


def _demo_embed(text: str) -> list[float]:
    """Generate a deterministic pseudo-embedding from text for demo mode.

    Strategy: allocate embedding dimensions to known categories (emotions, themes)
    so that students sharing categories get high cosine similarity.
    """
    # Start with small seeded noise (gives each text a unique fingerprint)
    random.seed(hashlib.md5(text.encode()).hexdigest())
    vec = [random.gauss(0, 0.05) for _ in range(_EMB_DIM)]

    lower = text.lower()

    # Map known categories to fixed dimension ranges with strong signal
    all_categories: list[tuple[str, list[str]]] = (
        [(k, v) for k, v in _EMOTION_KEYWORDS.items()]
        + [(k, v) for k, v in _THEME_KEYWORDS.items()]
    )
    dims_per_cat = max(1, _EMB_DIM // max(len(all_categories), 1))

    for idx, (cat, keywords) in enumerate(all_categories):
        hits = sum(1 for w in keywords if w in lower)
        if hits > 0:
            strength = min(hits * 0.4, 1.5)
            start = (idx * dims_per_cat) % _EMB_DIM
            for d in range(dims_per_cat):
                vec[(start + d) % _EMB_DIM] += strength

    # Normalise to unit vector
    norm = math.sqrt(sum(x * x for x in vec))
    return [x / norm for x in vec] if norm > 0 else vec


def _demo_extract(text: str) -> dict:
    """Simulate Cortex COMPLETE emotion/theme extraction for demo mode."""
    lower = text.lower()
    emotions: dict[str, float] = {}
    for emotion, words in _EMOTION_KEYWORDS.items():
        score = sum(1 for w in words if w in lower)
        if score > 0:
            emotions[emotion] = round(min(score * 0.15, 1.0), 3)
    if not emotions:
        emotions = {"calm": 0.5, "curiosity": 0.3}
    # normalise
    total = sum(emotions.values())
    emotions = {k: round(v / total, 3) for k, v in emotions.items()}

    themes = [t for t, words in _THEME_KEYWORDS.items() if any(w in lower for w in words)]
    if not themes:
        themes = ["Reflection"]

    social_hint = 50
    if any(w in lower for w in ["friend", "social", "group", "talk", "people"]):
        social_hint = 75
    elif any(w in lower for w in ["alone", "quiet", "solitude", "introvert"]):
        social_hint = 25

    return {"emotions": emotions, "themes": themes[:5], "social_energy_hint": social_hint}


def _demo_explain(_me_themes: list, _peer_themes: list, shared: list, score: float) -> dict:
    """Simulate Cortex COMPLETE explanation generation for demo mode."""
    if shared:
        explanation = f"You both connect through themes like {', '.join(shared[:3])}. Your emotional patterns suggest you'd understand each other well."
    else:
        explanation = f"Your emotional profiles complement each other with a {score}% compatibility, suggesting meaningful connection potential."
    icebreakers = [
        "What's something you've been curious about lately?",
        "What's a small thing that made your day better recently?",
        "If you could learn any skill instantly, what would it be?",
        "What's something you're proud of that most people don't know about?",
        "What kind of music do you listen to when you need to recharge?",
    ]
    random.seed(int(score * 100))
    icebreaker = random.choice(icebreakers)
    return {"explanation": explanation, "icebreaker": icebreaker}


def cortex_embed(text: str) -> list[float]:
    """Generate a 768-d embedding via Snowflake Cortex EMBED_TEXT_768."""
    if DEMO_MODE:
        return _demo_embed(text)
    rows = _execute(
        "SELECT SNOWFLAKE.CORTEX.EMBED_TEXT_768('snowflake-arctic-embed-m-v1.5', %s) AS emb",
        (text,),
        fetch=True,
    )
    raw = rows[0]["emb"]
    return json.loads(raw) if isinstance(raw, str) else list(raw)


def cortex_sentiment(text: str) -> dict:
    """Return sentiment analysis via Snowflake Cortex SENTIMENT."""
    if DEMO_MODE:
        return _demo_extract(text)
    rows = _execute(
        "SELECT SNOWFLAKE.CORTEX.SENTIMENT(%s) AS sent",
        (text,),
        fetch=True,
    )
    raw = rows[0]["sent"]
    return json.loads(raw) if isinstance(raw, str) else raw


def cortex_summarize(text: str) -> str:
    """Summarize text via Snowflake Cortex SUMMARIZE."""
    if DEMO_MODE:
        return text[:200] + "..." if len(text) > 200 else text
    rows = _execute(
        "SELECT SNOWFLAKE.CORTEX.SUMMARIZE(%s) AS summary",
        (text,),
        fetch=True,
    )
    return rows[0]["summary"]


def cortex_complete(prompt: str, model: str = "mistral-large2") -> str:
    """Run an LLM completion via Snowflake Cortex COMPLETE."""
    if DEMO_MODE:
        # In demo mode the chains call their own fallback logic
        return "{}"
    rows = _execute(
        "SELECT SNOWFLAKE.CORTEX.COMPLETE(%s, %s) AS result",
        (model, prompt),
        fetch=True,
    )
    return rows[0]["result"]


# ---------------------------------------------------------------------------
# Compatibility Scoring Model
# ---------------------------------------------------------------------------

def _clamp01(v: float) -> float:
    return max(0.0, min(1.0, v))


def _clamp100(v: float) -> float:
    return max(0.0, min(100.0, v))


def _normalize_percentage(v: float) -> float:
    """Normalize legacy 0-1 values and 0-100 values into 0-100."""
    if v <= 1.0:
        return _clamp100(v * 100.0)
    return _clamp100(v)


def _cosine_sim(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = sum(x * x for x in a) ** 0.5
    norm_b = sum(x * x for x in b) ** 0.5
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def _dict_cosine_sim(a: dict[str, float], b: dict[str, float]) -> float:
    """Cosine similarity between two sparse vectors (dicts)."""
    keys = set(a) | set(b)
    if not keys:
        return 0.0
    va = [a.get(k, 0.0) for k in keys]
    vb = [b.get(k, 0.0) for k in keys]
    return _cosine_sim(va, vb)


def _jaccard(a: list[str], b: list[str]) -> float:
    sa, sb = set(a), set(b)
    if not sa and not sb:
        return 0.0
    return len(sa & sb) / len(sa | sb)


def compute_compatibility(twin_a: TwinSnapshot, twin_b: TwinSnapshot) -> float:
    """
    CompatibilityScore% = 100 × clamp01(
        0.50 × cosine_similarity(twin_embedding_A, twin_embedding_B)
      + 0.20 × emotion_vector_similarity
      + 0.15 × activity_similarity
      + 0.10 × shared_values_tags
      + 0.05 × schedule_overlap
    )
    """
    emb_sim = _cosine_sim(twin_a.twin_embedding, twin_b.twin_embedding) if twin_a.twin_embedding and twin_b.twin_embedding else 0.0
    emo_sim = _dict_cosine_sim(twin_a.emotion_distribution, twin_b.emotion_distribution)
    act_sim = _jaccard(twin_a.activity_preferences, twin_b.activity_preferences)
    val_sim = _jaccard(twin_a.shared_values_tags, twin_b.shared_values_tags)
    sched = 1.0 - abs(twin_a.schedule_overlap - twin_b.schedule_overlap)

    raw = (
        0.50 * emb_sim
        + 0.20 * emo_sim
        + 0.15 * act_sim
        + 0.10 * val_sim
        + 0.05 * sched
    )
    return round(100.0 * _clamp01(raw), 1)


# ---------------------------------------------------------------------------
# LangChain Chains (Snowflake-native via langchain-snowflake wrappers)
# ---------------------------------------------------------------------------
# These are *conceptual* sequential chains.  In production you would use
# langchain_core.runnables.RunnableSequence with CortexLLM / CortexEmbeddings.
# Here we implement them as plain Python callables so the project runs
# with zero external LLM API keys — everything is Cortex.

class TwinBuilderChain:
    """
    Ingestion chain — called on every journal entry or mood check-in.

    Steps:
      1. Standardise input text.
      2. Generate embedding via Cortex EMBED_TEXT.
      3. Extract emotion + theme tags via Cortex COMPLETE.
      4. Merge into the rolling TwinSnapshot and persist to Snowflake.
    """

    @staticmethod
    def run(student_id: str, text: str, existing_twin: Optional[TwinSnapshot] = None) -> TwinSnapshot:
        logger.info("TwinBuilderChain.run  student=%s", student_id)

        # Step 1 — Embedding
        embedding = cortex_embed(text)

        # Step 2 — Theme & emotion extraction
        if DEMO_MODE:
            extracted = _demo_extract(text)
        else:
            extraction_prompt = f"""Analyze the following student journal entry. Return valid JSON only.
{{
  "emotions": {{"emotion_name": probability_float, ...}},
  "themes": ["theme1", "theme2", ...],
  "social_energy_hint": 0-100 integer
}}

Journal entry:
\"\"\"{text}\"\"\"
"""
            raw_json = cortex_complete(extraction_prompt)
            try:
                extracted = json.loads(raw_json)
            except json.JSONDecodeError:
                extracted = {"emotions": {}, "themes": [], "social_energy_hint": 50}

        # Step 3 — Merge with existing twin (rolling average)
        if existing_twin is None:
            twin = TwinSnapshot(
                student_id=student_id,
                twin_embedding=embedding,
                emotion_distribution=extracted.get("emotions", {}),
                top_themes=extracted.get("themes", [])[:10],
                social_energy=float(extracted.get("social_energy_hint", 50)),
                mood_stability=50.0,
                last_updated=datetime.now(timezone.utc),
            )
        else:
            # Exponential moving average on the embedding (alpha=0.3 for new data)
            alpha = 0.3
            merged_emb = [
                alpha * new + (1 - alpha) * old
                for new, old in zip(embedding, existing_twin.twin_embedding)
            ] if existing_twin.twin_embedding else embedding

            # Merge emotion distribution
            merged_emo: dict[str, float] = {}
            all_keys = set(existing_twin.emotion_distribution) | set(extracted.get("emotions", {}))
            for k in all_keys:
                old_v = existing_twin.emotion_distribution.get(k, 0.0)
                new_v = extracted.get("emotions", {}).get(k, 0.0)
                merged_emo[k] = round(alpha * new_v + (1 - alpha) * old_v, 4)

            # Merge themes (deduplicate, keep most recent at front)
            new_themes = extracted.get("themes", [])
            merged_themes = list(dict.fromkeys(new_themes + existing_twin.top_themes))[:10]

            twin = existing_twin.model_copy(update={
                "twin_embedding": merged_emb,
                "emotion_distribution": merged_emo,
                "top_themes": merged_themes,
                "social_energy": alpha * float(extracted.get("social_energy_hint", existing_twin.social_energy)) + (1 - alpha) * existing_twin.social_energy,
                "last_updated": datetime.now(timezone.utc),
            })

        # Step 4 — Persist
        if DEMO_MODE:
            _demo_store["twin_snapshots"][twin.student_id] = twin
        else:
            _execute(
                """
                MERGE INTO twin_snapshots AS tgt
                USING (
                    SELECT
                        %s AS student_id,
                        PARSE_JSON(%s) AS twin_embedding,
                        PARSE_JSON(%s) AS emotion_distribution,
                        PARSE_JSON(%s) AS top_themes,
                        PARSE_JSON(%s) AS activity_preferences,
                        %s AS mood_stability,
                        %s AS social_energy,
                        PARSE_JSON(%s) AS shared_values_tags,
                        %s AS schedule_overlap,
                        %s AS last_updated
                ) AS src
                ON tgt.student_id = src.student_id
                WHEN MATCHED THEN UPDATE SET
                    twin_embedding   = src.twin_embedding,
                    emotion_distribution = src.emotion_distribution,
                    top_themes       = src.top_themes,
                    activity_preferences = src.activity_preferences,
                    mood_stability   = src.mood_stability,
                    social_energy    = src.social_energy,
                    shared_values_tags = src.shared_values_tags,
                    schedule_overlap = src.schedule_overlap,
                    last_updated     = src.last_updated
                WHEN NOT MATCHED THEN INSERT (
                    student_id, twin_embedding, emotion_distribution, top_themes,
                    activity_preferences, mood_stability, social_energy,
                    shared_values_tags, schedule_overlap, last_updated
                ) VALUES (
                    src.student_id,
                    src.twin_embedding,
                    src.emotion_distribution,
                    src.top_themes,
                    src.activity_preferences,
                    src.mood_stability,
                    src.social_energy,
                    src.shared_values_tags,
                    src.schedule_overlap,
                    src.last_updated
                )
                """,
                (
                    twin.student_id,
                    json.dumps(twin.twin_embedding),
                    json.dumps(twin.emotion_distribution),
                    json.dumps(twin.top_themes),
                    json.dumps(twin.activity_preferences),
                    twin.mood_stability,
                    twin.social_energy,
                    json.dumps(twin.shared_values_tags),
                    twin.schedule_overlap,
                    twin.last_updated.isoformat(),
                ),
            )

        return twin


class MatchRetrievalChain:
    """
    Retrieval chain — finds emotionally compatible peers.

    Steps:
      1. Load the requesting student's twin.
      2. Vector-search Snowflake for candidate peers.
      3. Score each via the Compatibility Model.
      4. Filter ≥ 50 % and sort descending.
      5. Generate explanation + icebreaker via Cortex COMPLETE.
    """

    @staticmethod
    def run(student_id: str, top_k: int = 10) -> list[PeerRecommendation]:
        logger.info("MatchRetrievalChain.run  student=%s", student_id)

        # 1 — Load own twin
        if DEMO_MODE:
            me = _demo_store["twin_snapshots"].get(student_id)
            if me is None:
                return []
        else:
            rows = _execute(
                _SQL_TWIN_BY_STUDENT,
                (student_id,),
                fetch=True,
            )
            if not rows:
                return []
            me = _row_to_twin(rows[0])

        # 2 — Candidate retrieval
        if DEMO_MODE:
            # Gather blocked peer IDs
            blocked_ids = {b["blocked_id"] for b in _demo_store["blocks"] if b["blocker_id"] == student_id}
            # In demo mode compute compatibility against all other twins in memory
            all_twins = [
                t for sid, t in _demo_store["twin_snapshots"].items()
                if sid != student_id and sid not in blocked_ids
            ]
        else:
            candidates = _execute(
                """
                SELECT t.*,
                      VECTOR_COSINE_SIMILARITY(t.twin_embedding::VECTOR(FLOAT, 768), PARSE_JSON(%s)::VECTOR(FLOAT, 768)) AS vec_sim
                FROM twin_snapshots t
                  WHERE t.student_id != %s
                    AND t.twin_embedding IS NOT NULL
                    AND t.student_id NOT IN (
                        SELECT blocked_id FROM blocks WHERE blocker_id = %s
                    )
                ORDER BY vec_sim DESC
                LIMIT %s
                """,
                (json.dumps(me.twin_embedding), student_id, student_id, top_k * 2),
                fetch=True,
            )
            all_twins = [_row_to_twin(row) for row in candidates]

        # 3 — Full compatibility scoring
        scored: list[tuple[TwinSnapshot, float]] = []
        for peer in all_twins:
            score = compute_compatibility(me, peer)
            if score >= 50.0:
                scored.append((peer, score))

        scored.sort(key=lambda x: x[1], reverse=True)
        scored = scored[:top_k]

        # 4 — Generate explanations
        recommendations: list[PeerRecommendation] = []
        for peer, score in scored:
            shared = list(set(me.top_themes) & set(peer.top_themes))
            explanation, icebreaker = _generate_explanation(me, peer, score, shared)
            recommendations.append(PeerRecommendation(
                peer_id=peer.student_id,
                display_name=peer.display_name or _anonymize(peer.student_id),
                compatibility_score=score,
                explanation=explanation,
                shared_themes=shared,
                icebreaker=icebreaker,
            ))

        return recommendations


class ExplanationChain:
    """
    Generates the human-readable 'why you match' text and icebreaker.
    Runs through Cortex COMPLETE with safety guardrails.
    """

    @staticmethod
    def run(me: TwinSnapshot, peer: TwinSnapshot, score: float, shared: list[str]) -> tuple[str, str]:
        if DEMO_MODE:
            result = _demo_explain(me.top_themes, peer.top_themes, shared, score)
            return result.get("explanation", ""), result.get("icebreaker", "")

        prompt = f"""You are NeuroTwin, an emotionally intelligent student connection assistant.
Given two student profiles (no raw journal text), explain why they are a good match
and suggest one engaging icebreaker question.

Student A themes: {json.dumps(me.top_themes)}
Student A emotions: {json.dumps(me.emotion_distribution)}
Student B themes: {json.dumps(peer.top_themes)}
Student B emotions: {json.dumps(peer.emotion_distribution)}
Shared themes: {json.dumps(shared)}
Compatibility score: {score}%

Respond in JSON:
{{"explanation": "...", "icebreaker": "..."}}

Rules:
- Never mention raw journal content.
- Keep it warm, safe, and age-appropriate.
- Max 2 sentences per field.
"""
        raw = cortex_complete(prompt)
        try:
            parsed = json.loads(raw)
            return parsed.get("explanation", ""), parsed.get("icebreaker", "")
        except json.JSONDecodeError:
            return (
                f"You share themes like {', '.join(shared[:3])} and have a {score}% compatibility score.",
                "What's something new you've been curious about lately?",
            )


def _generate_explanation(me: TwinSnapshot, peer: TwinSnapshot, score: float, shared: list[str]) -> tuple[str, str]:
    if not ENABLE_CORTEX_EXPLANATIONS:
        if shared:
            return (
                f"You both connect through {', '.join(shared[:3])}, with complementary emotional patterns.",
                "What part of your week has felt most meaningful lately?",
            )
        return (
            f"Your profiles complement each other with a {score}% compatibility score.",
            "What’s one thing you’re currently excited to learn or try?",
        )
    return ExplanationChain.run(me, peer, score, shared)


# ---------------------------------------------------------------------------
# LangChain Runnable Wrappers
# ---------------------------------------------------------------------------
# Expose each chain as a proper langchain-core Runnable so it can participate
# in LangChain tracing, callbacks, and RunnableSequence composition.

if _HAS_LANGCHAIN:
    twin_builder_runnable = RunnableLambda(
        lambda inputs: TwinBuilderChain.run(**inputs),
    ).with_config({"run_name": "TwinBuilderChain"})

    match_retrieval_runnable = RunnableLambda(
        lambda inputs: MatchRetrievalChain.run(**inputs),
    ).with_config({"run_name": "MatchRetrievalChain"})

    explanation_runnable = RunnableLambda(
        lambda inputs: ExplanationChain.run(**inputs),
    ).with_config({"run_name": "ExplanationChain"})

    # Full recommendation pipeline as a single Runnable
    recommendation_pipeline = match_retrieval_runnable
else:
    twin_builder_runnable = None
    match_retrieval_runnable = None
    explanation_runnable = None
    recommendation_pipeline = None


def _anonymize(student_id: str) -> str:
    h = hashlib.sha256(student_id.encode()).hexdigest()[:6]
    return f"Student-{h.upper()}"


def _row_to_twin(row: dict) -> TwinSnapshot:
    """Convert a raw Snowflake row dict into a TwinSnapshot model."""
    def _parse_json_field(val, default):
        if val is None:
            return default
        if isinstance(val, str):
            try:
                return json.loads(val)
            except json.JSONDecodeError:
                return default
        return val

    def _to_float(val, default: float = 0.0) -> float:
        if val is None:
            return default
        try:
            return float(val)
        except (TypeError, ValueError):
            return default

    return TwinSnapshot(
        student_id=row.get("student_id", ""),
        display_name=row.get("display_name") or "",
        twin_embedding=_parse_json_field(row.get("twin_embedding"), []),
        emotion_distribution=_parse_json_field(row.get("emotion_distribution"), {}),
        top_themes=_parse_json_field(row.get("top_themes"), []),
        activity_preferences=_parse_json_field(row.get("activity_preferences"), []),
        mood_stability=_normalize_percentage(_to_float(row.get("mood_stability"), 0.0)),
        social_energy=_to_float(row.get("social_energy"), 0.0),
        shared_values_tags=_parse_json_field(row.get("shared_values_tags"), []),
        schedule_overlap=_to_float(row.get("schedule_overlap"), 0.0),
        last_updated=row.get("last_updated") or datetime.now(timezone.utc),
    )


# ---------------------------------------------------------------------------
# Database Bootstrap (idempotent)
# ---------------------------------------------------------------------------

BOOTSTRAP_SQL = """
CREATE TABLE IF NOT EXISTS students (
    student_id     VARCHAR(64)  PRIMARY KEY,
    display_name   VARCHAR(128),
    email_hash     VARCHAR(128),
    password_hash  VARCHAR(128),
    onboarded      BOOLEAN      DEFAULT FALSE,
    created_at     TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    updated_at     TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

ALTER TABLE students ADD COLUMN IF NOT EXISTS password_hash VARCHAR(128);

CREATE TABLE IF NOT EXISTS journal_entries (
    id             VARCHAR(64)  DEFAULT UUID_STRING() PRIMARY KEY,
    student_id     VARCHAR(64)  NOT NULL REFERENCES students(student_id),
    text_encrypted VARCHAR(16777216),
    mood_label     VARCHAR(32),
    tags           VARIANT,
    embedding      VARIANT,
    created_at     TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

CREATE TABLE IF NOT EXISTS mood_checkins (
    id             VARCHAR(64)  DEFAULT UUID_STRING() PRIMARY KEY,
    student_id     VARCHAR(64)  NOT NULL REFERENCES students(student_id),
    mood_label     VARCHAR(32)  NOT NULL,
    energy_level   INT,
    stress_level   INT,
    social_battery INT,
    notes          VARCHAR(1000),
    created_at     TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

CREATE TABLE IF NOT EXISTS activities (
    id             VARCHAR(64)  DEFAULT UUID_STRING() PRIMARY KEY,
    student_id     VARCHAR(64)  NOT NULL REFERENCES students(student_id),
    activity_type  VARCHAR(64)  NOT NULL,
    description    VARCHAR(500),
    duration_mins  INT,
    created_at     TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

CREATE TABLE IF NOT EXISTS twin_snapshots (
    student_id            VARCHAR(64) PRIMARY KEY REFERENCES students(student_id),
    display_name          VARCHAR(128),
    twin_embedding        VARIANT,
    emotion_distribution  VARIANT,
    top_themes            VARIANT,
    activity_preferences  VARIANT,
    mood_stability        FLOAT      DEFAULT 0,
    social_energy         FLOAT      DEFAULT 0,
    shared_values_tags    VARIANT,
    schedule_overlap      FLOAT      DEFAULT 0,
    version               INT        DEFAULT 1,
    last_updated          TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

CREATE TABLE IF NOT EXISTS matches (
    id             VARCHAR(64)  DEFAULT UUID_STRING() PRIMARY KEY,
    student_a      VARCHAR(64)  NOT NULL REFERENCES students(student_id),
    student_b      VARCHAR(64)  NOT NULL REFERENCES students(student_id),
    score          FLOAT,
    explanation    VARCHAR(2000),
    icebreaker     VARCHAR(500),
    accepted       BOOLEAN,
    created_at     TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

CREATE TABLE IF NOT EXISTS blocks (
    id             VARCHAR(64)  DEFAULT UUID_STRING() PRIMARY KEY,
    blocker_id     VARCHAR(64)  NOT NULL REFERENCES students(student_id),
    blocked_id     VARCHAR(64)  NOT NULL REFERENCES students(student_id),
    created_at     TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

CREATE TABLE IF NOT EXISTS safety_reports (
    id             VARCHAR(64)  DEFAULT UUID_STRING() PRIMARY KEY,
    reporter_id    VARCHAR(64)  NOT NULL REFERENCES students(student_id),
    reported_id    VARCHAR(64)  NOT NULL REFERENCES students(student_id),
    reason         VARCHAR(1000) NOT NULL,
    category       VARCHAR(32)  DEFAULT 'OTHER',
    resolved       BOOLEAN      DEFAULT FALSE,
    resolved_by    VARCHAR(64),
    resolved_at    TIMESTAMP_NTZ,
    created_at     TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

CREATE TABLE IF NOT EXISTS onboarding_responses (
    id             VARCHAR(64)  DEFAULT UUID_STRING() PRIMARY KEY,
    student_id     VARCHAR(64)  NOT NULL REFERENCES students(student_id),
    selected_mood  VARCHAR(32),
    energy_level   INT,
    social_battery INT,
    activities     VARIANT,
    values         VARIANT,
    journal_text   VARCHAR(5000),
    completed_at   TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

CREATE TABLE IF NOT EXISTS notifications (
    id             VARCHAR(64)  DEFAULT UUID_STRING() PRIMARY KEY,
    student_id     VARCHAR(64)  NOT NULL REFERENCES students(student_id),
    type           VARCHAR(32)  NOT NULL,
    title          VARCHAR(256),
    body           VARCHAR(1000),
    read           BOOLEAN      DEFAULT FALSE,
    created_at     TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);
"""


def _seed_demo_data():
    """Populate _demo_store with 20 Duke University students with realistic, varied profiles."""
    profiles = [
        # ── Cluster A: Tech / AI enthusiasts (high mutual compatibility ~85-95%) ──
        {
            "id": "duke-emma", "name": "Emma", "school": "Duke University",
            "emotions": {"curiosity": 0.35, "joy": 0.25, "determination": 0.20, "calm": 0.12, "excitement": 0.08},
            "themes": ["artificial intelligence", "coding", "hiking", "mindfulness", "music"],
            "activities": ["coding", "trail running", "reading", "guitar"],
            "values": ["creativity", "growth", "authenticity"],
            "energy": 75, "mood_stability": 80, "schedule": 0.7,
        },
        {
            "id": "duke-liam", "name": "Liam", "school": "Duke University",
            "emotions": {"curiosity": 0.30, "joy": 0.25, "calm": 0.20, "determination": 0.15, "hope": 0.10},
            "themes": ["artificial intelligence", "coding", "hiking", "meditation", "robotics"],
            "activities": ["coding", "trail running", "reading", "gaming"],
            "values": ["growth", "innovation", "creativity"],
            "energy": 70, "mood_stability": 82, "schedule": 0.65,
        },
        {
            "id": "duke-sophia", "name": "Sophia", "school": "Duke University",
            "emotions": {"curiosity": 0.30, "determination": 0.25, "calm": 0.20, "joy": 0.15, "excitement": 0.10},
            "themes": ["artificial intelligence", "coding", "yoga", "nature", "music"],
            "activities": ["coding", "yoga", "reading", "guitar"],
            "values": ["creativity", "growth", "authenticity"],
            "energy": 68, "mood_stability": 85, "schedule": 0.6,
        },
        {
            "id": "duke-ethan", "name": "Ethan", "school": "Duke University",
            "emotions": {"curiosity": 0.25, "determination": 0.25, "excitement": 0.20, "joy": 0.15, "anxiety": 0.15},
            "themes": ["coding", "computer science", "gaming", "artificial intelligence", "music production"],
            "activities": ["coding", "gaming", "guitar", "reading"],
            "values": ["innovation", "creativity", "growth"],
            "energy": 72, "mood_stability": 70, "schedule": 0.75,
        },

        # ── Cluster B: Creative / Empathetic (high mutual ~80-90%) ──
        {
            "id": "duke-olivia", "name": "Olivia", "school": "Duke University",
            "emotions": {"empathy": 0.30, "joy": 0.25, "calm": 0.20, "hope": 0.15, "nostalgia": 0.10},
            "themes": ["poetry", "community", "dance", "mindfulness", "psychology"],
            "activities": ["dance", "volunteering", "journaling", "yoga"],
            "values": ["empathy", "community", "authenticity"],
            "energy": 62, "mood_stability": 78, "schedule": 0.5,
        },
        {
            "id": "duke-noah", "name": "Noah", "school": "Duke University",
            "emotions": {"empathy": 0.28, "calm": 0.25, "curiosity": 0.20, "hope": 0.15, "joy": 0.12},
            "themes": ["psychology", "creative writing", "music", "volunteering", "mindfulness"],
            "activities": ["journaling", "yoga", "volunteering", "reading"],
            "values": ["empathy", "sustainability", "authenticity"],
            "energy": 55, "mood_stability": 86, "schedule": 0.5,
        },
        {
            "id": "duke-ava", "name": "Ava", "school": "Duke University",
            "emotions": {"empathy": 0.30, "determination": 0.20, "calm": 0.20, "hope": 0.15, "joy": 0.15},
            "themes": ["social justice", "creative writing", "yoga", "community", "mindfulness"],
            "activities": ["volunteering", "yoga", "journaling", "dance"],
            "values": ["justice", "empathy", "community"],
            "energy": 60, "mood_stability": 80, "schedule": 0.55,
        },
        {
            "id": "duke-isabella", "name": "Isabella", "school": "Duke University",
            "emotions": {"empathy": 0.25, "nostalgia": 0.20, "joy": 0.20, "calm": 0.20, "hope": 0.15},
            "themes": ["poetry", "dance", "psychology", "music", "mindfulness"],
            "activities": ["dance", "journaling", "yoga", "reading"],
            "values": ["community", "empathy", "creativity"],
            "energy": 58, "mood_stability": 82, "schedule": 0.45,
        },

        # ── Cluster C: Entrepreneurial / Athletic (mutual ~75-85%) ──
        {
            "id": "duke-jackson", "name": "Jackson", "school": "Duke University",
            "emotions": {"excitement": 0.30, "determination": 0.25, "joy": 0.20, "anxiety": 0.15, "curiosity": 0.10},
            "themes": ["entrepreneurship", "fitness", "basketball", "cooking", "travel"],
            "activities": ["basketball", "cooking", "coding", "trail running"],
            "values": ["ambition", "teamwork", "growth"],
            "energy": 88, "mood_stability": 65, "schedule": 0.7,
        },
        {
            "id": "duke-mia", "name": "Mia", "school": "Duke University",
            "emotions": {"excitement": 0.25, "joy": 0.25, "determination": 0.20, "curiosity": 0.15, "hope": 0.15},
            "themes": ["entrepreneurship", "fitness", "travel", "photography", "cooking"],
            "activities": ["trail running", "cooking", "yoga", "basketball"],
            "values": ["ambition", "growth", "teamwork"],
            "energy": 82, "mood_stability": 70, "schedule": 0.65,
        },
        {
            "id": "duke-aiden", "name": "Aiden", "school": "Duke University",
            "emotions": {"determination": 0.30, "excitement": 0.25, "joy": 0.20, "anxiety": 0.15, "curiosity": 0.10},
            "themes": ["fitness", "basketball", "entrepreneurship", "music", "travel"],
            "activities": ["basketball", "guitar", "trail running", "coding"],
            "values": ["teamwork", "ambition", "growth"],
            "energy": 85, "mood_stability": 68, "schedule": 0.75,
        },

        # ── Cluster D: Academic / Reflective (mutual ~70-80%) ──
        {
            "id": "duke-charlotte", "name": "Charlotte", "school": "Duke University",
            "emotions": {"calm": 0.30, "curiosity": 0.25, "reflection": 0.20, "gratitude": 0.15, "joy": 0.10},
            "themes": ["philosophy", "reading", "astronomy", "art history", "meditation"],
            "activities": ["reading", "stargazing", "painting", "yoga"],
            "values": ["knowledge", "patience", "creativity"],
            "energy": 42, "mood_stability": 92, "schedule": 0.35,
        },
        {
            "id": "duke-lucas", "name": "Lucas", "school": "Duke University",
            "emotions": {"curiosity": 0.30, "calm": 0.25, "reflection": 0.20, "nostalgia": 0.15, "joy": 0.10},
            "themes": ["reading", "philosophy", "astronomy", "creative writing", "nature"],
            "activities": ["reading", "stargazing", "journaling", "trail running"],
            "values": ["knowledge", "patience", "authenticity"],
            "energy": 45, "mood_stability": 88, "schedule": 0.4,
        },
        {
            "id": "duke-amelia", "name": "Amelia", "school": "Duke University",
            "emotions": {"reflection": 0.25, "nostalgia": 0.25, "calm": 0.20, "curiosity": 0.20, "joy": 0.10},
            "themes": ["art history", "reading", "philosophy", "museum", "journaling"],
            "activities": ["reading", "painting", "journaling", "yoga"],
            "values": ["knowledge", "creativity", "patience"],
            "energy": 40, "mood_stability": 90, "schedule": 0.3,
        },

        # ── Diverse / Cross-cluster (creates varied scores across all clusters) ──
        {
            "id": "duke-harper", "name": "Harper", "school": "Duke University",
            "emotions": {"joy": 0.30, "excitement": 0.25, "anxiety": 0.20, "hope": 0.15, "empathy": 0.10},
            "themes": ["theater", "singing", "dance", "photography", "travel"],
            "activities": ["dance", "cooking", "yoga", "volunteering"],
            "values": ["creativity", "community", "growth"],
            "energy": 78, "mood_stability": 60, "schedule": 0.55,
        },
        {
            "id": "duke-mason", "name": "Mason", "school": "Duke University",
            "emotions": {"curiosity": 0.35, "determination": 0.25, "calm": 0.20, "anxiety": 0.10, "joy": 0.10},
            "themes": ["chemistry", "research", "nature", "reading", "meditation"],
            "activities": ["reading", "trail running", "coding", "stargazing"],
            "values": ["knowledge", "innovation", "patience"],
            "energy": 50, "mood_stability": 84, "schedule": 0.4,
        },
        {
            "id": "duke-ella", "name": "Ella", "school": "Duke University",
            "emotions": {"excitement": 0.35, "joy": 0.30, "curiosity": 0.15, "hope": 0.10, "anxiety": 0.10},
            "themes": ["fashion", "photography", "travel", "music", "cooking"],
            "activities": ["cooking", "yoga", "dance", "guitar"],
            "values": ["creativity", "growth", "community"],
            "energy": 90, "mood_stability": 55, "schedule": 0.8,
        },
        {
            "id": "duke-james", "name": "James", "school": "Duke University",
            "emotions": {"calm": 0.35, "reflection": 0.25, "curiosity": 0.20, "nostalgia": 0.10, "gratitude": 0.10},
            "themes": ["hiking", "nature", "reading", "philosophy", "meditation"],
            "activities": ["trail running", "reading", "stargazing", "painting"],
            "values": ["patience", "knowledge", "authenticity"],
            "energy": 35, "mood_stability": 95, "schedule": 0.3,
        },
        {
            "id": "duke-scarlett", "name": "Scarlett", "school": "Duke University",
            "emotions": {"determination": 0.30, "hope": 0.25, "empathy": 0.20, "joy": 0.15, "anxiety": 0.10},
            "themes": ["sustainability", "social justice", "nature", "community", "volunteering"],
            "activities": ["volunteering", "trail running", "yoga", "reading"],
            "values": ["sustainability", "justice", "community"],
            "energy": 65, "mood_stability": 75, "schedule": 0.5,
        },
        {
            "id": "duke-benjamin", "name": "Benjamin", "school": "Duke University",
            "emotions": {"determination": 0.35, "anxiety": 0.25, "curiosity": 0.20, "excitement": 0.10, "joy": 0.10},
            "themes": ["finance", "entrepreneurship", "basketball", "cooking", "travel"],
            "activities": ["basketball", "cooking", "coding", "reading"],
            "values": ["ambition", "growth", "innovation"],
            "energy": 80, "mood_stability": 58, "schedule": 0.85,
        },
    ]

    for p in profiles:
        _demo_store["students"][p["id"]] = {
            "student_id": p["id"],
            "display_name": p["name"],
            "password_hash": _hash_password("demo"),
            "school": p.get("school", "Duke University"),
            "onboarded": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        seed_text = f"{p['name']} cares about {', '.join(p['themes'][:3])}. " \
                    f"Values: {', '.join(p['values'])}. Activities: {', '.join(p['activities'])}."
        twin = TwinSnapshot(
            student_id=p["id"],
            display_name=p["name"],
            twin_embedding=_demo_embed(seed_text),
            emotion_distribution=p["emotions"],
            top_themes=p["themes"],
            activity_preferences=p["activities"],
            mood_stability=p["mood_stability"],
            social_energy=float(p["energy"]),
            shared_values_tags=p["values"],
            schedule_overlap=p["schedule"],
            last_updated=datetime.now(timezone.utc),
        )
        _demo_store["twin_snapshots"][p["id"]] = twin

    logger.info("Seeded %d Duke University demo students.", len(profiles))


@app.on_event("startup")
async def _bootstrap():
    """Run DDL on startup — safe to re-run (CREATE IF NOT EXISTS)."""
    if DEMO_MODE:
        logger.info("DEMO_MODE — seeding in-memory sample students…")
        _seed_demo_data()
        return
    try:
        for stmt in [s.strip() for s in BOOTSTRAP_SQL.split(";") if s.strip()]:
            _execute(stmt)
        logger.info("Snowflake tables bootstrapped. pool_size=%d", _SNOWFLAKE_POOL_SIZE)
    except Exception as exc:
        logger.warning("Snowflake bootstrap skipped (check credentials): %s", exc)


@app.on_event("shutdown")
async def _shutdown():
    if DEMO_MODE:
        return
    closed = 0
    while True:
        try:
            conn = _snowflake_pool.get_nowait()
        except Empty:
            break
        try:
            conn.close()
            closed += 1
        except Exception:
            pass
    logger.info("Snowflake pool closed connections=%d", closed)


# ---------------------------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------------------------

@app.post("/journal", tags=["Ingestion"])
async def post_journal(entry: JournalEntry):
    """
    Submit a journal entry.
    Triggers: embedding → TwinBuilderChain → twin_snapshots update.
    """
    embedding = cortex_embed(entry.text)

    if DEMO_MODE:
        _demo_store["journal_entries"].append({
            "student_id": entry.student_id,
            "text": entry.text,
            "mood_label": entry.mood_label.value if entry.mood_label else None,
            "tags": entry.tags,
            "embedding": embedding,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        existing = _demo_store["twin_snapshots"].get(entry.student_id)
    else:
        _ensure_student_exists(entry.student_id)
        _execute(
            """
            INSERT INTO journal_entries (student_id, text_encrypted, mood_label, tags, embedding)
            SELECT %s, %s, %s, PARSE_JSON(%s), PARSE_JSON(%s)
            """,
            (
                entry.student_id,
                _encrypt(entry.text),
                entry.mood_label.value if entry.mood_label else None,
                json.dumps(entry.tags),
                json.dumps(embedding),
            ),
        )
        rows = _execute(
            _SQL_TWIN_BY_STUDENT,
            (entry.student_id,),
            fetch=True,
        )
        existing = _row_to_twin(rows[0]) if rows else None

    TwinBuilderChain.run(entry.student_id, entry.text, existing)
    return {"status": "ok", "twin_updated": True}


@app.get("/journal", tags=["Ingestion"])
async def get_journal_entries(student_id: str = Query(...), limit: int = Query(20, ge=1, le=100)):
    """Retrieve past journal entries for a student (decrypted)."""
    if DEMO_MODE:
        entries = [
            e for e in _demo_store["journal_entries"]
            if e["student_id"] == student_id
        ]
        entries.sort(key=lambda e: e.get("created_at", ""), reverse=True)
        return [
            {
                "text": e["text"][:120] + ("..." if len(e["text"]) > 120 else ""),
                "mood_label": e.get("mood_label"),
                "tags": e.get("tags", []),
                "created_at": e.get("created_at"),
            }
            for e in entries[:limit]
        ]
    rows = _execute(
        """
        SELECT text_encrypted, mood_label, tags, created_at
        FROM journal_entries
        WHERE student_id = %s
        ORDER BY created_at DESC
        LIMIT %s
        """,
        (student_id, limit),
        fetch=True,
    )
    results = []
    for row in rows:
        raw = _decrypt(row.get("text_encrypted", ""))
        preview = raw[:120] + ("..." if len(raw) > 120 else "")
        tags_val = row.get("tags")
        if isinstance(tags_val, str):
            try:
                tags_val = json.loads(tags_val)
            except json.JSONDecodeError:
                tags_val = []
        results.append({
            "text": preview,
            "mood_label": row.get("mood_label"),
            "tags": tags_val or [],
            "created_at": str(row.get("created_at", "")),
        })
    return results


@app.get("/mood/history", tags=["Ingestion"])
async def get_mood_history(student_id: str = Query(...), limit: int = Query(7, ge=1, le=30)):
    """Retrieve recent mood check-ins for a student (for dashboard chart)."""
    if DEMO_MODE:
        checkins = [
            c for c in _demo_store["mood_checkins"]
            if c["student_id"] == student_id
        ]
        checkins.sort(key=lambda c: c.get("created_at", ""), reverse=True)
        return [
            {
                "mood_label": c["mood_label"],
                "energy_level": c.get("energy_level"),
                "stress_level": c.get("stress_level"),
                "social_battery": c.get("social_battery"),
                "created_at": c.get("created_at"),
            }
            for c in checkins[:limit]
        ]
    rows = _execute(
        """
        SELECT mood_label, energy_level, stress_level, social_battery, created_at
        FROM mood_checkins
        WHERE student_id = %s
        ORDER BY created_at DESC
        LIMIT %s
        """,
        (student_id, limit),
        fetch=True,
    )
    return [
        {
            "mood_label": row.get("mood_label"),
            "energy_level": row.get("energy_level"),
            "stress_level": row.get("stress_level"),
            "social_battery": row.get("social_battery"),
            "created_at": str(row.get("created_at", "")),
        }
        for row in rows
    ]


@app.post("/mood", tags=["Ingestion"])
async def post_mood(checkin: MoodCheckIn):
    """Submit a mood check-in.  Updates the twin's mood/energy dimensions."""
    if DEMO_MODE:
        _demo_store["mood_checkins"].append({
            "student_id": checkin.student_id,
            "mood_label": checkin.mood_label.value,
            "energy_level": checkin.energy_level,
            "stress_level": checkin.stress_level,
            "social_battery": checkin.social_battery,
            "notes": checkin.notes,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        existing = _demo_store["twin_snapshots"].get(checkin.student_id)
    else:
        _ensure_student_exists(checkin.student_id)
        _execute(
            """
            INSERT INTO mood_checkins (student_id, mood_label, energy_level, stress_level, social_battery, notes)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (
                checkin.student_id,
                checkin.mood_label.value,
                checkin.energy_level,
                checkin.stress_level,
                checkin.social_battery,
                checkin.notes,
            ),
        )
        rows = _execute(
            _SQL_TWIN_BY_STUDENT,
            (checkin.student_id,),
            fetch=True,
        )
        existing = _row_to_twin(rows[0]) if rows else None

    mood_text = f"Mood: {checkin.mood_label.value}. Energy {checkin.energy_level}/10. Stress {checkin.stress_level}/10. Social {checkin.social_battery}/10."
    if checkin.notes:
        mood_text += f" Notes: {checkin.notes}"
    TwinBuilderChain.run(checkin.student_id, mood_text, existing)

    return {"status": "ok"}


@app.get("/twin", response_model=TwinSnapshot, tags=["Twin"])
async def get_twin(student_id: str = Query(...)):
    """Retrieve the current Emotional Digital Twin state."""
    if DEMO_MODE:
        twin = _demo_store["twin_snapshots"].get(student_id)
        if not twin:
            raise HTTPException(404, "Twin not found. Submit a journal or mood check-in first.")
        twin = twin.model_copy(update={"twin_embedding": []})
        return twin

    rows = _execute(
        _SQL_TWIN_BY_STUDENT,
        (student_id,),
        fetch=True,
    )
    if not rows:
        raise HTTPException(404, "Twin not found. Submit a journal or mood check-in first.")
    twin = _row_to_twin(rows[0])
    twin.twin_embedding = []
    return twin


@app.get("/recommendations", response_model=list[PeerRecommendation], tags=["Matching"])
async def get_recommendations(student_id: str = Query(...), top_k: int = Query(10, ge=1, le=50)):
    """Return emotionally compatible peer recommendations (≥ 50 %)."""
    return MatchRetrievalChain.run(student_id, top_k)


@app.post("/feedback", tags=["Social"])
async def post_feedback(payload: FeedbackPayload):
    """Record whether the student accepted or skipped a recommendation."""
    record = {
        "student_a": payload.student_id,
        "student_b": payload.peer_id,
        "accepted": payload.accepted,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    if DEMO_MODE:
        _demo_store["matches"].append(record)
    else:
        _execute(
            """
            INSERT INTO matches (student_a, student_b, accepted)
            VALUES (%s, %s, %s)
            """,
            (payload.student_id, payload.peer_id, payload.accepted),
        )
    return {"status": "ok"}


@app.post("/block", tags=["Safety"])
async def post_block(payload: BlockPayload):
    """Block a peer — they will never appear in recommendations again."""
    record = {
        "blocker_id": payload.student_id,
        "blocked_id": payload.blocked_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    if DEMO_MODE:
        _demo_store["blocks"].append(record)
    else:
        _execute(
            """
            INSERT INTO blocks (blocker_id, blocked_id)
            VALUES (%s, %s)
            """,
            (payload.student_id, payload.blocked_id),
        )
    return {"status": "ok"}


@app.post("/report", tags=["Safety"])
async def post_report(payload: ReportPayload):
    """Report a peer for moderation review."""
    record = {
        "reporter_id": payload.student_id,
        "reported_id": payload.reported_id,
        "reason": payload.reason,
        "category": "OTHER",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    if DEMO_MODE:
        _demo_store["safety_reports"].append(record)
    else:
        _execute(
            """
            INSERT INTO safety_reports (reporter_id, reported_id, reason, category)
            VALUES (%s, %s, %s, 'OTHER')
            """,
            (payload.student_id, payload.reported_id, payload.reason),
        )
    return {"status": "ok"}


@app.post("/activity", tags=["Ingestion"])
async def post_activity(payload: ActivityPayload):
    """Log a student activity (e.g. 'yoga', 'coding session')."""
    record = {
        "student_id": payload.student_id,
        "activity_type": payload.activity_type,
        "description": payload.description,
        "duration_mins": payload.duration_mins,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    if DEMO_MODE:
        _demo_store["activities"].append(record)
    else:
        _ensure_student_exists(payload.student_id)
        _execute(
            """
            INSERT INTO activities (student_id, activity_type, description, duration_mins)
            VALUES (%s, %s, %s, %s)
            """,
            (payload.student_id, payload.activity_type, payload.description, payload.duration_mins),
        )
    return {"status": "ok"}


@app.post("/consent", tags=["Privacy"])
async def post_consent(payload: ConsentPayload):
    """Record a student's consent to data processing (required before first use)."""
    if DEMO_MODE:
        _demo_store["consents"][payload.student_id] = {
            "consented": payload.consented,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    else:
        _ensure_student_exists(payload.student_id)
        _execute(
            """
            UPDATE students SET onboarded = %s, updated_at = CURRENT_TIMESTAMP()
            WHERE student_id = %s
            """,
            (payload.consented, payload.student_id),
        )
    return {"status": "ok", "consented": payload.consented}


@app.delete("/account", tags=["Privacy"])
async def delete_account(student_id: str = Query(...)):
    """
    Opt-out: permanently delete all data for a student.
    Removes journal entries, mood check-ins, twin snapshot, matches,
    blocks, reports, activities, onboarding responses, and notifications.
    """
    if DEMO_MODE:
        _demo_store["twin_snapshots"].pop(student_id, None)
        _demo_store["consents"].pop(student_id, None)
        for key in ["journal_entries", "mood_checkins", "matches", "blocks",
                     "safety_reports", "onboarding_responses", "notifications", "activities"]:
            _demo_store[key] = [r for r in _demo_store[key] if r.get("student_id") != student_id
                                and r.get("student_a") != student_id and r.get("blocker_id") != student_id
                                and r.get("reporter_id") != student_id]
        _demo_store["students"].pop(student_id, None)
    else:
        # Order matters: delete referencing rows first, then the student
        for stmt in [
            "DELETE FROM notifications WHERE student_id = %s",
            "DELETE FROM onboarding_responses WHERE student_id = %s",
            "DELETE FROM activities WHERE student_id = %s",
            "DELETE FROM blocks WHERE blocker_id = %s OR blocked_id = %s",
            "DELETE FROM safety_reports WHERE reporter_id = %s OR reported_id = %s",
            "DELETE FROM matches WHERE student_a = %s OR student_b = %s",
            "DELETE FROM mood_checkins WHERE student_id = %s",
            "DELETE FROM journal_entries WHERE student_id = %s",
            "DELETE FROM twin_snapshots WHERE student_id = %s",
        ]:
            # Some statements reference student_id twice
            param_count = stmt.count("%s")
            _execute(stmt, tuple([student_id] * param_count))
        _execute("DELETE FROM students WHERE student_id = %s", (student_id,))
    return {"status": "ok", "deleted": student_id}


# ---------------------------------------------------------------------------
# Authentication
# ---------------------------------------------------------------------------

@app.post("/signup", tags=["Auth"])
async def signup(payload: SignupPayload):
    """
    Create a new student account.
    Returns the student_id + display_name on success.
    """
    pw_hash = _hash_password(payload.password)
    is_demo_repair = payload.student_id.startswith("demo-") and payload.password == "demo"

    if DEMO_MODE:
        if payload.student_id in _demo_store.get("students", {}):
            if not is_demo_repair:
                raise HTTPException(409, "Account already exists.")
            _demo_store["students"][payload.student_id].update({
                "display_name": payload.display_name,
                "password_hash": pw_hash,
                "school": payload.school or _demo_store["students"][payload.student_id].get("school", ""),
            })
            return {
                "status": "ok",
                "student_id": payload.student_id,
                "display_name": payload.display_name,
                "school": _demo_store["students"][payload.student_id].get("school", payload.school),
            }
        _demo_store["students"][payload.student_id] = {
            "student_id": payload.student_id,
            "display_name": payload.display_name,
            "password_hash": pw_hash,
            "school": payload.school,
            "onboarded": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    else:
        _ensure_auth_columns()
        # Check if already exists
        existing = _execute(
            "SELECT student_id FROM students WHERE student_id = %s",
            (payload.student_id,),
            fetch=True,
        )
        if existing:
            if not is_demo_repair:
                raise HTTPException(409, "Account already exists.")
            try:
                _execute(
                    """
                    UPDATE students
                    SET display_name = %s, password_hash = %s, updated_at = CURRENT_TIMESTAMP()
                    WHERE student_id = %s
                    """,
                    (payload.display_name, pw_hash, payload.student_id),
                )
            except Exception as exc:
                if "PASSWORD_HASH" in str(exc).upper() and "INVALID IDENTIFIER" in str(exc).upper():
                    _execute(
                        """
                        UPDATE students
                        SET display_name = %s, email_hash = %s, updated_at = CURRENT_TIMESTAMP()
                        WHERE student_id = %s
                        """,
                        (payload.display_name, pw_hash, payload.student_id),
                    )
                else:
                    raise
            return {
                "status": "ok",
                "student_id": payload.student_id,
                "display_name": payload.display_name,
                "school": payload.school,
            }
        try:
            _execute(
                """
                INSERT INTO students (student_id, display_name, email_hash, password_hash, school, onboarded)
                VALUES (%s, %s, '', %s, %s, FALSE)
                """,
                (payload.student_id, payload.display_name, pw_hash, payload.school),
            )
        except Exception as exc:
            if "PASSWORD_HASH" in str(exc).upper() and "INVALID IDENTIFIER" in str(exc).upper():
                _ensure_auth_columns()
                _execute(
                    """
                    INSERT INTO students (student_id, display_name, email_hash, school, onboarded)
                    VALUES (%s, %s, %s, %s, FALSE)
                    """,
                    (payload.student_id, payload.display_name, pw_hash, payload.school),
                )
            else:
                raise

    return {
        "status": "ok",
        "student_id": payload.student_id,
        "display_name": payload.display_name,
        "school": payload.school,
    }


@app.post("/login", tags=["Auth"])
async def login(payload: LoginPayload):
    """
    Authenticate a student. Returns student info on success.
    """
    pw_hash = _hash_password(payload.password)

    if DEMO_MODE:
        student = _demo_store.get("students", {}).get(payload.student_id)
        if not student or student.get("password_hash") != pw_hash:
            raise HTTPException(401, "Invalid credentials.")
        return {
            "status": "ok",
            "student_id": payload.student_id,
            "display_name": student.get("display_name", payload.student_id),
            "school": student.get("school", ""),
        }
    else:
        _ensure_auth_columns()
        try:
            rows = _execute(
                "SELECT student_id, display_name, password_hash, school FROM students WHERE student_id = %s",
                (payload.student_id,),
                fetch=True,
            )
        except Exception as exc:
            if "PASSWORD_HASH" in str(exc).upper() and "INVALID IDENTIFIER" in str(exc).upper():
                _ensure_auth_columns()
                rows = _execute(
                    "SELECT student_id, display_name, email_hash AS password_hash, school FROM students WHERE student_id = %s",
                    (payload.student_id,),
                    fetch=True,
                )
            else:
                raise
        if not rows or rows[0].get("password_hash") != pw_hash:
            raise HTTPException(401, "Invalid credentials.")
        return {
            "status": "ok",
            "student_id": rows[0]["student_id"],
            "display_name": rows[0].get("display_name", payload.student_id),
            "school": rows[0].get("school", ""),
        }


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@app.get("/health", tags=["Ops"])
async def health():
    return {"status": "healthy", "version": "0.1.0"}
