# NeuroKin Database Schema

> Snowflake · `NEUROKIN_DB.PUBLIC`
>
> Last updated: 2026-02-21

---

## Entity-Relationship Overview

```
students ─┬── journal_entries      (1 : N)
           ├── mood_checkins        (1 : N)
           ├── activities           (1 : N)
           ├── twin_snapshots       (1 : 1)
           ├── onboarding_responses (1 : 1)
           ├── matches              (M : N  via student_a / student_b)
           ├── blocks               (M : N  via blocker_id / blocked_id)
           ├── safety_reports       (M : N  via reporter_id / reported_id)
           └── notifications        (1 : N)
```

---

## Tables

### 1. `students`

Core identity table. One row per registered student.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `student_id` | VARCHAR(64) | — | **PK** Unique identifier |
| `display_name` | VARCHAR(128) | NULL | Visible name |
| `email_hash` | VARCHAR(128) | NULL | SHA-256 of email (privacy) |
| `onboarded` | BOOLEAN | FALSE | Has completed onboarding wizard |
| `created_at` | TIMESTAMP_NTZ | NOW | Row creation time |
| `updated_at` | TIMESTAMP_NTZ | NOW | Last profile update |

---

### 2. `journal_entries`

Encrypted journal text + Cortex embedding per entry.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | VARCHAR(64) | UUID | **PK** |
| `student_id` | VARCHAR(64) | — | **FK → students** |
| `text_encrypted` | VARCHAR(16 MB) | NULL | AES-encrypted journal body |
| `mood_label` | VARCHAR(32) | NULL | Optional mood tag at write-time |
| `tags` | VARIANT | NULL | JSON array of free-form tags |
| `embedding` | VARIANT | NULL | 768-d float array (Arctic Embed) |
| `created_at` | TIMESTAMP_NTZ | NOW | Entry timestamp |

---

### 3. `mood_checkins`

Quick mood snapshots with 1–10 scales.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | VARCHAR(64) | UUID | **PK** |
| `student_id` | VARCHAR(64) | — | **FK → students** |
| `mood_label` | VARCHAR(32) | — | Required mood enum |
| `energy_level` | INT | NULL | 1–10 |
| `stress_level` | INT | NULL | 1–10 |
| `social_battery` | INT | NULL | 1–10 |
| `notes` | VARCHAR(1000) | NULL | Optional free-text |
| `created_at` | TIMESTAMP_NTZ | NOW | Check-in timestamp |

---

### 4. `activities`

Logged student activities (exercise, hobbies, study sessions, etc.). Feeds into `activity_preferences` in the twin.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | VARCHAR(64) | UUID | **PK** |
| `student_id` | VARCHAR(64) | — | **FK → students** |
| `activity_type` | VARCHAR(64) | — | Category: yoga, coding, reading, etc. |
| `description` | VARCHAR(500) | NULL | Optional free-text description |
| `duration_mins` | INT | NULL | Duration in minutes |
| `created_at` | TIMESTAMP_NTZ | NOW | |

---

### 5. `twin_snapshots`

The Emotional Digital Twin — one living row per student, updated on every ingestion.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `student_id` | VARCHAR(64) | — | **PK, FK → students** |
| `display_name` | VARCHAR(128) | NULL | Denormalized for fast reads |
| `twin_embedding` | VARIANT | NULL | 768-d Cortex embedding |
| `emotion_distribution` | VARIANT | NULL | `{"joy":0.3, …}` |
| `top_themes` | VARIANT | NULL | JSON array of theme strings |
| `activity_preferences` | VARIANT | NULL | JSON array |
| `mood_stability` | FLOAT | 0 | 0–100 percentage |
| `social_energy` | FLOAT | 0 | 0–100 percentage |
| `shared_values_tags` | VARIANT | NULL | JSON array |
| `schedule_overlap` | FLOAT | 0 | 0–1 fraction |
| `version` | INT | 1 | Incremented on each update |
| `last_updated` | TIMESTAMP_NTZ | NOW | Last twin rebuild time |

---

### 6. `matches`

Recommendation results with student feedback.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | VARCHAR(64) | UUID | **PK** |
| `student_a` | VARCHAR(64) | — | **FK → students** (requester) |
| `student_b` | VARCHAR(64) | — | **FK → students** (peer) |
| `score` | FLOAT | NULL | Compatibility 0–100 |
| `explanation` | VARCHAR(2000) | NULL | Human-readable "why you match" |
| `icebreaker` | VARCHAR(500) | NULL | Suggested conversation starter |
| `accepted` | BOOLEAN | NULL | NULL = pending, TRUE/FALSE = acted |
| `created_at` | TIMESTAMP_NTZ | NOW | |

---

### 7. `blocks`

Peer-level blocks. Blocked students are excluded from recommendations.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | VARCHAR(64) | UUID | **PK** |
| `blocker_id` | VARCHAR(64) | — | **FK → students** |
| `blocked_id` | VARCHAR(64) | — | **FK → students** |
| `created_at` | TIMESTAMP_NTZ | NOW | |

---

### 8. `safety_reports`

Moderation reports filed by students.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | VARCHAR(64) | UUID | **PK** |
| `reporter_id` | VARCHAR(64) | — | **FK → students** |
| `reported_id` | VARCHAR(64) | — | **FK → students** |
| `reason` | VARCHAR(1000) | — | Required description |
| `category` | VARCHAR(32) | 'OTHER' | BLOCK · HARASSMENT · SPAM · OTHER |
| `resolved` | BOOLEAN | FALSE | |
| `resolved_by` | VARCHAR(64) | NULL | Admin who resolved |
| `resolved_at` | TIMESTAMP_NTZ | NULL | Resolution timestamp |
| `created_at` | TIMESTAMP_NTZ | NOW | |

---

### 9. `onboarding_responses`

Captures the full onboarding wizard submission so it can be replayed or audited.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | VARCHAR(64) | UUID | **PK** |
| `student_id` | VARCHAR(64) | — | **FK → students** |
| `selected_mood` | VARCHAR(32) | NULL | Initial mood pick |
| `energy_level` | INT | NULL | 1–10 |
| `social_battery` | INT | NULL | 1–10 |
| `activities` | VARIANT | NULL | JSON array of chosen activities |
| `values` | VARIANT | NULL | JSON array of chosen values |
| `journal_text` | VARCHAR(5000) | NULL | First journal entry text |
| `completed_at` | TIMESTAMP_NTZ | NOW | |

---

### 10. `notifications`

In-app notification feed.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | VARCHAR(64) | UUID | **PK** |
| `student_id` | VARCHAR(64) | — | **FK → students** |
| `type` | VARCHAR(32) | — | MATCH · SYSTEM · SAFETY |
| `title` | VARCHAR(256) | NULL | Notification headline |
| `body` | VARCHAR(1000) | NULL | Notification body text |
| `read` | BOOLEAN | FALSE | |
| `created_at` | TIMESTAMP_NTZ | NOW | |

---

## Notes

- All VARIANT columns store JSON. Use `PARSE_JSON()` on write, access with `:key` or `GET_PATH()` on read.
- Snowflake foreign keys are **informational only** (not enforced). The application layer validates referential integrity.
- `twin_snapshots.twin_embedding` can be cast to `VECTOR(FLOAT, 768)` for `VECTOR_COSINE_SIMILARITY` searches.
- Journal text is stored encrypted at rest (`text_encrypted`). The column name is intentional as a reminder.
