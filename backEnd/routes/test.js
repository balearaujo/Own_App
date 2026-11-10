const express = require('express');
const db = require('../../db');
const requireAuth = require('../middleware/requireAuth');
const { isValid, evaluate } = require('../services/colorimetry');

const router = express.Router();

// POST /api/test  → recibe { answers: [0,1,2,...] } y guarda el resultado
router.post('/', requireAuth, async (req, res) => {
  const { answers } = req.body;
  if (!isValid(answers)) return res.status(400).json({ error: 'Respuestas inválidas: se necesitan las 7.' });

  const { scores, category, pending } = evaluate(answers);

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();   // todo se guarda junto, o no se guarda nada

    let categoryId = null;
    if (category) {
      const [cat] = await conn.query('SELECT id FROM categories WHERE name = ?', [category]);
      categoryId = cat[0].id;
    }

    await conn.query(
      `INSERT INTO test_results
        (user_id, answers, score_calida, score_fria, score_neutra, score_luminosa, score_intensa, score_profunda, category_id, pending_reason)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.userId, JSON.stringify(answers), scores.C, scores.F, scores.N, scores.L, scores.I, scores.P, categoryId, pending]
    );

    // Si repitió el test, se reemplazan los tonos anteriores
    await conn.query('DELETE FROM user_tones WHERE user_id = ?', [req.userId]);
    if (categoryId) {
      await conn.query(
        `INSERT INTO user_tones (user_id, position, name, hex)
         SELECT ?, position, name, hex FROM catalog_tones WHERE category_id = ?`,
        [req.userId, categoryId]
      );
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  const [tones] = await db.query(
    'SELECT id, position, name, hex FROM user_tones WHERE user_id = ? ORDER BY position', [req.userId]);
  res.status(201).json({ category, pending, tones });
});

// GET /api/test/result  → último resultado y tonos del usuario
router.get('/result', requireAuth, async (req, res) => {
  const [rows] = await db.query(
    `SELECT c.name AS category, t.pending_reason AS pending
     FROM test_results t LEFT JOIN categories c ON c.id = t.category_id
     WHERE t.user_id = ? ORDER BY t.id DESC LIMIT 1`, [req.userId]);
  if (!rows.length) return res.json({ done: false, category: null, pending: null, tones: [] });

  const [tones] = await db.query(
    'SELECT id, position, name, hex FROM user_tones WHERE user_id = ? ORDER BY position', [req.userId]);
  res.json({ done: true, ...rows[0], tones });
});

module.exports = router;