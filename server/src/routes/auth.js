const express = require('express');
const { register, login, verifyEmail, logout, requestPasswordReset, resetPassword, updatePassword, getSecurityData, revokeSession, getMe } = require('../controllers/authcontroller.js');
const { protect } = require('../middleware/auth.js');
const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/verify-email', verifyEmail);
router.post('/verify-email', verifyEmail);
router.post('/forgot-password', requestPasswordReset);
router.post('/reset-password', resetPassword);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);
router.post('/password', protect, updatePassword);
router.get('/security', protect, getSecurityData);
router.delete('/sessions/:sessionId', protect, revokeSession);

module.exports = router;