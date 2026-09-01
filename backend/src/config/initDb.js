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
        year VARCHAR(50) NOT NULL,
        section VARCHAR(50) NOT NULL,
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

            ALTER TABLE attempts
      ADD COLUMN IF NOT EXISTS total_marks NUMERIC(10,2) DEFAULT 0;

      ALTER TABLE attempts
      ADD COLUMN IF NOT EXISTS obtained_marks NUMERIC(10,2) DEFAULT 0;

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