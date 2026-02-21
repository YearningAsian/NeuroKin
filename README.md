# NeuroKin

**Emotionally Intelligent Digital Twin System for Student Connection**

NeuroKin builds an Emotional Digital Twin for each student using journaling, mood signals, and activity patterns. It computes an Emotional Compatibility Score between students and recommends meaningful peer connections above a 50% threshold.

---

## Architecture

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js · TypeScript · Tailwind CSS · shadcn-style components |
| Backend | FastAPI · Python · Pydantic |
| Database | Snowflake (tables + VARIANT columns for embeddings) |
| AI | Snowflake Cortex (EMBED_TEXT, COMPLETE, SENTIMENT, SUMMARIZE) |
| Orchestration | LangChain chains (TwinBuilder → MatchRetrieval → Explanation) |
| Deployment | Vercel (frontend) + Railway (backend) |

---

## Project Structure

```
NeuroKin/
├── frontend/                 # Next.js App Router
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx               # Landing page
│   │   │   ├── onboarding/page.tsx    # Onboarding flow
│   │   │   └── (app)/                 # Authenticated pages
│   │   │       ├── dashboard/page.tsx
│   │   │       ├── journal/page.tsx
│   │   │       ├── mood/page.tsx
│   │   │       ├── connections/page.tsx
│   │   │       └── profile/page.tsx
│   │   ├── components/
│   │   │   ├── Navbar.tsx
│   │   │   └── ui/
│   │   │       ├── Button.tsx
│   │   │       └── Card.tsx
│   │   └── lib/
│   │       ├── api.ts                 # API client
│   │       └── utils.ts               # cn() helper
│   ├── tailwind.config.ts
│   └── package.json
├── backend/
│   ├── main.py                        # Single-file FastAPI backend
│   ├── requirements.txt
│   └── .env.example
└── README.md
```

---

## User Flow

```
Landing → Onboarding (name, mood, energy, activities, values, first journal)
    → Dashboard (twin snapshot, mood chart, quick actions, recent matches)
        → Journal (write entries, view history)
        → Mood Check-in (mood picker, energy/stress/social sliders)
        → Connections (peer cards, explanations, icebreakers, connect/skip/report)
        → My Twin (emotion distribution, themes, values, privacy controls)
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.11+
- A Snowflake account with Cortex functions enabled

### Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Configure Snowflake credentials
cp .env.example .env
# Edit .env with your Snowflake credentials

uvicorn main:app --reload --port 8000
# → http://localhost:8000/docs
```

Set `NEXT_PUBLIC_API_URL=http://localhost:8000` in the frontend `.env.local` to connect them.

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/journal` | Submit a journal entry → triggers TwinBuilderChain |
| POST | `/mood` | Submit a mood check-in → updates twin |
| POST | `/activity` | Log a student activity |
| GET | `/twin?student_id=` | Retrieve the Emotional Digital Twin |
| GET | `/recommendations?student_id=` | Get peer matches ≥ 50% |
| POST | `/feedback` | Accept / skip a recommendation |
| POST | `/block` | Block a peer |
| POST | `/report` | Report a peer |
| POST | `/consent` | Record data-processing consent |
| DELETE | `/account?student_id=` | Opt-out: delete all student data |
| GET | `/health` | Health check |

---

## Compatibility Scoring Model

```
CompatibilityScore% = 100 × clamp01(
    0.50 × cosine_similarity(twin_embedding_A, twin_embedding_B)
  + 0.20 × emotion_vector_similarity
  + 0.15 × activity_similarity (Jaccard)
  + 0.10 × shared_values_tags (Jaccard)
  + 0.05 × schedule_overlap
)
```

Only peers **≥ 50%** are shown. Each includes an AI-generated explanation and icebreaker.

---

## LangChain Pipeline

1. **TwinBuilderChain** — Embeds journal text, extracts emotions/themes via Cortex COMPLETE, merges into rolling twin snapshot.
2. **MatchRetrievalChain** — Vector-searches Snowflake for candidates, computes full compatibility score, filters ≥ 50%.
3. **ExplanationChain** — Generates human-readable match explanations and icebreakers with safety guardrails.

---

## Extending the Model

To add a new dimension (e.g. `hobby_vector`):

1. **Add the field to the Pydantic model** in `backend/main.py`:
   ```python
   class TwinSnapshot(BaseModel):
       # ... existing fields ...
       hobby_vector: list[float] = Field(default_factory=list)
   ```
2. **Add the column to Snowflake**:
   ```sql
   ALTER TABLE twin_snapshots ADD COLUMN hobby_vector VARIANT;
   ```
3. **Update `compute_compatibility()`** to include the new weight.

No routing logic changes needed — FastAPI auto-serializes from the model.

---

## Safety & Privacy

- Journal text is **Fernet-encrypted** at rest (set `ENCRYPTION_KEY` in `.env`)
- Raw journals are **never** shared between students
- Block & report mechanisms with school-level moderation
- Explicit consent endpoint (`POST /consent`) required before data processing
- Full data deletion via `DELETE /account` (opt-out)
- FERPA / COPPA compliance design

---

## LangChain Integration

All three chains (`TwinBuilderChain`, `MatchRetrievalChain`, `ExplanationChain`) are wrapped as **langchain-core `Runnable`** objects, making them compatible with:
- LangChain tracing & callbacks (LangSmith)
- `RunnableSequence` composition
- Async invocation and batching

When `langchain-core` is installed, the runnables are available as module-level objects (`twin_builder_runnable`, `match_retrieval_runnable`, `recommendation_pipeline`).

---

## License

See [LICENSE](./LICENSE).
