const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  try {
    req.userId = jwt.verify(req.cookies.token, process.env.JWT_SECRET).id;
    next();
  } catch {
    res.status(401).json({ error: 'No has iniciado sesión.' });
  }
};