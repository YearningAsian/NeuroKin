-- =====================================================================
-- NeuroTwin — Snowflake DDL (fresh install)
-- =====================================================================
-- Run once per environment to bootstrap all required objects.
-- Safe to re-run (CREATE … IF NOT EXISTS / idempotent).
-- =====================================================================

-- 1. Warehouse
CREATE WAREHOUSE IF NOT EXISTS NEUROTWIN_WH
    WITH WAREHOUSE_SIZE = 'XSMALL'
    AUTO_SUSPEND = 60
    AUTO_RESUME  = TRUE;

-- 2. Database & Schema
CREATE DATABASE IF NOT EXISTS NEUROTWIN_DB;
USE DATABASE NEUROTWIN_DB;
CREATE SCHEMA IF NOT EXISTS PUBLIC;
USE SCHEMA PUBLIC;

-- 3. Roles & Grants (run as ACCOUNTADMIN; skip if already set up)
-- CREATE ROLE IF NOT EXISTS NEUROTWIN_APP_ROLE;
-- GRANT USAGE ON DATABASE NEUROTWIN_DB     TO ROLE NEUROTWIN_APP_ROLE;
-- GRANT USAGE ON SCHEMA   NEUROTWIN_DB.PUBLIC TO ROLE NEUROTWIN_APP_ROLE;
-- GRANT ALL   ON ALL TABLES IN SCHEMA NEUROTWIN_DB.PUBLIC TO ROLE NEUROTWIN_APP_ROLE;
-- GRANT USAGE ON WAREHOUSE NEUROTWIN_WH TO ROLE NEUROTWIN_APP_ROLE;
-- CREATE USER IF NOT EXISTS NEUROTWIN_USER PASSWORD='CHANGE_ME' DEFAULT_ROLE=NEUROTWIN_APP_ROLE;
-- GRANT ROLE NEUROTWIN_APP_ROLE TO USER NEUROTWIN_USER;

-- =====================================================================
-- Tables
-- =====================================================================

-- ── students ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS students (
    student_id     VARCHAR(64)   PRIMARY KEY,
    display_name   VARCHAR(128),
    email_hash     VARCHAR(128),
    password_hash  VARCHAR(128),
    school         VARCHAR(256),
    onboarded      BOOLEAN       DEFAULT FALSE,
    created_at     TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    updated_at     TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- ── journal_entries ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS journal_entries (
    id             VARCHAR(64)   DEFAULT UUID_STRING() PRIMARY KEY,
    student_id     VARCHAR(64)   NOT NULL REFERENCES students(student_id),
    text_encrypted VARCHAR(16777216),
    mood_label     VARCHAR(32),
    tags           VARIANT,
    embedding      VARIANT,
    created_at     TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- ── mood_checkins ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mood_checkins (
    id             VARCHAR(64)   DEFAULT UUID_STRING() PRIMARY KEY,
    student_id     VARCHAR(64)   NOT NULL REFERENCES students(student_id),
    mood_label     VARCHAR(32)   NOT NULL,
    energy_level   INT,
    stress_level   INT,
    social_battery INT,
    notes          VARCHAR(1000),
    created_at     TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- ── activities ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activities (
    id             VARCHAR(64)   DEFAULT UUID_STRING() PRIMARY KEY,
    student_id     VARCHAR(64)   NOT NULL REFERENCES students(student_id),
    activity_type  VARCHAR(64)   NOT NULL,
    description    VARCHAR(500),
    duration_mins  INT,
    created_at     TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- ── twin_snapshots ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS twin_snapshots (
    student_id            VARCHAR(64)  PRIMARY KEY REFERENCES students(student_id),
    display_name          VARCHAR(128),
    twin_embedding        VARIANT,
    emotion_distribution  VARIANT,
    top_themes            VARIANT,
    activity_preferences  VARIANT,
    mood_stability        FLOAT        DEFAULT 0,
    social_energy         FLOAT        DEFAULT 0,
    shared_values_tags    VARIANT,
    schedule_overlap      FLOAT        DEFAULT 0,
    version               INT          DEFAULT 1,
    last_updated          TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- ── matches ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS matches (
    id             VARCHAR(64)   DEFAULT UUID_STRING() PRIMARY KEY,
    student_a      VARCHAR(64)   NOT NULL REFERENCES students(student_id),
    student_b      VARCHAR(64)   NOT NULL REFERENCES students(student_id),
    score          FLOAT,
    explanation    VARCHAR(2000),
    icebreaker     VARCHAR(500),
    accepted       BOOLEAN,
    created_at     TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- ── blocks ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blocks (
    id             VARCHAR(64)   DEFAULT UUID_STRING() PRIMARY KEY,
    blocker_id     VARCHAR(64)   NOT NULL REFERENCES students(student_id),
    blocked_id     VARCHAR(64)   NOT NULL REFERENCES students(student_id),
    created_at     TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- ── safety_reports ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS safety_reports (
    id             VARCHAR(64)   DEFAULT UUID_STRING() PRIMARY KEY,
    reporter_id    VARCHAR(64)   NOT NULL REFERENCES students(student_id),
    reported_id    VARCHAR(64)   NOT NULL REFERENCES students(student_id),
    reason         VARCHAR(1000) NOT NULL,
    category       VARCHAR(32)   DEFAULT 'OTHER',
    resolved       BOOLEAN       DEFAULT FALSE,
    resolved_by    VARCHAR(64),
    resolved_at    TIMESTAMP_NTZ,
    created_at     TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- ── onboarding_responses ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS onboarding_responses (
    id             VARCHAR(64)   DEFAULT UUID_STRING() PRIMARY KEY,
    student_id     VARCHAR(64)   NOT NULL REFERENCES students(student_id),
    selected_mood  VARCHAR(32),
    energy_level   INT,
    social_battery INT,
    activities     VARIANT,
    values         VARIANT,
    journal_text   VARCHAR(5000),
    completed_at   TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- ── notifications ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
    id             VARCHAR(64)   DEFAULT UUID_STRING() PRIMARY KEY,
    student_id     VARCHAR(64)   NOT NULL REFERENCES students(student_id),
    type           VARCHAR(32)   NOT NULL,
    title          VARCHAR(256),
    body           VARCHAR(1000),
    read           BOOLEAN       DEFAULT FALSE,
    created_at     TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);
