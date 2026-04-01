const jwt = require('jsonwebtoken');
const { sql } = require('../db/pool');

async function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Авторизация қажет' });
  }
  const token = authHeader.slice(7);
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (e) {
    return res.status(401).json({ error: 'Токен жарамсыз' });
  }
  try {
    const rows = await sql`
      SELECT id FROM sessions
      WHERE token = ${token} AND expires_at > NOW()
    `;
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Сессия мерзімі өтті, қайта кіріңіз' });
    }
  } catch (e) {
    console.error('Session check error:', e);
    return res.status(500).json({ error: 'Сервер қатесі' });
  }
  req.user = decoded;
  next();
}

function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Авторизация қажет' });
    // Admin has access to everything
    if (req.user.role === 'admin') return next();
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Рұқсат жоқ' });
    }
    next();
  };
}

module.exports = { verifyToken, requireRole };
