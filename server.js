require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const db = require('./db');

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(express.static('frontEnd'));

app.get('/api/health', async (req, res) => {
  const [rows] = await db.query('SELECT COUNT(*) AS categorias FROM categories');
  res.json({ ok: true, categorias: rows[0].categorias });
});

app.use('/api/auth', require('./backEnd/routes/auth'));
app.use('/api/test', require('./backEnd/routes/test'));
app.use('/api/orders', require('./backEnd/routes/orders'));

// Si algo falla, responde en lugar de colgarse
app.use((err, req, res, next) => {
  console.error(err);
  console.error("Error en registro:", err);
  res.status(500).json({ error: 'Error del servidor.' });
});

app.listen(process.env.PORT, () =>
  console.log(`Servidor en http://localhost:${process.env.PORT}`));