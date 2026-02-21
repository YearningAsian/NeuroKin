-- NeuroKin — Snowflake DDL
-- Run once per environment to bootstrap all required tables.
-- Safe to re-run (CREATE IF NOT EXISTS).

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
