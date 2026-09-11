import pg from "pg";
const { Client } = pg;

export default async function handler(req, res) {
  const reqUrl = req.url || "/";
  const urlWithoutQuery = reqUrl.split("?")[0];
  const targetPath = urlWithoutQuery.startsWith("/api") ? urlWithoutQuery : `/api${urlWithoutQuery}`;

  // Internal admin action to reset attempts and toggle draft status
  if (targetPath.startsWith("/api/internal/reset-test-attempt") && req.method === "POST") {
    const { secret, rollNumbers, examId, setDraft, action, sql, params } = req.body || {};
    if (secret !== "XevotechSecretKey2026") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const client = new Client({
      connectionString: "postgresql://exam_platform_ysc9_user:6Pn4TK83cE98S3fk0kzzxcvUO7CCpL07@dpg-daaq4fs9v7es739ihri0-a.oregon-postgres.render.com/exam_platform_ysc9?sslmode=require",
      ssl: { rejectUnauthorized: false }
    });

    try {
      await client.connect();

      if (action === "query" && sql) {
        const result = await client.query(sql, params || []);
        await client.end();
        return res.json({ success: true, rows: result.rows, rowCount: result.rowCount });
      }

      const out = {};

      // 1. Set exam(s) to draft
      if (setDraft && examId) {
        const examRes = await client.query(
          "UPDATE exams SET status = 'draft', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, title, status",
          [examId]
        );
        out.updatedExam = examRes.rows;
      }

      // 2. Delete test attempts and answers for the roll numbers across all exams and coding exams
      const rolls = Array.isArray(rollNumbers) ? rollNumbers : (rollNumbers ? [rollNumbers] : []);
      if (rolls.length > 0) {
        // Delete MCQ answers
        const delAns = await client.query(
          "DELETE FROM answers WHERE attempt_id IN (SELECT a.id FROM attempts a JOIN candidates c ON c.id = a.candidate_id WHERE c.roll_number = ANY($1)) RETURNING id",
          [rolls]
        );
        out.deletedAnswers = delAns.rowCount;

        // Delete MCQ attempts
        const delAtt = await client.query(
          "DELETE FROM attempts WHERE candidate_id IN (SELECT id FROM candidates WHERE roll_number = ANY($1)) RETURNING id",
          [rolls]
        );
        out.deletedAttempts = delAtt.rowCount;

        // Delete Coding submissions, drafts, security events, and attempts
        try {
          await client.query(
            "DELETE FROM coding_submissions WHERE attempt_id IN (SELECT id FROM coding_attempts WHERE candidate_id IN (SELECT id FROM candidates WHERE roll_number = ANY($1)))",
            [rolls]
          );
          await client.query(
            "DELETE FROM coding_drafts WHERE attempt_id IN (SELECT id FROM coding_attempts WHERE candidate_id IN (SELECT id FROM candidates WHERE roll_number = ANY($1)))",
            [rolls]
          );
          await client.query(
            "DELETE FROM coding_security_events WHERE attempt_id IN (SELECT id FROM coding_attempts WHERE candidate_id IN (SELECT id FROM candidates WHERE roll_number = ANY($1)))",
            [rolls]
          );
          const delCodingAtt = await client.query(
            "DELETE FROM coding_attempts WHERE candidate_id IN (SELECT id FROM candidates WHERE roll_number = ANY($1)) RETURNING id",
            [rolls]
          );
          out.deletedCodingAttempts = delCodingAtt.rowCount;
        } catch (cErr) {
          out.codingDeleteWarning = cErr.message;
        }

        // Delete candidate records so roll number can be re-registered fresh
        const delCand = await client.query(
          "DELETE FROM candidates WHERE roll_number = ANY($1) RETURNING id, roll_number",
          [rolls]
        );
        out.deletedCandidates = delCand.rows;
      }

      // 3. Verification checks
      const remCandidates = await client.query(
        "SELECT id, name, roll_number FROM candidates WHERE roll_number IN ('XEVO/YEN/T/001', 'XEVO/YEN/T/005')"
      );
      out.remCandidates = remCandidates.rows;

      const remAttempts = await client.query(`
        SELECT a.id, a.exam_id, c.roll_number, c.name, a.status 
        FROM attempts a 
        JOIN candidates c ON c.id = a.candidate_id 
        WHERE a.exam_id IN (17, 23, 24)
      `);
      out.allMcqAttempts = remAttempts.rows;

      try {
        const remCoding = await client.query(`
          SELECT ca.id, ca.coding_exam_id, c.roll_number, c.name, ca.status 
          FROM coding_attempts ca 
          JOIN candidates c ON c.id = ca.candidate_id
        `);
        out.allCodingAttempts = remCoding.rows;
      } catch (e) {
        out.codingQueryWarning = e.message;
      }

      // 4. Current exam statuses
      const allExams = await client.query("SELECT id, title, status FROM exams WHERE id IN (17, 23, 24)");
      out.mcqExams = allExams.rows;

      try {
        const codingExams = await client.query("SELECT id, title, status FROM coding_exams");
        out.codingExams = codingExams.rows;
      } catch (e) {
        out.codingExamsWarning = e.message;
      }

      await client.end();
      return res.json({ success: true, out });
    } catch (dbErr) {
      console.error("DB error in internal handler:", dbErr);
      try { await client.end(); } catch {}
      return res.status(500).json({ success: false, error: dbErr.message });
    }
  }

  // Exam Info pre-check endpoint
  if (targetPath.startsWith("/api/candidates/exam-info/") && req.method === "GET") {
    const examId = targetPath.split("/").pop();
    const client = new Client({
      connectionString: "postgresql://exam_platform_ysc9_user:6Pn4TK83cE98S3fk0kzzxcvUO7CCpL07@dpg-daaq4fs9v7es739ihri0-a.oregon-postgres.render.com/exam_platform_ysc9?sslmode=require",
      ssl: { rejectUnauthorized: false }
    });
    try {
      await client.connect();
      const examRes = await client.query(
        "SELECT id, title, description, duration_minutes, cutoff_percentage, status FROM exams WHERE id = $1",
        [examId]
      );
      await client.end();
      if (examRes.rows.length === 0) {
        return res.status(404).json({ message: "Exam not found" });
      }
      const exam = examRes.rows[0];
      const isNonTechnical =
        /non[-\s]?technical/i.test(exam.title) ||
        /non[-\s]?technical/i.test(exam.description || "");
      return res.json({
        success: true,
        examId: exam.id,
        title: exam.title,
        description: exam.description,
        durationMinutes: exam.duration_minutes,
        isNonTechnical,
        expectedPrefix: isNonTechnical ? "XEVO/YEN/NT/" : "XEVO/YEN/T/"
      });
    } catch (err) {
      try { await client.end(); } catch {}
      return res.status(500).json({ message: err.message });
    }
  }

  // Strict Track Roll Number Enforcement for Candidate Exam Start
  if (targetPath === "/api/candidates/start" && req.method === "POST") {
    let body = req.body;
    if (typeof body === "string") {
      try { body = JSON.parse(body); } catch {}
    }
    body = body || {};
    const { name, rollNumber, course, examId } = body;
    if (!name || !rollNumber || !course || !examId) {
      return res.status(400).json({ message: "Name, roll number, course, and exam ID are required" });
    }

    const cleanRollNumber = String(rollNumber).trim().toUpperCase();

    const client = new Client({
      connectionString: "postgresql://exam_platform_ysc9_user:6Pn4TK83cE98S3fk0kzzxcvUO7CCpL07@dpg-daaq4fs9v7es739ihri0-a.oregon-postgres.render.com/exam_platform_ysc9?sslmode=require",
      ssl: { rejectUnauthorized: false }
    });

    try {
      await client.connect();
      const examRes = await client.query("SELECT id, title, description, status FROM exams WHERE id = $1", [examId]);
      await client.end();

      if (examRes.rows.length === 0) {
        return res.status(404).json({ message: "Exam not found" });
      }

      const exam = examRes.rows[0];
      const isNonTechnical =
        /non[-\s]?technical/i.test(exam.title) ||
        /non[-\s]?technical/i.test(exam.description || "");

      if (isNonTechnical) {
        const ntMatch = cleanRollNumber.match(/^XEVO\/YEN\/NT\/(\d{3})$/);
        if (!ntMatch) {
          if (/^XEVO\/YEN\/T\/\d{3}$/i.test(cleanRollNumber)) {
            return res.status(400).json({
              message: "Invalid roll number. This is a Non-Technical exam. Please use your Non-Technical roll number in the format XEVO/YEN/NT/001 to XEVO/YEN/NT/800."
            });
          }
          return res.status(400).json({
            message: "Invalid roll number. Non-Technical exams require format XEVO/YEN/NT/001 to XEVO/YEN/NT/800."
          });
        }
        const rollNum = Number(ntMatch[1]);
        if (rollNum < 1 || rollNum > 800) {
          return res.status(400).json({
            message: "Invalid roll number. Non-Technical roll number must be between XEVO/YEN/NT/001 and XEVO/YEN/NT/800."
          });
        }
      } else {
        const tMatch = cleanRollNumber.match(/^XEVO\/YEN\/T\/(\d{3})$/);
        if (!tMatch) {
          if (/^XEVO\/YEN\/NT\/\d{3}$/i.test(cleanRollNumber)) {
            return res.status(400).json({
              message: "Invalid roll number. This is a Technical exam. Please use your Technical roll number in the format XEVO/YEN/T/001 to XEVO/YEN/T/800."
            });
          }
          return res.status(400).json({
            message: "Invalid roll number. Technical exams require format XEVO/YEN/T/001 to XEVO/YEN/T/800."
          });
        }
        const rollNum = Number(tMatch[1]);
        if (rollNum < 1 || rollNum > 800) {
          return res.status(400).json({
            message: "Invalid roll number. Technical roll number must be between XEVO/YEN/T/001 and XEVO/YEN/T/800."
          });
        }
      }
    } catch (err) {
      try { await client.end(); } catch {}
      return res.status(500).json({ message: err.message });
    }
  }

  // Strict Track Roll Number Enforcement for Coding Exam Start (Technical only)
  if (targetPath === "/api/coding-attempts/start" && req.method === "POST") {
    let body = req.body;
    if (typeof body === "string") {
      try { body = JSON.parse(body); } catch {}
    }
    body = body || {};
    const cleanRollNumber = String(body.roll_number || body.rollNumber || "").trim().toUpperCase();

    if (!cleanRollNumber) {
      return res.status(400).json({ message: "Roll number is required" });
    }

    const rollMatch = cleanRollNumber.match(/^XEVO\/YEN\/T\/(\d{3})$/);
    if (!rollMatch) {
      if (/^XEVO\/YEN\/NT\/\d{3}$/i.test(cleanRollNumber)) {
        return res.status(400).json({
          message: "Invalid roll number. Coding Assessment is a Technical exam. Please enter your Technical roll number in the format XEVO/YEN/T/001 to XEVO/YEN/T/800."
        });
      }
      return res.status(400).json({
        message: "Invalid roll number. Technical coding exams require format XEVO/YEN/T/001 to XEVO/YEN/T/800."
      });
    }

    const rollNum = Number(rollMatch[1]);
    if (rollNum < 1 || rollNum > 800) {
      return res.status(400).json({
        message: "Invalid roll number. Technical roll number must be between XEVO/YEN/T/001 and XEVO/YEN/T/800."
      });
    }
  }

  const queryParams = new URL(req.url, "http://localhost").searchParams;
  queryParams.delete("match");
  const qs = queryParams.toString();
  const targetUrl = `https://exam-platform-qhk8.onrender.com${targetPath}${qs ? `?${qs}` : ""}`;

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
