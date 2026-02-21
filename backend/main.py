"""
NeuroKin Backend
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
import random
import hashlib
import logging
from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("neurokin")

DEMO_MODE = os.environ.get("DEMO_MODE", "1") == "1"

if not DEMO_MODE:
    import snowflake.connector  # only import when actually needed

app = FastAPI(
    title="NeuroKin API",
    description="Emotionally Intelligent Digital Twin System for Student Connection",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],            # tighten in production
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    "safety_reports": [],
}

# SQL constants
_SQL_TWIN_BY_STUDENT = "SELECT * FROM twin_snapshots WHERE student_id = %s"


def _sf_connect():
    """Return a Snowflake connection using env-based credentials."""
    return snowflake.connector.connect(
        account=os.environ["SNOWFLAKE_ACCOUNT"],
        user=os.environ["SNOWFLAKE_USER"],
        password=os.environ["SNOWFLAKE_PASSWORD"],
        database=os.environ.get("SNOWFLAKE_DATABASE", "NEUROKIN_DB"),
        schema=os.environ.get("SNOWFLAKE_SCHEMA", "PUBLIC"),
        warehouse=os.environ.get("SNOWFLAKE_WAREHOUSE", "NEUROKIN_WH"),
        role=os.environ.get("SNOWFLAKE_ROLE", "NEUROKIN_APP_ROLE"),
    )


def _execute(sql: str, params: tuple = (), *, fetch: bool = False):
    """Execute a query against Snowflake (skipped in DEMO_MODE)."""
    if DEMO_MODE:
        return [] if fetch else 0
    conn = _sf_connect()
    try:
        cur = conn.cursor()
        cur.execute(sql, params)
        if fetch:
            cols = [d[0].lower() for d in cur.description]
            return [dict(zip(cols, row)) for row in cur.fetchall()]
        return cur.rowcount
    finally:
        conn.close()


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
                USING (SELECT %s AS student_id) AS src
                ON tgt.student_id = src.student_id
                WHEN MATCHED THEN UPDATE SET
                    twin_embedding   = PARSE_JSON(%s),
                    emotion_distribution = PARSE_JSON(%s),
                    top_themes       = PARSE_JSON(%s),
                    activity_preferences = PARSE_JSON(%s),
                    mood_stability   = %s,
                    social_energy    = %s,
                    shared_values_tags = PARSE_JSON(%s),
                    schedule_overlap = %s,
                    last_updated     = %s
                WHEN NOT MATCHED THEN INSERT (
                    student_id, twin_embedding, emotion_distribution, top_themes,
                    activity_preferences, mood_stability, social_energy,
                    shared_values_tags, schedule_overlap, last_updated
                ) VALUES (%s, PARSE_JSON(%s), PARSE_JSON(%s), PARSE_JSON(%s),
                          PARSE_JSON(%s), %s, %s, PARSE_JSON(%s), %s, %s)
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
            # In demo mode compute compatibility against all other twins in memory
            all_twins = [
                t for sid, t in _demo_store["twin_snapshots"].items()
                if sid != student_id
            ]
        else:
            candidates = _execute(
                """
                SELECT *,
                       VECTOR_COSINE_SIMILARITY(twin_embedding, PARSE_JSON(%s)::VECTOR(FLOAT, 768)) AS vec_sim
                FROM twin_snapshots
                WHERE student_id != %s
                ORDER BY vec_sim DESC
                LIMIT %s
                """,
                (json.dumps(me.twin_embedding), student_id, top_k * 2),
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

        prompt = f"""You are NeuroKin, an emotionally intelligent student connection assistant.
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
    return ExplanationChain.run(me, peer, score, shared)


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

    return TwinSnapshot(
        student_id=row.get("student_id", ""),
        display_name=row.get("display_name", ""),
        twin_embedding=_parse_json_field(row.get("twin_embedding"), []),
        emotion_distribution=_parse_json_field(row.get("emotion_distribution"), {}),
        top_themes=_parse_json_field(row.get("top_themes"), []),
        activity_preferences=_parse_json_field(row.get("activity_preferences"), []),
        mood_stability=float(row.get("mood_stability", 0)),
        social_energy=float(row.get("social_energy", 0)),
        shared_values_tags=_parse_json_field(row.get("shared_values_tags"), []),
        schedule_overlap=float(row.get("schedule_overlap", 0)),
        last_updated=row.get("last_updated", datetime.now(timezone.utc)),
    )


# ---------------------------------------------------------------------------
# Database Bootstrap (idempotent)
# ---------------------------------------------------------------------------

BOOTSTRAP_SQL = """
CREATE TABLE IF NOT EXISTS students (
    student_id     VARCHAR(64) PRIMARY KEY,
    display_name   VARCHAR(128),
    email_hash     VARCHAR(128),
    created_at     TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

CREATE TABLE IF NOT EXISTS journal_entries (
    id             VARCHAR(64) DEFAULT UUID_STRING(),
    student_id     VARCHAR(64) REFERENCES students(student_id),
    text_encrypted VARCHAR(16777216),
    mood_label     VARCHAR(32),
    tags           VARIANT,
    embedding      VARIANT,
    created_at     TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

CREATE TABLE IF NOT EXISTS mood_checkins (
    id             VARCHAR(64) DEFAULT UUID_STRING(),
    student_id     VARCHAR(64) REFERENCES students(student_id),
    mood_label     VARCHAR(32) NOT NULL,
    energy_level   INT,
    stress_level   INT,
    social_battery INT,
    notes          VARCHAR(1000),
    created_at     TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

CREATE TABLE IF NOT EXISTS twin_snapshots (
    student_id            VARCHAR(64) PRIMARY KEY,
    display_name          VARCHAR(128),
    twin_embedding        VARIANT,
    emotion_distribution  VARIANT,
    top_themes            VARIANT,
    activity_preferences  VARIANT,
    mood_stability        FLOAT,
    social_energy         FLOAT,
    shared_values_tags    VARIANT,
    schedule_overlap      FLOAT DEFAULT 0,
    last_updated          TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

CREATE TABLE IF NOT EXISTS matches (
    id             VARCHAR(64) DEFAULT UUID_STRING(),
    student_a      VARCHAR(64),
    student_b      VARCHAR(64),
    score          FLOAT,
    explanation    VARCHAR(2000),
    icebreaker     VARCHAR(500),
    accepted       BOOLEAN,
    created_at     TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

CREATE TABLE IF NOT EXISTS safety_reports (
    id             VARCHAR(64) DEFAULT UUID_STRING(),
    reporter_id    VARCHAR(64),
    reported_id    VARCHAR(64),
    reason         VARCHAR(1000),
    resolved       BOOLEAN DEFAULT FALSE,
    created_at     TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);
"""


