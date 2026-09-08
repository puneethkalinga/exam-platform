import pg from "pg";
const { Client } = pg;

export default async function handler(req, res) {
  const reqUrl = req.url || "/";
  const targetPath = reqUrl.startsWith("/api") ? reqUrl : `/api${reqUrl}`;

  // Internal admin action to reset attempts and toggle draft status
  if (targetPath.startsWith("/api/internal/reset-test-attempt") && req.method === "POST") {
    const { secret, rollNumbers, examId, setDraft } = req.body || {};
    if (secret !== "XevotechSecretKey2026") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const client = new Client({
      connectionString: "postgresql://exam_platform_ysc9_user:6Pn4TK83cE98S3fk0kzzxcvUO7CCpL07@dpg-daaq4fs9v7es739ihri0-a.oregon-postgres.render.com/exam_platform_ysc9?sslmode=require",
      ssl: { rejectUnauthorized: false }
    });

    try {
      await client.connect();

      const out = {};

      // 1. Set exam(s) to draft
      if (setDraft && examId) {
        const examRes = await client.query(
          "UPDATE exams SET status = 'draft', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, title, status",
          [examId]
        );
        out.updatedExam = examRes.rows;
      }

      // 2. Delete test attempts and answers for the roll numbers
      const rolls = Array.isArray(rollNumbers) ? rollNumbers : (rollNumbers ? [rollNumbers] : []);
      if (rolls.length > 0 && examId) {
        // Delete answers
        const delAns = await client.query(
          "DELETE FROM answers WHERE attempt_id IN (SELECT a.id FROM attempts a JOIN candidates c ON c.id = a.candidate_id WHERE c.roll_number = ANY($1) AND a.exam_id = $2) RETURNING id",
          [rolls, examId]
        );
        out.deletedAnswers = delAns.rowCount;

        // Delete attempts
        const delAtt = await client.query(
          "DELETE FROM attempts WHERE candidate_id IN (SELECT id FROM candidates WHERE roll_number = ANY($1)) AND exam_id = $2 RETURNING id",
          [rolls, examId]
        );
        out.deletedAttempts = delAtt.rowCount;

        // Delete candidate record if no other attempts exist
        for (const r of rolls) {
          const remAtt = await client.query(
            "SELECT id FROM attempts WHERE candidate_id IN (SELECT id FROM candidates WHERE roll_number = $1)",
            [r]
          );
          if (remAtt.rowCount === 0) {
            await client.query("DELETE FROM candidates WHERE roll_number = $1", [r]);
            out.deletedCandidate = r;
          }
        }
      }

      // 3. Current exam results verification
      const curResults = await client.query(`
        SELECT a.id as attempt_id, c.roll_number, c.name, a.status 
        FROM attempts a 
        JOIN candidates c ON c.id = a.candidate_id 
        WHERE a.exam_id = $1
      `, [examId || 23]);
      out.remainingAttempts = curResults.rows;

      // 4. Current exam status
      const curExam = await client.query("SELECT id, title, status FROM exams WHERE id = $1", [examId || 23]);
      out.currentExam = curExam.rows[0];

      await client.end();
      return res.json({ success: true, out });
    } catch (dbErr) {
      console.error("DB error in internal handler:", dbErr);
      try { await client.end(); } catch {}
      return res.status(500).json({ success: false, error: dbErr.message });
    }
  }

  const targetUrl = `https://exam-platform-qhk8.onrender.com${targetPath}`;

  const headers = {};
  for (const [key, value] of Object.entries(req.headers || {})) {
    if (key.toLowerCase() !== "host") {
      headers[key] = value;
    }
  }
  // Set origin to an allowed origin on the Render backend
  headers["origin"] = "https://exam-platform-inky-nine.vercel.app";

  try {
    const fetchOptions = {
      method: req.method,
      headers,
    };

    if (req.method !== "GET" && req.method !== "HEAD") {
      if (req.body) {
        fetchOptions.body = typeof req.body === "object" ? JSON.stringify(req.body) : req.body;
      }
    }

    const response = await fetch(targetUrl, fetchOptions);

    res.status(response.status);
    response.headers.forEach((val, key) => {
      const lowerKey = key.toLowerCase();
      if (!["content-encoding", "transfer-encoding", "content-length"].includes(lowerKey)) {
        res.setHeader(key, val);
      }
    });

    const data = await response.arrayBuffer();
    res.send(Buffer.from(data));
  } catch (err) {
    console.error("Proxy error:", err);
    if (!res.headersSent) {
      res.status(502).json({ message: "Server is waking up. Please wait 10 seconds and try again." });
    }
  }
}
