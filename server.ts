import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import admin from 'firebase-admin';
import pool, { initDb } from './db.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'your-fallback-secret';

const app = express();
const PORT = 3000;

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || 'gen-lang-client-0754245976'
  });
}

// Database initialization flag
let dbInitialized = false;

async function ensureDb() {
  if (!dbInitialized) {
    await initDb();
    dbInitialized = true;
  }
}

app.use(cors());
app.use(express.json());

// Middleware to ensure DB is initialized
app.use(async (req, res, next) => {
  try {
    await ensureDb();
    next();
  } catch (err) {
    console.error('DB initialization error:', err);
    res.status(500).json({ error: 'Database initialization failed' });
  }
});

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

  // Auth Routes
  app.post('/api/auth/register', async (req, res) => {
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
      console.error('Register error:', err);
      if (err.code === '23505') { // Unique constraint violation in Postgres
        res.status(400).json({ error: 'Email already exists' });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  app.post('/api/auth/login', async (req, res) => {
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
      console.error('Login error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Firebase Google Auth
  app.post('/api/auth/firebase', async (req, res) => {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: 'ID Token required' });

    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const { email, uid } = decodedToken;

      let result = await pool.query('SELECT * FROM users WHERE firebase_uid = $1 OR email = $2', [uid, email]);
      let user = result.rows[0];

      if (!user) {
        result = await pool.query(
          'INSERT INTO users (email, firebase_uid) VALUES ($1, $2) RETURNING id',
          [email, uid]
        );
        user = result.rows[0];
      } else if (!user.firebase_uid) {
        await pool.query('UPDATE users SET firebase_uid = $1 WHERE id = $2', [uid, user.id]);
      }

      const token = jwt.sign({ id: user.id, email }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ token, user: { id: user.id, email } });
    } catch (err) {
      console.error('Firebase auth error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Expense Routes
  app.get('/api/expenses', authenticateToken, async (req: any, res) => {
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
      console.error('Get expenses error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/expenses', authenticateToken, async (req: any, res) => {
    const { category_id, amount, description, date } = req.body;
    if (!category_id || amount === undefined || amount === null || !date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

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
      console.error('Add expense error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.put('/api/expenses/:id', authenticateToken, async (req: any, res) => {
    const { id } = req.params;
    const { category_id, amount, description, date } = req.body;

    try {
      const result = await pool.query(`
        UPDATE expenses 
        SET category_id = $1, amount = $2, description = $3, date = $4 
        WHERE id = $5 AND user_id = $6
      `, [category_id, amount, description, date, id, req.user.id]);

      if (result.rowCount === 0) return res.status(404).json({ error: 'Expense not found' });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.delete('/api/expenses/:id', authenticateToken, async (req: any, res) => {
    const { id } = req.params;
    try {
      const result = await pool.query('DELETE FROM expenses WHERE id = $1 AND user_id = $2', [id, req.user.id]);
      if (result.rowCount === 0) return res.status(404).json({ error: 'Expense not found' });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Categories Route
  app.get('/api/categories', async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM categories');
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // User Settings Routes
  app.get('/api/user/settings', authenticateToken, async (req: any, res) => {
    try {
      const result = await pool.query('SELECT salary, daily_budget, monthly_budget, yearly_budget FROM users WHERE id = $1', [req.user.id]);
      const user = result.rows[0];
      res.json(user || { salary: 0, daily_budget: 0, monthly_budget: 0, yearly_budget: 0 });
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.put('/api/user/settings', authenticateToken, async (req: any, res) => {
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

  // Budget Routes
  app.get('/api/budgets', authenticateToken, async (req: any, res) => {
    const { month, year } = req.query;
    if (!month || !year) return res.status(400).json({ error: 'Month and year required' });

    try {
      const result = await pool.query(`
        SELECT b.*, c.name as category_name, c.color as category_color 
        FROM budgets b 
        JOIN categories c ON b.category_id = c.id 
        WHERE b.user_id = $1 AND b.month = $2 AND b.year = $3
      `, [req.user.id, month, year]);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/budgets', authenticateToken, async (req: any, res) => {
    const { category_id, amount, month, year } = req.body;
    if (!category_id || amount === undefined || !month || !year) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
      const result = await pool.query(`
        INSERT INTO budgets (user_id, category_id, amount, month, year) 
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT(user_id, category_id, month, year) 
        DO UPDATE SET amount = EXCLUDED.amount
        RETURNING id
      `, [req.user.id, category_id, amount, month, year]);

      res.json({ success: true, id: result.rows[0].id });
    } catch (err) {
      console.error('Save budget error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Catch-all for unknown API routes
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: `API route ${req.method} ${req.url} not found` });
  });

  // Global error handler
  app.use((err: any, req: any, res: any, next: any) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  });

// Vite middleware for development
async function setupVite() {
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

await setupVite();

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
