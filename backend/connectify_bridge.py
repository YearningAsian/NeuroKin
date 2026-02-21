"""
Connectify Bridge — Integration Layer
======================================
This module bridges NeuroKin with the original *Connectify* prototype
(https://github.com/vinodhini-rajasekhar/Connectify-building-connections-at-school).

Connectify is the predecessor system described in the project spec §7.5
("Evolution from Connectify").  NeuroKin advances Connectify in several ways:

  ┌───────────────────┬───────────────────┬───────────────────────────────────┐
  │  Dimension        │  Connectify       │  NeuroKin (evolution)             │
  ├───────────────────┼───────────────────┼───────────────────────────────────┤
  │  Matching         │  Single cosine    │  Weighted 5-factor model          │
  │                   │  similarity on    │  (embedding 50% + emotion 20% +   │
  │                   │  query embedding  │  activity 15% + values 10% +      │
  │                   │                   │  schedule 5%)                     │
  ├───────────────────┼───────────────────┼───────────────────────────────────┤
  │  Embeddings       │  OpenAI           │  Snowflake Cortex Arctic Embed    │
  │                   │  text-embedding-  │  (768-d, on-platform, no ext key) │
  │                   │  3-small (1536-d) │                                   │
  ├───────────────────┼───────────────────┼───────────────────────────────────┤
  │  State            │  Volatile: per-   │  Persistent Emotional Digital     │
  │                   │  query, no twin   │  Twin, rolling-average updates    │
  ├───────────────────┼───────────────────┼───────────────────────────────────┤
  │  LLM              │  OpenAI GPT-3.5   │  Cortex COMPLETE (Mistral-Large)  │
  ├───────────────────┼───────────────────┼───────────────────────────────────┤
  │  Chain Orch.      │  Hard-coded logic │  LangChain RunnableLambda chains  │
  ├───────────────────┼───────────────────┼───────────────────────────────────┤
  │  Privacy          │  No encryption    │  Fernet-encrypted journals,       │
  │                   │                   │  FERPA/COPPA-aligned opt-out      │
  ├───────────────────┼───────────────────┼───────────────────────────────────┤
  │  DB               │  Supabase PG      │  Snowflake (10 tables, RBAC)      │
  └───────────────────┴───────────────────┴───────────────────────────────────┘

HOW TO USE THIS MODULE
----------------------
This module allows NeuroKin to *optionally* query a running Connectify backend
to demonstrate side-by-side comparison matching (spec §7.5 narrative).

Step 1 — Clone and run Connectify:

    git clone https://github.com/vinodhini-rajasekhar/Connectify-building-connections-at-school
    cd Connectify-building-connections-at-school/backend
    pip install -r requirements.txt        # needs openai, supabase, etc.
    # Set OPENAI_API_KEY, SUPABASE_URL, SUPABASE_KEY in .env
    uvicorn src.main:app --port 9000       # run on a different port

Step 2 — Set the CONNECTIFY_API_URL environment variable:

    export CONNECTIFY_API_URL=http://localhost:9000

Step 3 — Import and use in NeuroKin:

    from connectify_bridge import ConnectifyBridge

    bridge = ConnectifyBridge()
    if bridge.available:
        # Submit a query to Connectify and get matches
        matches = bridge.find_matches(
            user_name="Alex",
            query="I enjoy hiking and AI research",
            college="Duke University"
        )
        print(matches)  # Connectify-style cosine-similarity matches

        # Compare with NeuroKin's weighted multi-factor match
        neurokin_recs = MatchRetrievalChain.run("demo-alex")
        # ... show side-by-side for §7.5 presentation

Step 4 — Optional: Register the bridge endpoint in main.py

    Add to main.py:

        from connectify_bridge import ConnectifyBridge, router as connectify_router
        app.include_router(connectify_router, prefix="/connectify", tags=["Connectify Bridge"])

    This exposes:
        GET  /connectify/health        — check if Connectify backend is reachable
        POST /connectify/match         — submit query + get Connectify matches
        POST /connectify/compare       — side-by-side NeuroKin vs Connectify
"""

from __future__ import annotations

import os
import logging
from typing import Optional

import requests
from pydantic import BaseModel, Field

try:
    from fastapi import APIRouter, HTTPException
    _HAS_FASTAPI = True
except ImportError:
    _HAS_FASTAPI = False

logger = logging.getLogger("neurokin.connectify_bridge")

CONNECTIFY_API_URL = os.environ.get("CONNECTIFY_API_URL", "").rstrip("/")
CONNECTIFY_TIMEOUT = int(os.environ.get("CONNECTIFY_TIMEOUT", "10"))


# ---------------------------------------------------------------------------
# Pydantic models for Connectify responses
# ---------------------------------------------------------------------------

class ConnectifyMatch(BaseModel):
    """A single match from the Connectify /similarity endpoint."""
    user_name: str
    query: str
    college: Optional[str] = None
    similarity_percentage: float
    created_at: str = ""


class ConnectifyMatchResult(BaseModel):
    """Full result set from Connectify."""
    matches: list[ConnectifyMatch] = Field(default_factory=list)
    current_user: str = ""
    current_query: str = ""
    current_college: Optional[str] = None
    total_matches: int = 0


class ConnectifyQueryRequest(BaseModel):
    user_name: str
    query: str
    college: str = "Duke University"


# ---------------------------------------------------------------------------
# Bridge client
# ---------------------------------------------------------------------------

