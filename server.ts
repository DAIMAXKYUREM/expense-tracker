import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import admin from 'firebase-admin';
// Removed .ts extension for Vercel resolution
import pool, { initDb } from './db.js';

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'iiit-bbsr-secret-key';

// Initialize Firebase Admin (Only if not already initialized)
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || 'gen-lang-client-0754245976'
  });
}

// Global Middleware
app.use(cors());
app.use(express.json());

// Background database initialization safeguard
let isDbInitialized = false;
const ensureDb = async () => {
  if (!isDbInitialized) {
    try {
      await initDb();
      isDbInitialized = true;
    } catch (err) {
      console.error('Database connection failed:', err);
      throw err;
    }
  }
};

// Middleware to verify JWT
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: 'Forbidden' });
    req.user = user;
    next();
  });
};

// --- AUTH ROUTES ---

app.post('/api/auth/register', async (req, res) => {
  await ensureDb();
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
        'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id',
        [email, hashedPassword]
    );
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email } });
  } catch (err: any) {
    if (err.code === '23505') {
      res.status(400).json({ error: 'Email already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

app.post('/api/auth/login', async (req, res) => {
  await ensureDb();
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user || !user.password || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- EXPENSE ROUTES ---

app.get('/api/expenses', authenticateToken, async (req: any, res) => {
  await ensureDb();
  try {
    const result = await pool.query(`
      SELECT e.*, c.name as category_name, c.color as category_color 
      FROM expenses e 
      JOIN categories c ON e.category_id = c.id 
      WHERE e.user_id = $1 
      ORDER BY e.date DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/expenses', authenticateToken, async (req: any, res) => {
  await ensureDb();
  const { category_id, amount, description, date } = req.body;
  try {
    const result = await pool.query(`
      INSERT INTO expenses (user_id, category_id, amount, description, date) 
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [req.user.id, category_id, amount, description, date]);

    const newExpense = await pool.query(`
      SELECT e.*, c.name as category_name, c.color as category_color 
      FROM expenses e 
      JOIN categories c ON e.category_id = c.id 
      WHERE e.id = $1
    `, [result.rows[0].id]);

    res.json(newExpense.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/expenses/:id', authenticateToken, async (req: any, res) => {
  await ensureDb();
  try {
    const result = await pool.query('DELETE FROM expenses WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Expense not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- SETTINGS & BUDGETS ---

app.get('/api/user/settings', authenticateToken, async (req: any, res) => {
  await ensureDb();
  try {
    const result = await pool.query('SELECT salary, daily_budget, monthly_budget, yearly_budget FROM users WHERE id = $1', [req.user.id]);
    res.json(result.rows[0] || { salary: 0, daily_budget: 0, monthly_budget: 0, yearly_budget: 0 });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/user/settings', authenticateToken, async (req: any, res) => {
  await ensureDb();
  const { salary, daily_budget, monthly_budget, yearly_budget } = req.body;
  try {
    await pool.query(`
      UPDATE users 
      SET salary = $1, daily_budget = $2, monthly_budget = $3, yearly_budget = $4 
      WHERE id = $5
    `, [salary || 0, daily_budget || 0, monthly_budget || 0, yearly_budget || 0, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/categories', async (req, res) => {
  await ensureDb();
  try {
    const result = await pool.query('SELECT * FROM categories');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- STATIC FILES & VITE ---

if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));

  app.get('*', (req, res) => {
    // Only serve index.html for non-API requests
    if (!req.path.startsWith('/api/')) {
      res.sendFile(path.join(distPath, 'index.html'));
    } else {
      res.status(404).json({ error: 'API endpoint not found' });
    }
  });
} else {
  (async () => {
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.error('Vite init failed:', e);
    }
  })();
}

export default app;
