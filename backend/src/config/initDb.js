const pool = require("./db");

const createTables = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS exams (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        duration_minutes INTEGER NOT NULL,
        cutoff_percentage NUMERIC(5,2) DEFAULT 0,
        status VARCHAR(20) DEFAULT 'draft',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS questions (
        id SERIAL PRIMARY KEY,
        exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
        question_text TEXT NOT NULL,
        option_a TEXT NOT NULL,
        option_b TEXT NOT NULL,
        option_c TEXT NOT NULL,
        option_d TEXT NOT NULL,
        correct_answer CHAR(1) NOT NULL,
        marks NUMERIC(5,2) DEFAULT 1,
        category VARCHAR(100),
        difficulty VARCHAR(50),
        question_order INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS candidates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        roll_number VARCHAR(100) NOT NULL,
        year VARCHAR(50),
        section VARCHAR(50),
        course VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS attempts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
        candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
        started_at TIMESTAMP,
        submitted_at TIMESTAMP,
        status VARCHAR(30) DEFAULT 'in_progress',
        score NUMERIC(10,2) DEFAULT 0,
        percentage NUMERIC(5,2) DEFAULT 0,
        shortlisted BOOLEAN DEFAULT FALSE
      );

      CREATE TABLE IF NOT EXISTS answers (
        id SERIAL PRIMARY KEY,
        attempt_id UUID NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
        question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
        selected_answer CHAR(1),
        is_correct BOOLEAN DEFAULT FALSE,
        marks_obtained NUMERIC(5,2) DEFAULT 0,
        answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(attempt_id, question_id)
      );

      CREATE TABLE IF NOT EXISTS security_events (
        id SERIAL PRIMARY KEY,
        attempt_id UUID NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
        event_type VARCHAR(50) NOT NULL,
        question_number INTEGER,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) DEFAULT 'admin',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- CODING EXAMS
-- ============================================

CREATE TABLE IF NOT EXISTS coding_exams (
    id SERIAL PRIMARY KEY,

    title VARCHAR(255) NOT NULL,
    description TEXT,

    duration_minutes INTEGER NOT NULL DEFAULT 60,
    total_marks NUMERIC(10,2) NOT NULL DEFAULT 100,

    allowed_languages JSONB NOT NULL DEFAULT '["c","cpp","java","python"]',

    instructions TEXT,

    status VARCHAR(30) NOT NULL DEFAULT 'draft',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ============================================
-- CODING QUESTIONS
-- ============================================

CREATE TABLE IF NOT EXISTS coding_questions (
    id SERIAL PRIMARY KEY,

    coding_exam_id INTEGER NOT NULL
        REFERENCES coding_exams(id)
        ON DELETE CASCADE,

    title VARCHAR(255) NOT NULL,

    description TEXT NOT NULL,

    input_format TEXT,
    output_format TEXT,
    constraints TEXT,

    sample_input TEXT,
    sample_output TEXT,
    explanation TEXT,

    marks NUMERIC(10,2) NOT NULL DEFAULT 10,

    time_limit_ms INTEGER DEFAULT 2000,
    memory_limit_mb INTEGER DEFAULT 128,

    display_order INTEGER NOT NULL DEFAULT 1,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ============================================
-- TEST CASES
-- ============================================

CREATE TABLE IF NOT EXISTS coding_test_cases (
    id SERIAL PRIMARY KEY,

    question_id INTEGER NOT NULL
        REFERENCES coding_questions(id)
        ON DELETE CASCADE,

    input TEXT NOT NULL,
    expected_output TEXT NOT NULL,

    is_hidden BOOLEAN NOT NULL DEFAULT TRUE,

    marks NUMERIC(10,2),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ============================================
-- CODING ATTEMPTS
-- ============================================

CREATE TABLE IF NOT EXISTS coding_attempts (
    id SERIAL PRIMARY KEY,

    coding_exam_id INTEGER NOT NULL
        REFERENCES coding_exams(id)
        ON DELETE CASCADE,

    candidate_id INTEGER NOT NULL
        REFERENCES candidates(id)
        ON DELETE CASCADE,

    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ends_at TIMESTAMP NOT NULL,

    submitted_at TIMESTAMP,

    status VARCHAR(30) NOT NULL DEFAULT 'in_progress',

    total_score NUMERIC(10,2) DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ============================================
-- CODING DRAFTS
-- ============================================

CREATE TABLE IF NOT EXISTS coding_drafts (
    id SERIAL PRIMARY KEY,

    attempt_id INTEGER NOT NULL
        REFERENCES coding_attempts(id)
        ON DELETE CASCADE,

    question_id INTEGER NOT NULL
        REFERENCES coding_questions(id)
        ON DELETE CASCADE,

    language VARCHAR(30) NOT NULL,

    source_code TEXT NOT NULL DEFAULT '',

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(attempt_id, question_id)
);


-- ============================================
-- CODING SUBMISSIONS
-- ============================================

CREATE TABLE IF NOT EXISTS coding_submissions (
    id SERIAL PRIMARY KEY,

    attempt_id INTEGER NOT NULL
        REFERENCES coding_attempts(id)
        ON DELETE CASCADE,

    question_id INTEGER NOT NULL
        REFERENCES coding_questions(id)
        ON DELETE CASCADE,

    language VARCHAR(30) NOT NULL,

    source_code TEXT NOT NULL,

    status VARCHAR(50),

    passed_tests INTEGER DEFAULT 0,
    total_tests INTEGER DEFAULT 0,

    marks_obtained NUMERIC(10,2) DEFAULT 0,

    execution_time_ms INTEGER,
    memory_used_kb INTEGER,

    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS coding_security_events (
    id SERIAL PRIMARY KEY,
    attempt_id INTEGER NOT NULL
        REFERENCES coding_attempts(id)
        ON DELETE CASCADE,

    event_type VARCHAR(50) NOT NULL,

    event_data JSONB DEFAULT '{}'::jsonb,

    occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS coding_invitations (
    id SERIAL PRIMARY KEY,

    coding_exam_id INTEGER NOT NULL
        REFERENCES coding_exams(id)
        ON DELETE CASCADE,

    candidate_id INTEGER NOT NULL
        REFERENCES candidates(id)
        ON DELETE CASCADE,

    invitation_token VARCHAR(128) NOT NULL UNIQUE,

    status VARCHAR(30) NOT NULL DEFAULT 'active',

    expires_at TIMESTAMP,

    used_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_coding_invitations_candidate
ON coding_invitations(candidate_id);

CREATE INDEX IF NOT EXISTS idx_coding_invitations_exam
ON coding_invitations(coding_exam_id);

CREATE INDEX IF NOT EXISTS idx_coding_invitations_token
ON coding_invitations(invitation_token);

CREATE INDEX IF NOT EXISTS idx_coding_security_events_attempt
ON coding_security_events(attempt_id);

CREATE INDEX IF NOT EXISTS idx_coding_security_events_type
ON coding_security_events(event_type);

      CREATE INDEX IF NOT EXISTS idx_questions_exam
        ON questions(exam_id);

      CREATE INDEX IF NOT EXISTS idx_attempts_exam
        ON attempts(exam_id);

      CREATE INDEX IF NOT EXISTS idx_attempts_candidate
        ON attempts(candidate_id);

      CREATE INDEX IF NOT EXISTS idx_answers_attempt
        ON answers(attempt_id);

      CREATE INDEX IF NOT EXISTS idx_security_attempt
        ON security_events(attempt_id);

      CREATE INDEX IF NOT EXISTS idx_coding_submissions_attempt_question
ON coding_submissions(attempt_id, question_id);

            ALTER TABLE attempts
      ADD COLUMN IF NOT EXISTS total_marks NUMERIC(10,2) DEFAULT 0;

      ALTER TABLE attempts
      ADD COLUMN IF NOT EXISTS obtained_marks NUMERIC(10,2) DEFAULT 0;

ALTER TABLE coding_attempts
ADD COLUMN IF NOT EXISTS access_token VARCHAR(128) UNIQUE;

ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS course VARCHAR(100);

ALTER TABLE candidates
ALTER COLUMN year DROP NOT NULL;


ALTER TABLE candidates
ALTER COLUMN section DROP NOT NULL;

      ALTER TABLE attempts
      ADD COLUMN IF NOT EXISTS result_status VARCHAR(30);
    `);

    console.log("✅ Database tables created successfully");
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    process.exit(1);
  }
};

createTables();