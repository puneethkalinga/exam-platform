const pool = require("../config/db");

const authenticateCodingAttempt = async (
  req,
  res,
  next
) => {
  try {
    const authHeader =
      req.headers.authorization || "";

    if (
      !authHeader.startsWith("Bearer ")
    ) {
      return res.status(401).json({
        message:
          "Coding exam authorization required",
      });
    }

    const token =
      authHeader.substring(7).trim();

    if (!token) {
      return res.status(401).json({
        message:
          "Invalid coding exam token",
      });
    }

    const { attemptId } =
      req.params;

    if (!attemptId) {
      return res.status(400).json({
        message:
          "Coding attempt ID is required",
      });
    }

    const result = await pool.query(
      `
      SELECT
        id,
        coding_exam_id,
        candidate_id,
        status,
        started_at,
        ends_at
      FROM coding_attempts
      WHERE id = $1
        AND access_token = $2
      LIMIT 1
      `,
      [
        attemptId,
        token,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message:
          "Invalid or unauthorized coding attempt",
      });
    }

    const attempt =
      result.rows[0];

    /*
     * Attach verified attempt
     * information to the request.
     *
     * Controllers should trust
     * req.codingAttempt instead of
     * candidate-supplied IDs.
     */
    req.codingAttempt = attempt;

    next();

  } catch (error) {
    console.error(
      "Coding authentication error:",
      error
    );

    return res.status(500).json({
      message:
        "Coding exam authorization failed",
    });
  }
};

module.exports =
  authenticateCodingAttempt;