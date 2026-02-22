#!/usr/bin/env python3
"""
NeuroTwin Demo Seed Script
=========================
Creates 20 Duke University demo student accounts with journal entries,
mood check‑ins, and activities so the app is immediately demonstrable.

Usage:
    # Start the backend first (DEMO_MODE=1 by default):
    #   cd backend && uvicorn main:app --reload
    #
    # Then in another terminal:
    #   python seed.py
    #
    # Or with a custom base URL:
    #   python seed.py --url http://localhost:8000

All accounts use password: demo
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
    # ── Cluster A: Tech / AI Enthusiasts ──
    {
        "student_id": "duke-emma",
        "display_name": "Emma",
        "journal_entries": [
            {"text": "Spent all afternoon training a neural net for my AI class project. The math behind gradient descent finally clicked. Went for a trail run after and felt amazing.", "mood_label": "excited", "tags": ["artificial intelligence", "coding", "fitness"]},
            {"text": "Had an inspiring study group session about transformer architectures. Afterwards we played guitar on the quad — perfect blend of mind and soul.", "mood_label": "happy", "tags": ["artificial intelligence", "music", "Social"]},
            {"text": "Meditation session this morning before my algorithms exam helped me stay centred. Mindfulness really does sharpen focus.", "mood_label": "calm", "tags": ["mindfulness", "Academic"]},
        ],
        "mood_checkins": [
            {"mood_label": "excited", "energy_level": 8, "stress_level": 3, "social_battery": 7, "notes": "Great lab day"},
            {"mood_label": "calm", "energy_level": 6, "stress_level": 2, "social_battery": 5},
            {"mood_label": "happy", "energy_level": 7, "stress_level": 2, "social_battery": 8, "notes": "Post-run high"},
        ],
        "activities": [
            {"activity_type": "coding", "description": "Neural network training", "duration_mins": 150},
            {"activity_type": "trail running", "description": "Campus loop 5k", "duration_mins": 30},
            {"activity_type": "guitar", "description": "Quad jam session", "duration_mins": 40},
        ],
    },
    {
        "student_id": "duke-liam",
        "display_name": "Liam",
        "journal_entries": [
            {"text": "Built a reinforcement learning agent that can play Connect Four. Watching it learn strategies on its own is magical. Also did a long hike at Eno River.", "mood_label": "excited", "tags": ["artificial intelligence", "coding", "hiking"]},
            {"text": "Reading about meditation and its effects on neural plasticity. The intersection of neuroscience and mindfulness is fascinating.", "mood_label": "reflective", "tags": ["meditation", "reading", "Growth"]},
            {"text": "Robotics club meeting went well — we're designing an autonomous drone for the competition. Teamwork makes the dream work.", "mood_label": "happy", "tags": ["robotics", "coding", "teamwork"]},
        ],
        "mood_checkins": [
            {"mood_label": "happy", "energy_level": 7, "stress_level": 3, "social_battery": 6},
            {"mood_label": "calm", "energy_level": 6, "stress_level": 2, "social_battery": 5, "notes": "Post-hike peace"},
            {"mood_label": "excited", "energy_level": 8, "stress_level": 4, "social_battery": 7, "notes": "Drone project kickoff"},
        ],
        "activities": [
            {"activity_type": "coding", "description": "RL agent for Connect Four", "duration_mins": 180},
            {"activity_type": "trail running", "description": "Eno River trail", "duration_mins": 60},
            {"activity_type": "reading", "description": "Neuroscience of meditation", "duration_mins": 45},
        ],
    },
    {
        "student_id": "duke-sophia",
        "display_name": "Sophia",
        "journal_entries": [
            {"text": "Data science competition this weekend! Our team used NLP to analyze sentiment in climate articles. Coding late nights but the results are incredible.", "mood_label": "excited", "tags": ["artificial intelligence", "coding", "nature"]},
            {"text": "Yoga class followed by coding session — this is my ideal day. Balance between body and mind is something I've learned to prioritize at Duke.", "mood_label": "calm", "tags": ["yoga", "coding", "mindfulness"]},
            {"text": "Played guitar at open mic night. Being creative outside of STEM recharges me in ways nothing else can.", "mood_label": "happy", "tags": ["music", "creativity"]},
        ],
        "mood_checkins": [
            {"mood_label": "excited", "energy_level": 7, "stress_level": 4, "social_battery": 6},
            {"mood_label": "calm", "energy_level": 6, "stress_level": 2, "social_battery": 5, "notes": "Yoga + code flow"},
            {"mood_label": "happy", "energy_level": 7, "stress_level": 2, "social_battery": 7, "notes": "Open mic night"},
        ],
        "activities": [
            {"activity_type": "coding", "description": "NLP sentiment analysis project", "duration_mins": 200},
            {"activity_type": "yoga", "description": "Morning Vinyasa flow", "duration_mins": 45},
            {"activity_type": "guitar", "description": "Open mic performance", "duration_mins": 30},
        ],
    },
    {
        "student_id": "duke-ethan",
        "display_name": "Ethan",
        "journal_entries": [
            {"text": "Late night coding session for the hackathon. Our team built an AI chatbot prototype in 24 hours. Exhausted but proud.", "mood_label": "excited", "tags": ["coding", "artificial intelligence", "teamwork"]},
            {"text": "Gaming tournament this weekend helped me decompress from midterms. Competitive games sharpen my strategic thinking.", "mood_label": "happy", "tags": ["gaming", "Social"]},
            {"text": "Struggling with the music production software but making progress. Creating beats is like writing code — iterative and rewarding.", "mood_label": "reflective", "tags": ["music production", "creativity", "Growth"]},
        ],
        "mood_checkins": [
            {"mood_label": "excited", "energy_level": 7, "stress_level": 6, "social_battery": 7, "notes": "Hackathon adrenaline"},
            {"mood_label": "happy", "energy_level": 6, "stress_level": 3, "social_battery": 6},
            {"mood_label": "anxious", "energy_level": 5, "stress_level": 7, "social_battery": 4, "notes": "Midterm pressure"},
        ],
        "activities": [
            {"activity_type": "coding", "description": "Hackathon chatbot build", "duration_mins": 360},
            {"activity_type": "gaming", "description": "Weekend tournament", "duration_mins": 120},
            {"activity_type": "coding", "description": "Music production in Ableton", "duration_mins": 90},
        ],
    },

    # ── Cluster B: Creative / Empathetic ──
    {
        "student_id": "duke-olivia",
        "display_name": "Olivia",
        "journal_entries": [
            {"text": "Led a poetry workshop at the community centre. Watching shy first-years open up through verse was the highlight of my week.", "mood_label": "happy", "tags": ["poetry", "community", "empathy"]},
            {"text": "Dance rehearsal for the spring showcase. Our piece explores belonging and identity — movement says what words can't.", "mood_label": "reflective", "tags": ["dance", "creativity", "mindfulness"]},
            {"text": "Morning yoga and journaling. I'm learning that stillness is not emptiness — it's fullness waiting to be noticed.", "mood_label": "calm", "tags": ["yoga", "mindfulness", "psychology"]},
        ],
        "mood_checkins": [
            {"mood_label": "happy", "energy_level": 7, "stress_level": 3, "social_battery": 8, "notes": "Poetry workshop glow"},
            {"mood_label": "calm", "energy_level": 5, "stress_level": 2, "social_battery": 4},
            {"mood_label": "reflective", "energy_level": 5, "stress_level": 3, "social_battery": 5, "notes": "Journaling clarity"},
        ],
        "activities": [
            {"activity_type": "dance", "description": "Spring showcase choreography", "duration_mins": 90},
            {"activity_type": "volunteering", "description": "Poetry workshop at community centre", "duration_mins": 120},
            {"activity_type": "yoga", "description": "Morning Hatha session", "duration_mins": 40},
        ],
    },
    {
        "student_id": "duke-noah",
        "display_name": "Noah",
        "journal_entries": [
            {"text": "Psychology of empathy lecture blew my mind today. Mirror neurons are fascinating — we're literally wired to feel each other's pain.", "mood_label": "reflective", "tags": ["psychology", "empathy", "Growth"]},
            {"text": "Wrote a short story about loneliness in the digital age. Creative writing lets me explore emotions I can't talk about out loud.", "mood_label": "calm", "tags": ["creative writing", "Reflection"]},
            {"text": "Volunteered at the food bank with friends. Physical labour + meaningful purpose = the best kind of tired.", "mood_label": "happy", "tags": ["volunteering", "community", "Social"]},
        ],
        "mood_checkins": [
            {"mood_label": "calm", "energy_level": 5, "stress_level": 3, "social_battery": 4},
            {"mood_label": "reflective", "energy_level": 4, "stress_level": 4, "social_battery": 3, "notes": "Heavy lecture day"},
            {"mood_label": "happy", "energy_level": 6, "stress_level": 2, "social_battery": 7, "notes": "Volunteering glow"},
        ],
        "activities": [
            {"activity_type": "journaling", "description": "Evening creative writing", "duration_mins": 45},
            {"activity_type": "yoga", "description": "Restorative session", "duration_mins": 30},
            {"activity_type": "volunteering", "description": "Food bank shift", "duration_mins": 120},
        ],
    },
    {
        "student_id": "duke-ava",
        "display_name": "Ava",
        "journal_entries": [
            {"text": "Organised a panel on social justice in higher education. The conversations were raw and real. Change starts with dialogue.", "mood_label": "reflective", "tags": ["social justice", "community"]},
            {"text": "Yoga retreat this weekend brought me back to centre. My body holds so much tension from advocacy work — I need to release it more often.", "mood_label": "calm", "tags": ["yoga", "mindfulness", "self-care"]},
            {"text": "Writing an essay on intersectionality for the campus journal. Creative writing and activism are inseparable for me.", "mood_label": "happy", "tags": ["creative writing", "social justice", "Growth"]},
        ],
        "mood_checkins": [
            {"mood_label": "reflective", "energy_level": 5, "stress_level": 5, "social_battery": 6, "notes": "Panel was intense"},
            {"mood_label": "calm", "energy_level": 6, "stress_level": 2, "social_battery": 3, "notes": "Yoga retreat peace"},
            {"mood_label": "happy", "energy_level": 6, "stress_level": 3, "social_battery": 5},
        ],
        "activities": [
            {"activity_type": "volunteering", "description": "Social justice panel organising", "duration_mins": 180},
            {"activity_type": "yoga", "description": "Weekend retreat", "duration_mins": 120},
            {"activity_type": "journaling", "description": "Intersectionality essay draft", "duration_mins": 60},
        ],
    },
    {
        "student_id": "duke-isabella",
        "display_name": "Isabella",
        "journal_entries": [
            {"text": "Contemporary dance class explored vulnerability through movement. I cried during the cool-down and it felt like healing.", "mood_label": "reflective", "tags": ["dance", "psychology", "mindfulness"]},
            {"text": "Wrote a poem about my grandmother's garden. Nostalgia isn't sadness — it's love with nowhere to go.", "mood_label": "calm", "tags": ["poetry", "nostalgia"]},
            {"text": "Late night music session with friends. Singing harmonies in the dorm hallway is pure joy.", "mood_label": "happy", "tags": ["music", "Social", "community"]},
        ],
        "mood_checkins": [
            {"mood_label": "reflective", "energy_level": 5, "stress_level": 3, "social_battery": 5},
            {"mood_label": "calm", "energy_level": 5, "stress_level": 2, "social_battery": 3, "notes": "Quiet writing day"},
            {"mood_label": "happy", "energy_level": 6, "stress_level": 2, "social_battery": 7, "notes": "Dorm sing-along"},
        ],
        "activities": [
            {"activity_type": "dance", "description": "Contemporary dance workshop", "duration_mins": 75},
            {"activity_type": "journaling", "description": "Poetry writing session", "duration_mins": 40},
            {"activity_type": "yoga", "description": "Morning stretch routine", "duration_mins": 20},
        ],
    },

    # ── Cluster C: Entrepreneurial / Athletic ──
    {
        "student_id": "duke-jackson",
        "display_name": "Jackson",
        "journal_entries": [
            {"text": "Pitched my food-delivery app idea to angel investors. Nerve-wracking but the Q&A went great. This could actually happen!", "mood_label": "excited", "tags": ["entrepreneurship", "Growth"]},
            {"text": "Pickup basketball at Cameron. Nothing clears my head like competing on the court. Also tried a new curry recipe — turned out incredible.", "mood_label": "happy", "tags": ["fitness", "basketball", "cooking"]},
            {"text": "Feeling anxious about balancing the startup with coursework. Need to delegate more. Went for a long run to clear my head.", "mood_label": "anxious", "tags": ["stress", "entrepreneurship", "fitness"]},
        ],
        "mood_checkins": [
            {"mood_label": "excited", "energy_level": 9, "stress_level": 5, "social_battery": 9},
            {"mood_label": "happy", "energy_level": 8, "stress_level": 3, "social_battery": 8, "notes": "Great game + cooking"},
            {"mood_label": "anxious", "energy_level": 7, "stress_level": 7, "social_battery": 5, "notes": "Startup pressure"},
        ],
        "activities": [
            {"activity_type": "basketball", "description": "Pickup at Cameron", "duration_mins": 90},
            {"activity_type": "cooking", "description": "Thai curry experiment", "duration_mins": 60},
            {"activity_type": "coding", "description": "App prototype sprint", "duration_mins": 180},
        ],
    },
    {
        "student_id": "duke-mia",
        "display_name": "Mia",
        "journal_entries": [
            {"text": "Ran a 10k personal best today! Training for the Duke half-marathon. Also sketched business model ideas at the café afterwards.", "mood_label": "excited", "tags": ["fitness", "entrepreneurship", "Growth"]},
            {"text": "Travel photography exhibition at Nasher Museum inspired me. Seeing the world through other people's lenses shifts your own perspective.", "mood_label": "reflective", "tags": ["photography", "travel", "creativity"]},
            {"text": "Cooked dinner for the whole dorm floor. Food brings people together — maybe that's my real startup idea.", "mood_label": "happy", "tags": ["cooking", "community", "Social"]},
        ],
        "mood_checkins": [
            {"mood_label": "excited", "energy_level": 9, "stress_level": 3, "social_battery": 7, "notes": "10k PR!"},
            {"mood_label": "happy", "energy_level": 7, "stress_level": 2, "social_battery": 8},
            {"mood_label": "calm", "energy_level": 6, "stress_level": 3, "social_battery": 6, "notes": "Relaxing evening cooking"},
        ],
        "activities": [
            {"activity_type": "trail running", "description": "10k personal best", "duration_mins": 52},
            {"activity_type": "cooking", "description": "Dorm dinner party", "duration_mins": 90},
            {"activity_type": "yoga", "description": "Recovery stretching", "duration_mins": 20},
        ],
    },
    {
        "student_id": "duke-aiden",
        "display_name": "Aiden",
        "journal_entries": [
            {"text": "Intramural basketball finals tomorrow. We've been practising all semester — win or lose, this team is family.", "mood_label": "excited", "tags": ["basketball", "fitness", "teamwork"]},
            {"text": "Listened to a startup podcast about failing fast. It resonated — my first two business ideas flopped but I learned everything from them.", "mood_label": "reflective", "tags": ["entrepreneurship", "Growth", "Reflection"]},
            {"text": "Guitar jam with teammates after practice. Who knew our centre plays blues? Music breaks down every social barrier.", "mood_label": "happy", "tags": ["music", "Social", "creativity"]},
        ],
        "mood_checkins": [
            {"mood_label": "excited", "energy_level": 9, "stress_level": 4, "social_battery": 9, "notes": "Finals prep energy"},
            {"mood_label": "reflective", "energy_level": 6, "stress_level": 5, "social_battery": 5},
            {"mood_label": "happy", "energy_level": 7, "stress_level": 3, "social_battery": 8, "notes": "Post-jam vibes"},
        ],
        "activities": [
            {"activity_type": "basketball", "description": "Finals practice", "duration_mins": 120},
            {"activity_type": "guitar", "description": "Blues jam with team", "duration_mins": 45},
            {"activity_type": "trail running", "description": "Morning conditioning run", "duration_mins": 35},
        ],
    },

    # ── Cluster D: Academic / Reflective ──
    {
        "student_id": "duke-charlotte",
        "display_name": "Charlotte",
        "journal_entries": [
            {"text": "Philosophy seminar on consciousness was extraordinary. Nagel's 'What Is It Like to Be a Bat?' keeps spinning in my head. Painted afterwards to process.", "mood_label": "reflective", "tags": ["philosophy", "art history", "Reflection"]},
            {"text": "Spent the evening stargazing at the observatory. Jupiter's moons were crystal clear. The universe is the best meditation.", "mood_label": "calm", "tags": ["astronomy", "meditation", "Nature"]},
            {"text": "Finished Virginia Woolf's 'To the Lighthouse'. Her prose is like watercolour — everything bleeds into everything else.", "mood_label": "happy", "tags": ["reading", "creativity"]},
        ],
        "mood_checkins": [
            {"mood_label": "calm", "energy_level": 4, "stress_level": 2, "social_battery": 3},
            {"mood_label": "reflective", "energy_level": 4, "stress_level": 1, "social_battery": 2, "notes": "Stargazing peace"},
            {"mood_label": "happy", "energy_level": 5, "stress_level": 1, "social_battery": 4, "notes": "Book bliss"},
        ],
        "activities": [
            {"activity_type": "reading", "description": "Virginia Woolf novel", "duration_mins": 90},
            {"activity_type": "stargazing", "description": "Observatory night", "duration_mins": 120},
            {"activity_type": "painting", "description": "Watercolour still life", "duration_mins": 60},
        ],
    },
    {
        "student_id": "duke-lucas",
        "display_name": "Lucas",
        "journal_entries": [
            {"text": "Read Camus' 'The Stranger' in one sitting. Existentialism hits different when you're staring at the stars afterwards.", "mood_label": "reflective", "tags": ["philosophy", "reading", "astronomy"]},
            {"text": "Trail run through Duke Forest. The autumn leaves are peak right now. Nature is the original philosopher — always teaching impermanence.", "mood_label": "calm", "tags": ["nature", "fitness", "mindfulness"]},
            {"text": "Started writing a short story about time travel and memory. Creative writing is philosophy with characters.", "mood_label": "happy", "tags": ["creative writing", "philosophy", "creativity"]},
        ],
        "mood_checkins": [
            {"mood_label": "reflective", "energy_level": 4, "stress_level": 2, "social_battery": 3},
            {"mood_label": "calm", "energy_level": 5, "stress_level": 1, "social_battery": 3, "notes": "Forest run clarity"},
            {"mood_label": "happy", "energy_level": 5, "stress_level": 2, "social_battery": 4, "notes": "Writing flow state"},
        ],
        "activities": [
            {"activity_type": "reading", "description": "Camus deep dive", "duration_mins": 120},
            {"activity_type": "trail running", "description": "Duke Forest autumn run", "duration_mins": 45},
            {"activity_type": "journaling", "description": "Short story draft", "duration_mins": 60},
        ],
    },
    {
        "student_id": "duke-amelia",
        "display_name": "Amelia",
        "journal_entries": [
            {"text": "Spent the day at the Nasher Museum studying Renaissance paintings. The way light falls in Caravaggio's work — it's theatrical. Pure emotion on canvas.", "mood_label": "reflective", "tags": ["art history", "museum", "creativity"]},
            {"text": "Journaling about nostalgia — why do certain memories carry so much weight? Philosophy and psychology intertwine here.", "mood_label": "calm", "tags": ["journaling", "philosophy", "Reflection"]},
            {"text": "Read a beautiful essay on the philosophy of memory. Started painting my own interpretation afterwards.", "mood_label": "happy", "tags": ["reading", "philosophy", "art history"]},
        ],
        "mood_checkins": [
            {"mood_label": "reflective", "energy_level": 4, "stress_level": 2, "social_battery": 2},
            {"mood_label": "calm", "energy_level": 3, "stress_level": 1, "social_battery": 2, "notes": "Museum solitude"},
            {"mood_label": "happy", "energy_level": 4, "stress_level": 2, "social_battery": 3, "notes": "Painting flow"},
        ],
        "activities": [
            {"activity_type": "reading", "description": "Philosophy of memory essay", "duration_mins": 60},
            {"activity_type": "painting", "description": "Memory interpretation piece", "duration_mins": 90},
            {"activity_type": "journaling", "description": "Nostalgia reflection", "duration_mins": 30},
        ],
    },

    # ── Cross-cluster / Diverse Profiles ──
    {
        "student_id": "duke-harper",
        "display_name": "Harper",
        "journal_entries": [
            {"text": "Theatre rehearsal was electric tonight. Our production of 'Rent' opens next week and the energy is contagious.", "mood_label": "excited", "tags": ["theater", "creativity", "Social"]},
            {"text": "Singing in the a cappella group is my happy place. Harmonising with others is like emotional synchronisation.", "mood_label": "happy", "tags": ["singing", "music", "community"]},
            {"text": "Nervous about the audition tomorrow but channelling that anxiety into preparation. Fear and excitement are the same feeling with different labels.", "mood_label": "anxious", "tags": ["theater", "Growth", "stress"]},
        ],
        "mood_checkins": [
            {"mood_label": "excited", "energy_level": 8, "stress_level": 5, "social_battery": 9},
            {"mood_label": "happy", "energy_level": 7, "stress_level": 3, "social_battery": 8, "notes": "A cappella joy"},
            {"mood_label": "anxious", "energy_level": 6, "stress_level": 7, "social_battery": 5, "notes": "Audition nerves"},
        ],
        "activities": [
            {"activity_type": "dance", "description": "Rent choreography rehearsal", "duration_mins": 120},
            {"activity_type": "cooking", "description": "Cast dinner party", "duration_mins": 60},
            {"activity_type": "yoga", "description": "Pre-show stretches", "duration_mins": 20},
        ],
    },
    {
        "student_id": "duke-mason",
        "display_name": "Mason",
        "journal_entries": [
            {"text": "Lab experiment yielded unexpected results — the catalyst worked at half the temperature we predicted. Science is full of beautiful surprises.", "mood_label": "excited", "tags": ["chemistry", "research", "Growth"]},
            {"text": "Quiet morning trail run and reading under a tree. Some days the best company is your own thoughts.", "mood_label": "calm", "tags": ["nature", "reading", "mindfulness"]},
            {"text": "Meditation retreat this weekend. Learning to observe thoughts without attaching to them. It's changing how I do research — more patience, less ego.", "mood_label": "reflective", "tags": ["meditation", "research", "Reflection"]},
        ],
        "mood_checkins": [
            {"mood_label": "excited", "energy_level": 6, "stress_level": 4, "social_battery": 4, "notes": "Lab breakthrough"},
            {"mood_label": "calm", "energy_level": 5, "stress_level": 1, "social_battery": 2},
            {"mood_label": "reflective", "energy_level": 4, "stress_level": 2, "social_battery": 3, "notes": "Retreat insights"},
        ],
        "activities": [
            {"activity_type": "coding", "description": "Data analysis for lab results", "duration_mins": 120},
            {"activity_type": "trail running", "description": "Solo morning run", "duration_mins": 40},
            {"activity_type": "stargazing", "description": "Night sky observation", "duration_mins": 60},
        ],
    },
    {
        "student_id": "duke-ella",
        "display_name": "Ella",
        "journal_entries": [
            {"text": "Fashion show planning is consuming my life but I love every second. Curating looks is visual storytelling.", "mood_label": "excited", "tags": ["fashion", "creativity", "photography"]},
            {"text": "Roadtrip to the mountains for photography. Golden hour shots of the Blue Ridge were absolutely stunning.", "mood_label": "happy", "tags": ["photography", "travel", "Nature"]},
            {"text": "Cooked brunch for friends and played my favourite playlist. Simple pleasures are the best pleasures.", "mood_label": "happy", "tags": ["cooking", "music", "Social"]},
        ],
        "mood_checkins": [
            {"mood_label": "excited", "energy_level": 9, "stress_level": 4, "social_battery": 9, "notes": "Fashion show hype"},
            {"mood_label": "happy", "energy_level": 8, "stress_level": 2, "social_battery": 7},
            {"mood_label": "happy", "energy_level": 7, "stress_level": 2, "social_battery": 8, "notes": "Brunch vibes"},
        ],
        "activities": [
            {"activity_type": "cooking", "description": "Sunday brunch spread", "duration_mins": 75},
            {"activity_type": "yoga", "description": "Hot yoga class", "duration_mins": 60},
            {"activity_type": "dance", "description": "Runway walk practice", "duration_mins": 45},
        ],
    },
    {
        "student_id": "duke-james",
        "display_name": "James",
        "journal_entries": [
            {"text": "Solo backpacking trip to Crabtree Falls. 14 miles in silence — my favourite form of therapy. The waterfall at the summit was worth every step.", "mood_label": "calm", "tags": ["hiking", "nature", "mindfulness"]},
            {"text": "Reading Marcus Aurelius' Meditations for the third time. Stoicism isn't about suppressing emotions — it's about choosing your response.", "mood_label": "reflective", "tags": ["philosophy", "reading", "Reflection"]},
            {"text": "Painted the sunset from my dorm window. Quiet evenings are when I feel most alive.", "mood_label": "calm", "tags": ["nature", "creativity", "meditation"]},
        ],
        "mood_checkins": [
            {"mood_label": "calm", "energy_level": 4, "stress_level": 1, "social_battery": 2},
            {"mood_label": "reflective", "energy_level": 3, "stress_level": 2, "social_battery": 2, "notes": "Deep reading day"},
            {"mood_label": "calm", "energy_level": 4, "stress_level": 1, "social_battery": 1, "notes": "Solo evening bliss"},
        ],
        "activities": [
            {"activity_type": "trail running", "description": "Crabtree Falls hike", "duration_mins": 300},
            {"activity_type": "reading", "description": "Stoic philosophy", "duration_mins": 90},
            {"activity_type": "painting", "description": "Sunset watercolour", "duration_mins": 45},
        ],
    },
    {
        "student_id": "duke-scarlett",
        "display_name": "Scarlett",
        "journal_entries": [
            {"text": "Led a campus cleanup at the Duke Gardens. 40 volunteers showed up! Small actions, collective impact. Climate hope is real.", "mood_label": "happy", "tags": ["sustainability", "community", "nature"]},
            {"text": "Trail run through Duke Forest thinking about my environmental policy thesis. The forest itself is my research partner.", "mood_label": "reflective", "tags": ["nature", "sustainability", "fitness"]},
            {"text": "Yoga and reading about regenerative agriculture. The solutions exist — we just need the will to implement them.", "mood_label": "calm", "tags": ["yoga", "reading", "sustainability"]},
        ],
        "mood_checkins": [
            {"mood_label": "happy", "energy_level": 7, "stress_level": 3, "social_battery": 8, "notes": "Cleanup success!"},
            {"mood_label": "reflective", "energy_level": 5, "stress_level": 4, "social_battery": 4},
            {"mood_label": "calm", "energy_level": 6, "stress_level": 2, "social_battery": 3, "notes": "Hopeful reading"},
        ],
        "activities": [
            {"activity_type": "volunteering", "description": "Duke Gardens cleanup", "duration_mins": 150},
            {"activity_type": "trail running", "description": "Duke Forest thesis run", "duration_mins": 50},
            {"activity_type": "yoga", "description": "Evening wind-down", "duration_mins": 30},
        ],
    },
    {
        "student_id": "duke-benjamin",
        "display_name": "Benjamin",
        "journal_entries": [
            {"text": "Stock market simulation in finance class — my portfolio is up 15%. The adrenaline of reading market patterns is addictive.", "mood_label": "excited", "tags": ["finance", "entrepreneurship", "Growth"]},
            {"text": "Basketball game was brutal. We were down 20 in the third quarter but fought back to lose by 3. Almost counts in horseshoes.", "mood_label": "frustrated", "tags": ["basketball", "fitness", "stress"]},
            {"text": "Meal prepped healthy lunches for the week. Cooking is my underrated productivity hack.", "mood_label": "calm", "tags": ["cooking", "self-care"]},
        ],
        "mood_checkins": [
            {"mood_label": "excited", "energy_level": 8, "stress_level": 5, "social_battery": 6, "notes": "Portfolio gains"},
            {"mood_label": "frustrated", "energy_level": 7, "stress_level": 7, "social_battery": 6, "notes": "Close game loss"},
            {"mood_label": "anxious", "energy_level": 6, "stress_level": 8, "social_battery": 4, "notes": "Exam week looming"},
        ],
        "activities": [
            {"activity_type": "basketball", "description": "League game", "duration_mins": 90},
            {"activity_type": "cooking", "description": "Weekly meal prep", "duration_mins": 75},
            {"activity_type": "coding", "description": "Sport analytics dashboard", "duration_mins": 120},
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