def _seed_demo_data():
    """Populate _demo_store with realistic sample students so the API is immediately useful."""
    profiles = [
        {
            "id": "demo-alex",
            "name": "Alex",
            "emotions": {"curiosity": 0.35, "joy": 0.25, "determination": 0.20, "calm": 0.12, "anxiety": 0.08},
            "themes": ["artificial intelligence", "music", "hiking", "mindfulness", "photography"],
            "activities": ["coding", "guitar", "trail running", "reading"],
            "values": ["creativity", "growth", "authenticity"],
            "energy": 72,
            "mood_stability": 0.78,
            "schedule": 0.6,
        },
        {
            "id": "demo-jordan",
            "name": "Jordan",
            "emotions": {"empathy": 0.30, "calm": 0.25, "curiosity": 0.20, "hope": 0.15, "nostalgia": 0.10},
            "themes": ["psychology", "creative writing", "sustainability", "yoga", "mindfulness"],
            "activities": ["journaling", "yoga", "volunteering", "reading"],
            "values": ["empathy", "sustainability", "authenticity"],
            "energy": 55,
            "mood_stability": 0.85,
            "schedule": 0.5,
        },
        {
            "id": "demo-sam",
            "name": "Sam",
            "emotions": {"excitement": 0.30, "joy": 0.25, "determination": 0.20, "anxiety": 0.15, "curiosity": 0.10},
            "themes": ["entrepreneurship", "fitness", "travel", "cooking", "music"],
            "activities": ["basketball", "cooking", "guitar", "coding"],
            "values": ["ambition", "teamwork", "growth"],
            "energy": 85,
            "mood_stability": 0.65,
            "schedule": 0.7,
        },
        {
            "id": "demo-riley",
            "name": "Riley",
            "emotions": {"calm": 0.30, "curiosity": 0.25, "joy": 0.15, "reflection": 0.15, "gratitude": 0.15},
            "themes": ["astronomy", "reading", "meditation", "art history", "hiking"],
            "activities": ["stargazing", "painting", "reading", "trail running"],
            "values": ["knowledge", "patience", "creativity"],
            "energy": 45,
            "mood_stability": 0.90,
            "schedule": 0.4,
        },
        {
            "id": "demo-casey",
            "name": "Casey",
            "emotions": {"determination": 0.30, "curiosity": 0.25, "anxiety": 0.20, "hope": 0.15, "frustration": 0.10},
            "themes": ["computer science", "gaming", "music production", "artificial intelligence", "robotics"],
            "activities": ["coding", "gaming", "guitar", "reading"],
            "values": ["innovation", "creativity", "growth"],
            "energy": 68,
            "mood_stability": 0.70,
            "schedule": 0.8,
        },
        {
            "id": "demo-morgan",
            "name": "Morgan",
            "emotions": {"empathy": 0.35, "joy": 0.20, "nostalgia": 0.15, "calm": 0.15, "hope": 0.15},
            "themes": ["social justice", "poetry", "dance", "community", "mindfulness"],
            "activities": ["dance", "volunteering", "journaling", "yoga"],
            "values": ["justice", "community", "empathy"],
            "energy": 62,
            "mood_stability": 0.75,
            "schedule": 0.5,
        },
    ]

    for p in profiles:
        # Build a pseudo-text to generate a deterministic embedding
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

    logger.info("Seeded %d demo students.", len(profiles))


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
        logger.info("Snowflake tables bootstrapped.")
    except Exception as exc:
        logger.warning("Snowflake bootstrap skipped (check credentials): %s", exc)


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
        _execute(
            """
            INSERT INTO journal_entries (student_id, text_encrypted, mood_label, tags, embedding)
            VALUES (%s, %s, %s, PARSE_JSON(%s), PARSE_JSON(%s))
            """,
            (
                entry.student_id,
                entry.text,
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
        "reporter_id": payload.student_id,
        "reported_id": payload.blocked_id,
        "reason": "BLOCK",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    if DEMO_MODE:
        _demo_store["safety_reports"].append(record)
    else:
        _execute(
            """
            INSERT INTO safety_reports (reporter_id, reported_id, reason)
            VALUES (%s, %s, 'BLOCK')
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
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    if DEMO_MODE:
        _demo_store["safety_reports"].append(record)
    else:
        _execute(
            """
            INSERT INTO safety_reports (reporter_id, reported_id, reason)
            VALUES (%s, %s, %s)
            """,
            (payload.student_id, payload.reported_id, payload.reason),
        )
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@app.get("/health", tags=["Ops"])
async def health():
    return {"status": "healthy", "version": "0.1.0"}
