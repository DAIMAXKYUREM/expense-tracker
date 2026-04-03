import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

export const initDb = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        firebase_uid TEXT UNIQUE,
        password TEXT,
        salary REAL DEFAULT 0,
        daily_budget REAL DEFAULT 0,
        monthly_budget REAL DEFAULT 0,
        yearly_budget REAL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        color TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        category_id INTEGER NOT NULL REFERENCES categories(id),
        amount REAL NOT NULL,
        description TEXT,
        date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS budgets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        category_id INTEGER NOT NULL REFERENCES categories(id),
        amount REAL NOT NULL,
        month INTEGER NOT NULL,
        year INTEGER NOT NULL,
        UNIQUE(user_id, category_id, month, year)
      );
    `);

    // Seed categories
    const res = await client.query('SELECT count(*) FROM categories');
    if (parseInt(res.rows[0].count) === 0) {
      const defaultCategories = [
        ['Food', '#ef4444'],
        ['Transport', '#3b82f6'],
        ['Shopping', '#ec4899'],
        ['Entertainment', '#8b5cf6'],
        ['Health', '#10b981'],
        ['Utilities', '#f59e0b'],
        ['Other', '#64748b']
      ];
      for (const [name, color] of defaultCategories) {
        await client.query('INSERT INTO categories (name, color) VALUES ($1, $2)', [name, color]);
      }
    }
  } finally {
    client.release();
  }
};

export default pool;
