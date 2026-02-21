#!/usr/bin/env python3
"""
NeuroTwin Demo Seed Script
=========================
Creates multiple demo student accounts with journal entries, mood check‑ins,
and activities so the app is immediately demonstrable.

Usage:
    # Start the backend first (DEMO_MODE=1 by default):
    #   cd backend && uvicorn main:app --reload
    #
    # Then in another terminal:
    #   python seed.py
    #
    # Or with a custom base URL:
    #   python seed.py --url http://localhost:8000

Accounts created:  (password: demo)
  demo-alex    — Curious, creative, AI & music
  demo-jordan  — Empathetic writer, yoga & mindfulness
  demo-sam     — Energetic, entrepreneurial, sports & coding
  demo-riley   — Calm, scholarly, astronomy & meditation
  demo-casey   — Determined techie, gaming & robotics
  demo-morgan  — Compassionate activist, dance & poetry
  demo-alex    — curious CS student into AI and music
  demo-jordan  — empathetic psych major, loves writing
  demo-sam     — energetic entrepreneur, fitness buff
  demo-riley   — calm astronomy nerd, reader
  demo-casey   — determined gamer / CS builder
  demo-morgan  — empathetic community organiser, poet
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from datetime import datetime, timedelta

import requests

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

API_BASE = "http://localhost:8000"

DEMO_ACCOUNTS = [
    {
        "student_id": "demo-alex",
        "display_name": "Alex",
        "journal_entries": [
            {
                "text": "I've been really excited about my AI class project. We're building a recommendation system and the math behind collaborative filtering is beautiful. Spent the afternoon coding and lost track of time — in the best way. Also went for a run afterwards and feel great.",
                "mood_label": "excited",
                "tags": ["artificial intelligence", "coding", "fitness"],
            },
            {
                "text": "Had a thoughtful conversation with Jordan about empathy in tech design. It made me think about how the tools we build affect real people. Feeling grateful for friends who challenge my perspective.",
                "mood_label": "reflective",
                "tags": ["Social", "Growth", "Reflection"],
            },
            {
                "text": "Guitar practice today was amazing. I finally nailed the solo I've been working on for weeks. Music is such a good reset after a long day of studying.",
                "mood_label": "happy",
                "tags": ["music", "creativity"],
            },
        ],
        "mood_checkins": [
            {"mood_label": "excited", "energy_level": 8, "stress_level": 3, "social_battery": 7, "notes": "Great day in the lab"},
            {"mood_label": "calm", "energy_level": 6, "stress_level": 4, "social_battery": 5},
            {"mood_label": "happy", "energy_level": 7, "stress_level": 2, "social_battery": 8, "notes": "Post-run endorphins"},
        ],
        "activities": [
            {"activity_type": "coding", "description": "AI project — collaborative filtering", "duration_mins": 120},
            {"activity_type": "guitar", "description": "Solo practice session", "duration_mins": 45},
            {"activity_type": "trail running", "description": "5k on the campus loop", "duration_mins": 30},
        ],
    },
    {
        "student_id": "demo-jordan",
        "display_name": "Jordan",
        "journal_entries": [
            {
                "text": "Volunteered at the community centre today. The kids are so resilient — they teach me way more than I teach them. Journaling about it helped me process some big feelings about privilege and purpose.",
                "mood_label": "reflective",
                "tags": ["empathy", "volunteering", "Reflection"],
            },
            {
                "text": "Feeling a bit drained after a long week. I care so much about people around me that I forget to check in with myself. Going to do yoga tonight and just breathe.",
                "mood_label": "tired",
                "tags": ["self-care", "yoga", "mindfulness"],
            },
            {
                "text": "Started reading a new book on positive psychology. The chapter on 'flow states' resonated deeply — I feel that when I write poetry.",
                "mood_label": "calm",
                "tags": ["psychology", "creative writing", "reading"],
            },
        ],
        "mood_checkins": [
            {"mood_label": "calm", "energy_level": 5, "stress_level": 3, "social_battery": 4},
            {"mood_label": "reflective", "energy_level": 4, "stress_level": 5, "social_battery": 3, "notes": "Need some alone time"},
            {"mood_label": "happy", "energy_level": 6, "stress_level": 2, "social_battery": 6, "notes": "Good yoga session"},
        ],
        "activities": [
            {"activity_type": "journaling", "description": "Evening reflection", "duration_mins": 20},
            {"activity_type": "yoga", "description": "Gentle flow", "duration_mins": 45},
            {"activity_type": "volunteering", "description": "Community centre tutoring", "duration_mins": 90},
        ],
    },
    {
        "student_id": "demo-sam",
        "display_name": "Sam",
        "journal_entries": [
            {
                "text": "Pitched my startup idea in class today — an app that matches study groups by learning style. Got great feedback! Nervous but excited to build the prototype this weekend.",
                "mood_label": "excited",
                "tags": ["entrepreneurship", "coding", "Growth"],
            },
            {
                "text": "Basketball game was intense. We lost but played as a real team for the first time. There's something about shared struggle that bonds people instantly.",
                "mood_label": "reflective",
                "tags": ["fitness", "teamwork", "Social"],
            },
            {
                "text": "Stressed about deadlines stacking up. Three projects due next week. Made a plan though — breaking it into chunks always helps me feel in control.",
                "mood_label": "anxious",
                "tags": ["Academic", "stress management"],
            },
        ],
        "mood_checkins": [
            {"mood_label": "excited", "energy_level": 9, "stress_level": 4, "social_battery": 9},
            {"mood_label": "frustrated", "energy_level": 7, "stress_level": 7, "social_battery": 6, "notes": "Too many deadlines"},
            {"mood_label": "happy", "energy_level": 8, "stress_level": 3, "social_battery": 8, "notes": "Good practice"},
        ],
        "activities": [
            {"activity_type": "basketball", "description": "League game", "duration_mins": 90},
            {"activity_type": "cooking", "description": "Meal prepped for the week", "duration_mins": 60},
            {"activity_type": "coding", "description": "Startup prototype work", "duration_mins": 180},
        ],
    },
    {
        "student_id": "demo-riley",
        "display_name": "Riley",
        "journal_entries": [
            {
                "text": "Stargazing from the hill last night was magical. The Milky Way was crystal clear. There's a deep comfort in knowing how vast the universe is — my problems feel so small and manageable.",
                "mood_label": "calm",
                "tags": ["astronomy", "Nature", "mindfulness"],
            },
            {
                "text": "Finished reading 'Sapiens' today. It fundamentally changed how I think about history and our place in it. Want to discuss it with someone who's also read it.",
                "mood_label": "reflective",
                "tags": ["reading", "Growth", "Reflection"],
            },
            {
                "text": "Painted a watercolour of the campus lake at sunset. Art lets me express feelings I can't put into words. Feeling centred and grateful.",
                "mood_label": "happy",
                "tags": ["art history", "creativity", "Nature"],
            },
        ],
        "mood_checkins": [
            {"mood_label": "calm", "energy_level": 4, "stress_level": 2, "social_battery": 3},
            {"mood_label": "happy", "energy_level": 5, "stress_level": 1, "social_battery": 4, "notes": "Peaceful day"},
            {"mood_label": "reflective", "energy_level": 4, "stress_level": 2, "social_battery": 3},
        ],
        "activities": [
            {"activity_type": "stargazing", "description": "Observatory hill session", "duration_mins": 90},
            {"activity_type": "painting", "description": "Watercolour at the lake", "duration_mins": 60},
            {"activity_type": "reading", "description": "Finished Sapiens", "duration_mins": 45},
        ],
    },
    {
        "student_id": "demo-casey",
        "display_name": "Casey",
        "journal_entries": [
            {
                "text": "Made a breakthrough on my robotics project — the arm can now pick up objects with 95% accuracy! The debugging took days but that moment of success was worth every frustrated hour.",
                "mood_label": "excited",
                "tags": ["robotics", "coding", "artificial intelligence"],
            },
            {
                "text": "Gaming session with friends online tonight. It's funny how virtual worlds create real friendships. We've been playing together for three years now.",
                "mood_label": "happy",
                "tags": ["gaming", "Social", "friendship"],
            },
            {
                "text": "Feeling anxious about the machine learning exam. I understand the concepts but the math notation trips me up. Going to do extra practice problems tonight.",
                "mood_label": "anxious",
                "tags": ["Academic", "artificial intelligence", "stress"],
            },
        ],
        "mood_checkins": [
            {"mood_label": "excited", "energy_level": 8, "stress_level": 5, "social_battery": 6, "notes": "Robotics breakthrough"},
            {"mood_label": "happy", "energy_level": 7, "stress_level": 3, "social_battery": 7},
            {"mood_label": "anxious", "energy_level": 5, "stress_level": 8, "social_battery": 4, "notes": "Exam stress"},
        ],
        "activities": [
            {"activity_type": "coding", "description": "Robotics arm project", "duration_mins": 240},
            {"activity_type": "gaming", "description": "Online session with friends", "duration_mins": 120},
            {"activity_type": "reading", "description": "ML textbook review", "duration_mins": 60},
        ],
    },
    {
        "student_id": "demo-morgan",
        "display_name": "Morgan",
        "journal_entries": [
            {
                "text": "Organised a poetry slam for the diversity week. Hearing people share their stories through verse was deeply moving. Poetry has this power to connect strangers at the soul level.",
                "mood_label": "happy",
                "tags": ["poetry", "community", "social justice"],
            },
            {
                "text": "Dance rehearsal was tough but beautiful. We're performing a piece about migration and belonging. Art as activism — that's where my heart is.",
                "mood_label": "reflective",
                "tags": ["dance", "social justice", "creativity"],
            },
            {
                "text": "Had a quiet morning journaling at the cafe. Sometimes I need to step back from all the activism and just be present with myself. Balance is everything.",
                "mood_label": "calm",
                "tags": ["mindfulness", "journaling", "self-care"],
            },
        ],
        "mood_checkins": [
            {"mood_label": "happy", "energy_level": 7, "stress_level": 4, "social_battery": 8, "notes": "Poetry slam went great"},
            {"mood_label": "calm", "energy_level": 5, "stress_level": 3, "social_battery": 4},
            {"mood_label": "reflective", "energy_level": 6, "stress_level": 3, "social_battery": 6, "notes": "Good rehearsal"},
        ],
        "activities": [
            {"activity_type": "dance", "description": "Migration piece rehearsal", "duration_mins": 90},
            {"activity_type": "volunteering", "description": "Organised poetry slam", "duration_mins": 180},
            {"activity_type": "journaling", "description": "Morning cafe reflection", "duration_mins": 30},
        ],
    },
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _post(path: str, data: dict) -> dict:
    """POST to the API and return the JSON response."""
    url = f"{API_BASE}{path}"
    resp = requests.post(url, json=data, timeout=10)
    if resp.status_code >= 400:
        print(f"  ✗ {path} → {resp.status_code}: {resp.text[:200]}")
        return {}
    return resp.json()


def _seed_account(account: dict) -> None:
    sid = account["student_id"]
    name = account.get("display_name", sid)
    print(f"\n── Seeding {sid} ──")

    # 0) Create the account using /signup (password = "demo")
    signup_result = _post("/signup", {
        "student_id": sid,
        "display_name": name,
        "password": "demo",
    })
    if signup_result.get("status") == "ok":
        print("  ✓ Account created (password: demo)")
    elif "409" in str(signup_result):
        print("  ⊘ Account already exists, continuing…")
    else:
        print(f"  ✓ Signup: {signup_result}")

    # 1) Submit journals (which also build the twin)
    for i, entry in enumerate(account["journal_entries"]):
        payload = {
            "student_id": sid,
            "text": entry["text"],
            "mood_label": entry.get("mood_label"),
            "tags": entry.get("tags", []),
        }
        result = _post("/journal", payload)
        status = "✓" if result.get("status") == "ok" else "✗"
        print(f"  {status} Journal entry {i + 1}")
        time.sleep(0.05)  # gentle pacing

    # 2) Submit mood check-ins
    for i, mc in enumerate(account["mood_checkins"]):
        payload = {
            "student_id": sid,
            "mood_label": mc["mood_label"],
            "energy_level": mc["energy_level"],
            "stress_level": mc["stress_level"],
            "social_battery": mc["social_battery"],
            "notes": mc.get("notes"),
        }
        result = _post("/mood", payload)
        status = "✓" if result.get("status") == "ok" else "✗"
        print(f"  {status} Mood check-in {i + 1}")

    # 3) Submit activities
    for i, act in enumerate(account["activities"]):
        payload = {
            "student_id": sid,
            "activity_type": act["activity_type"],
            "description": act.get("description"),
            "duration_mins": act.get("duration_mins"),
        }
        result = _post("/activity", payload)
        status = "✓" if result.get("status") == "ok" else "✗"
        print(f"  {status} Activity {i + 1}")

    # 4) Submit consent
    result = _post("/consent", {"student_id": sid, "consented": True})
    status = "✓" if result.get("status") == "ok" else "✗"
    print(f"  {status} Consent granted")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Seed NeuroTwin demo accounts")
    parser.add_argument("--url", default="http://localhost:8000", help="Backend base URL")
    args = parser.parse_args()

    global API_BASE
    API_BASE = args.url.rstrip("/")

    print(f"NeuroTwin Demo Seeder")
    print(f"Backend: {API_BASE}")
    print(f"Accounts: {len(DEMO_ACCOUNTS)}")
    print("=" * 40)

    # Verify backend is up
    try:
        health = requests.get(f"{API_BASE}/health", timeout=5)
        print(f"Health check: {health.json()}")
    except requests.ConnectionError:
        print(f"✗ Cannot reach {API_BASE}. Is the backend running?")
        sys.exit(1)

    start = time.time()
    for account in DEMO_ACCOUNTS:
        _seed_account(account)
    elapsed = time.time() - start

    print(f"\n{'=' * 40}")
    print(f"✓ Seeded {len(DEMO_ACCOUNTS)} accounts in {elapsed:.1f}s")
    print(f"\nDemo accounts (password: demo):")
    for acc in DEMO_ACCOUNTS:
        sid = acc["student_id"]
        n_j = len(acc["journal_entries"])
        n_m = len(acc["mood_checkins"])
        n_a = len(acc["activities"])
        print(f"  • {sid:15s}  {n_j} journals, {n_m} moods, {n_a} activities")
    print(f"\nLog in at /login with any account above. Password: demo")


if __name__ == "__main__":
    main()
