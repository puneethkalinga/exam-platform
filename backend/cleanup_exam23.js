const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://exam_platform_ysc9_user:6Pn4TK83cE98S3fk0kzzxcvUO7CCpL07@dpg-daaq4fs9v7es739ihri0-a.oregon-postgres.render.com/exam_platform_ysc9?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();

  console.log('--- Current Exam Statuses ---');
  const exams = await client.query('SELECT id, title, status FROM exams ORDER BY id');
  console.log(exams.rows);

  console.log('\n--- Current Attempts on Exam 23 ---');
  const attempts = await client.query(`
    SELECT a.id as attempt_id, a.exam_id, a.candidate_id, a.status, a.started_at, a.submitted_at,
           c.name, c.roll_number, c.course
    FROM attempts a
    JOIN candidates c ON c.id = a.candidate_id
    WHERE a.exam_id = 23
  `);
  console.log(attempts.rows);

  await client.end();
}

main().catch(err => {
  console.error(err);
  client.end();
});
