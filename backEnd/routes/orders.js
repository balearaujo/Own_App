const express = require('express');
const db = require('../../db');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();


router.post('/', requireAuth, async (req, res) => {
  const { type, toneId } = req.body;

  
  const [tones] = await db.query('SELECT id, name, hex FROM user_tones WHERE user_id = ?', [req.userId]);
  if (!tones.length) return res.status(400).json({ error: 'Primero haz el test de colorimetría.' }); //revisa q este el tono

  let tone = null;
  if (type === 'refill') {
    // el tono debe ser el que el user pude
    tone = tones.find(t => t.id === Number(toneId));
    if (!tone) return res.status(400).json({ error: 'Tono inválido.' });
  } else if (type !== 'kit') {
    return res.status(400).json({ error: 'Tipo de pedido inválido.' });
  }

  const [result] = await db.query(
    'INSERT INTO orders (user_id, type, user_tone_id, tone_name, tone_hex) VALUES (?, ?, ?, ?, ?)',
    [req.userId, type, tone?.id ?? null, tone?.name ?? null, tone?.hex ?? null]
  );
  res.status(201).json({ id: result.insertId, message: 'Tu pedido ha sido realizado' });
});

// GET /api/orders → "Mis pedidos"
router.get('/', requireAuth, async (req, res) => {
  const [rows] = await db.query(
    `SELECT id, type, tone_name, tone_hex, created_at
     FROM orders WHERE user_id = ? ORDER BY id DESC`, [req.userId]);
  res.json(rows);
});

module.exports = router;