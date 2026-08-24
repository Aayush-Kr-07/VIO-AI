const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../user.js');

const getCookie = (req, name) => {
  const cookies = (req.headers.cookie || '').split(';');
  const match = cookies.find((cookie) => cookie.trim().startsWith(`${name}=`));
  return match ? decodeURIComponent(match.trim().slice(name.length + 1)) : null;
};

const protect = async (req, res, next) => {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ')
    ? header.slice(7)
    : getCookie(req, 'access_token');

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key');
    const user = await User.findById(decoded.userId).select('+password +emailVerificationTokenHash +passwordResetTokenHash');
    const session = user?.sessions.find((candidate) => candidate.sessionHash === crypto.createHash('sha256').update(decoded.sessionId).digest('hex'));
    if (!user || !session || session.revokedAt || session.lastActiveAt < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) {
      return res.status(401).json({ message: 'Session expired or revoked' });
    }
    session.lastActiveAt = new Date();
    await user.save();
    req.userId = decoded.userId;
    req.sessionId = session._id.toString();
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

module.exports = { protect };