class ConnectifyBridge:
    """
    Thin HTTP client that forwards requests to a running Connectify backend.
    Completely optional — NeuroKin runs fine without it.
    """

    def __init__(self, base_url: str = ""):
        self.base_url = (base_url or CONNECTIFY_API_URL).rstrip("/")

    @property
    def available(self) -> bool:
        """Check if the Connectify backend is reachable."""
        if not self.base_url:
            return False
        try:
            r = requests.get(f"{self.base_url}/", timeout=3)
            return r.status_code == 200
        except Exception:
            return False

    def submit_query(self, user_name: str, query: str, college: str = "Duke University") -> Optional[int]:
        """
        Submit a query to Connectify's GET /mean endpoint.
        Returns the embedding_id on success, None on failure.

        Connectify API: GET /mean?query=...&user_name=...&college=...
        """
        if not self.base_url:
            logger.warning("CONNECTIFY_API_URL not set")
            return None
        try:
            r = requests.get(
                f"{self.base_url}/mean",
                params={"query": query, "user_name": user_name, "college": college},
                timeout=CONNECTIFY_TIMEOUT,
            )
            r.raise_for_status()
            data = r.json()
            return data.get("embedding_id")
        except Exception as exc:
            logger.error("Connectify /mean failed: %s", exc)
            return None

    def find_matches(
        self,
        user_name: str,
        query: str,
        college: str = "Duke University",
        min_similarity: float = 0.5,
    ) -> ConnectifyMatchResult:
        """
        Full Connectify flow: submit query → get embedding → find similar.

        1. POST query to /mean → get embedding_id
        2. GET /similarity?embedding_id=...&min_similarity=... → matches
        """
        embedding_id = self.submit_query(user_name, query, college)
        if embedding_id is None:
            return ConnectifyMatchResult()

        try:
            r = requests.get(
                f"{self.base_url}/similarity",
                params={"embedding_id": embedding_id, "min_similarity": min_similarity},
                timeout=CONNECTIFY_TIMEOUT,
            )
            r.raise_for_status()
            return ConnectifyMatchResult(**r.json())
        except Exception as exc:
            logger.error("Connectify /similarity failed: %s", exc)
            return ConnectifyMatchResult()

    def get_icebreaker(
        self,
        current_user_name: str,
        current_user_query: str,
        friend_name: str,
        friend_query: str,
    ) -> str:
        """
        Get an AI-generated icebreaker from Connectify.

        Connectify API: POST /ice-breaker
        """
        if not self.base_url:
            return ""
        try:
            r = requests.post(
                f"{self.base_url}/ice-breaker",
                json={
                    "current_user_name": current_user_name,
                    "current_user_query": current_user_query,
                    "friend_name": friend_name,
                    "friend_query": friend_query,
                },
                timeout=CONNECTIFY_TIMEOUT,
            )
            r.raise_for_status()
            return r.json().get("message", "")
        except Exception as exc:
            logger.error("Connectify /ice-breaker failed: %s", exc)
            return ""


# ---------------------------------------------------------------------------
# FastAPI Router (optional — only if you include_router in main.py)
# ---------------------------------------------------------------------------

if _HAS_FASTAPI:
    router = APIRouter()

    @router.get("/health")
    async def connectify_health():
        """Check if the Connectify backend is reachable."""
        bridge = ConnectifyBridge()
        return {
            "connectify_url": bridge.base_url or "(not configured)",
            "reachable": bridge.available,
        }

    @router.post("/match")
    async def connectify_match(req: ConnectifyQueryRequest):
        """
        Submit a query to Connectify and return its matches.
        Demonstrates Connectify's single-cosine approach.
        """
        bridge = ConnectifyBridge()
        if not bridge.available:
            raise HTTPException(
                status_code=503,
                detail="Connectify backend not reachable. Set CONNECTIFY_API_URL.",
            )
        result = bridge.find_matches(
            user_name=req.user_name,
            query=req.query,
            college=req.college,
        )
        return result.model_dump()

    @router.post("/compare")
    async def connectify_compare(req: ConnectifyQueryRequest):
        """
        Side-by-side comparison: Connectify single-cosine vs NeuroKin multi-factor.
        Useful for §7.5 "Evolution from Connectify" demonstration.
        """
        bridge = ConnectifyBridge()

        # Connectify results (may be empty if not running)
        connectify_result = ConnectifyMatchResult()
        if bridge.available:
            connectify_result = bridge.find_matches(
                user_name=req.user_name,
                query=req.query,
                college=req.college,
            )

        return {
            "connectify": {
                "available": bridge.available,
                "approach": "Single cosine similarity on 1536-d OpenAI embeddings",
                "matches": [m.model_dump() for m in connectify_result.matches[:5]],
            },
            "neurokin": {
                "approach": "Weighted 5-factor: embedding 50% + emotion 20% + activity 15% + values 10% + schedule 5%",
                "note": "Call GET /recommendations?student_id=... for NeuroKin results",
            },
            "evolution_notes": [
                "NeuroKin uses persistent Emotional Digital Twins vs volatile per-query embeddings",
                "NeuroKin uses Snowflake Cortex (no external API keys) vs OpenAI API",
                "NeuroKin adds emotional resonance, activity overlap, and shared values to matching",
                "NeuroKin encrypts journal text at rest (Fernet) and never shares raw content",
                "NeuroKin uses LangChain RunnableLambda chains for composable ML pipelines",
            ],
        }
