const pool = require("../config/db");

/*
  Candidate:
  Log a security event for the current coding attempt
*/
const logSecurityEvent = async (req, res) => {
  try {
    const attemptId = req.codingAttempt.id;
    const { event_type, event_data = {} } = req.body;

    const allowedEvents = [
      "TAB_SWITCH",
      "WINDOW_BLUR",
      "WINDOW_FOCUS",
      "FULLSCREEN_EXIT",
      "COPY_ATTEMPT",
      "PASTE_ATTEMPT",
      "CUT_ATTEMPT",
      "RIGHT_CLICK",
      "PAGE_REFRESH",
      "EXAM_SUBMITTED",
      "EXAM_TIMEOUT",
    ];

    if (!allowedEvents.includes(event_type)) {
      return res.status(400).json({
        message: "Invalid security event type",
      });
    }

    await pool.query(
      `
      INSERT INTO coding_security_events
        (attempt_id, event_type, event_data)
      VALUES
        ($1, $2, $3)
      `,
      [
        attemptId,
        event_type,
        JSON.stringify(event_data || {}),
      ]
    );

    return res.status(201).json({
      message: "Security event recorded",
    });
  } catch (error) {
    console.error("Log security event error:", error);

    return res.status(500).json({
      message: "Failed to record security event",
    });
  }
};


/*
  Candidate/Admin:
  Get security events for one attempt
*/
const getSecurityEvents = async (req, res) => {
  try {
    const attemptId =
      req.codingAttempt?.id ||
      req.params.attemptId;

    if (!attemptId) {
      return res.status(400).json({
        message: "Attempt ID is required",
      });
    }

    const result = await pool.query(
      `
      SELECT
        id,
        attempt_id,
        event_type,
        event_data,
        occurred_at
      FROM coding_security_events
      WHERE attempt_id = $1
      ORDER BY occurred_at DESC
      `,
      [attemptId]
    );

    return res.json({
      events: result.rows,
    });
  } catch (error) {
    console.error("Get security events error:", error);

    return res.status(500).json({
      message: "Failed to fetch security events",
    });
  }
};


/*
  Admin:
  Security events with candidate/exam information
*/
const getAdminSecurityEvents = async (req, res) => {
  try {
    const { attemptId } = req.params;

    if (!attemptId) {
      return res.status(400).json({
        message: "Attempt ID is required",
      });
    }

    const result = await pool.query(
      `
      SELECT
        se.id,
        se.attempt_id,
        se.event_type,
        se.event_data,
        se.occurred_at,

        ca.id AS candidate_id,
        ca.name AS candidate_name,
        ca.roll_number,
        ca.course,

        ce.id AS coding_exam_id,
        ce.title AS coding_exam_title

      FROM coding_security_events se

      JOIN coding_attempts cat
        ON cat.id = se.attempt_id

      JOIN candidates ca
        ON ca.id = cat.candidate_id

      JOIN coding_exams ce
        ON ce.id = cat.coding_exam_id

      WHERE se.attempt_id = $1

      ORDER BY se.occurred_at DESC
      `,
      [attemptId]
    );

    return res.json({
      events: result.rows,
    });
  } catch (error) {
    console.error("Get admin security events error:", error);

    return res.status(500).json({
      message: "Failed to fetch security events",
    });
  }
};


module.exports = {
  logSecurityEvent,
  getSecurityEvents,
  getAdminSecurityEvents,
};