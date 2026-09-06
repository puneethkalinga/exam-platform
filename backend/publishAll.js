const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://exam_platform_ysc9_user:6Pn4TK83cE98S3fk0kzzxcvUO7CCpL07@dpg-daaq4fs9v7es739ihri0-a.oregon-postgres.render.com/exam_platform_ysc9?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  console.log('Connecting to database to publish all recruitment exams...');

  const r1 = await client.query(
    "UPDATE exams SET status = 'published', updated_at = CURRENT_TIMESTAMP WHERE id IN (17, 23, 24) RETURNING id, title, status"
  );
  console.log('Published MCQ Exams:', r1.rows);

  const r2 = await client.query(
    "UPDATE coding_exams SET status = 'published', updated_at = CURRENT_TIMESTAMP WHERE id = 2 RETURNING id, title, status"
  );
  console.log('Published Coding Exams:', r2.rows);

  await client.end();
  console.log('All 4 recruitment exams are now LIVE and PUBLISHED.');
}

main().catch(err => {
  console.error('Error publishing exams:', err);
  client.end();
});
