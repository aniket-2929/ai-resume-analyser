const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('render.com') 
    ? { rejectUnauthorized: false } 
    : false
});

pool.connect()
  .then(() => {
    console.log("✅ PostgreSQL connected");
    return pool.query(`
      CREATE TABLE IF NOT EXISTS analyses (
        id SERIAL PRIMARY KEY,
        resume_text TEXT,
        job_description TEXT,
        result JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
  })
  .then(() => console.log("✅ Table ready"))
  .catch((err) => console.error("❌ DB error:", err.message));

module.exports = pool;