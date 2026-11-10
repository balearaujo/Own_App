const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../../db');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

function startSession(res, userId) {
  const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.cookie('token', token, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
}


router.post('/register', async (req, res) => {
  const { email, password, privacy } = req.body;
  if (!/^\S+@\S+\.\S+$/.test(email || '')) return res.status(400).json({ error: 'Ingresa un email válido.' });
  if (!password || password.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
  if (privacy !== true) return res.status(400).json({ error: 'Debes aceptar el aviso de privacidad.' });

  const clean = email.trim().toLowerCase();
  const [exists] = await db.query('SELECT id FROM users WHERE email = ?', [clean]);
  if (exists.length) return res.status(409).json({ error: 'Ese email ya tiene una cuenta.' });

  const hash = await bcrypt.hash(password, 10);
  const [result] = await db.query(
    'INSERT INTO users (email, password_hash, privacy_accepted_at) VALUES (?, ?, NOW())',
    [clean, hash]
  );
  startSession(res, result.insertId);
  res.status(201).json({ id: result.insertId, email: clean });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const [rows] = await db.query(
    'SELECT id, email, password_hash FROM users WHERE email = ?',
    [(email || '').trim().toLowerCase()]
  );
  const user = rows[0];
 
  if (!user || !(await bcrypt.compare(password || '', user.password_hash)))
    return res.status(401).json({ error: 'Email o contraseña incorrectos.' });

  startSession(res, user.id);
  res.json({ id: user.id, email: user.email });
});


router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

router.get('/me', requireAuth, async (req, res) => {
  const [rows] = await db.query('SELECT id, email, created_at FROM users WHERE id = ?', [req.userId]);
  res.json(rows[0]);
});

module.exports = router;