// Rate limiter: IP-based, stored in memory Map
const loginAttempts = new Map(); // IP -> { count, resetTime }
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60 * 1000; // 1 minute

// Clean up old entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of loginAttempts.entries()) {
    if (now > data.resetTime) loginAttempts.delete(ip);
  }
}, WINDOW_MS);

function loginRateLimiter(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  let record = loginAttempts.get(ip);

  if (!record || now > record.resetTime) {
    record = { count: 1, resetTime: now + WINDOW_MS };
    loginAttempts.set(ip, record);
    return next();
  }

  record.count++;
  if (record.count > MAX_ATTEMPTS) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);
    return res.status(429).json({
      error: `Тым көп сұраныс. ${retryAfter} секундтан кейін қайталаңыз.`,
      retryAfter
    });
  }
  next();
}

module.exports = { loginRateLimiter };
