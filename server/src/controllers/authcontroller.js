const User = require("../user.js");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const crypto = require("crypto");

const MAX_LOGIN_FAILURES = Number(process.env.MAX_LOGIN_FAILURES || 5);
const LOCKOUT_MINUTES = Number(process.env.LOCKOUT_MINUTES || 15);
const MAX_ACTIVE_SESSIONS = Number(process.env.MAX_ACTIVE_SESSIONS || 3);
const TOKEN_TTL_MS = 60 * 60 * 1000;
const clientUrl = () =>
  process.env.CLIENT_URL?.split(",")[0].trim() ||
  (process.env.NODE_ENV === "production"
    ? "https://vio-ai-iota.vercel.app"
    : "http://localhost:3000");
const passwordResetUrl = (token) => {
  const url = new URL("/reset-password", clientUrl());
  url.searchParams.set("token", token);
  return url.toString();
};
const hashToken = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");
const createToken = () => crypto.randomBytes(32).toString("hex");
const createVerificationCode = () => String(crypto.randomInt(100000, 1000000));
const normalizeVerificationCode = (value) =>
  String(value || "").replace(/\D/g, "");
const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (character) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
      character
    ],
  );
const deviceFor = (req) =>
  (req.get("user-agent") || "Unknown device").slice(0, 240);
const ipFor = (req) => req.ip || req.socket.remoteAddress || "unknown";
const passwordError = (password) => {
  if (typeof password !== "string" || password.length < 10)
    return "Password must be at least 10 characters";
  if (
    !/[A-Z]/.test(password) ||
    !/[a-z]/.test(password) ||
    !/[0-9]/.test(password) ||
    !/[^A-Za-z0-9]/.test(password)
  )
    return "Password must include uppercase, lowercase, number, and special character";
  return null;
};
const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  emailVerified: Boolean(user.emailVerifiedAt),
});
const cookieAttributes =
  process.env.NODE_ENV === "production"
    ? "SameSite=None; Secure"
    : "SameSite=Lax";
const setAuthCookie = (res, token) =>
  res.setHeader(
    "Set-Cookie",
    `access_token=${encodeURIComponent(token)}; Max-Age=604800; Path=/; HttpOnly; ${cookieAttributes}`,
  );
const clearAuthCookie = (res) =>
  res.setHeader(
    "Set-Cookie",
    `access_token=; Max-Age=0; Path=/; HttpOnly; ${cookieAttributes}`,
  );
const deliverSecurityEmail = async (to, subject, url, code) => {
  const webhookUrl = process.env.GMAIL_WEBHOOK_URL?.trim();
  const webhookSecret = process.env.GMAIL_WEBHOOK_SECRET;
  if (!webhookUrl || !webhookSecret) {
    const error = new Error(
      "GMAIL_WEBHOOK_URL and GMAIL_WEBHOOK_SECRET are required for security email delivery",
    );
    error.publicMessage =
      "Email delivery is not configured on the live server. Add the Gmail webhook settings in Render.";
    throw error;
  }

  const text = code
    ? `Your VioAI verification code is: ${code}\n\nThis code expires in one hour.`
    : `Use this secure VioAI link: ${url}\n\nThis link expires in one hour and can only be used once.`;
  const html = code
    ? `<p>Your VioAI verification code is: <strong>${escapeHtml(code)}</strong></p><p>This code expires in one hour.</p>`
    : `<p>Use this secure VioAI link:</p><p><a href="${escapeHtml(url)}">Reset your VioAI password</a></p><p>This link expires in one hour and can only be used once.</p>`;
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      secret: webhookSecret,
      to,
      subject,
      text,
      html,
    }),
    signal: AbortSignal.timeout(15000),
  });
  const responseText = await response.text();
  let result = {};
  try {
    result = JSON.parse(responseText);
  } catch {
    result.error = `Webhook returned a non-JSON response (${response.status})`;
  }
  if (!response.ok || !result.sent) {
    console.error("Gmail webhook delivery failed:", response.status, result.error || "unknown error");
    const error = new Error(result.error || `Gmail webhook delivery failed: ${response.status}`);
    error.code = result.error === "Unauthorized" || response.status === 401
      ? "EAUTH"
      : "EDELIVERY";
    if (error.code === "EAUTH") {
      error.publicMessage =
        "Gmail webhook authorization failed. Make sure Render GMAIL_WEBHOOK_SECRET exactly matches Apps Script WEBHOOK_SECRET.";
    } else if (response.status === 404) {
      error.publicMessage =
        "Gmail webhook deployment was not found. Redeploy the Apps Script as a public Web app and update GMAIL_WEBHOOK_URL in Render.";
    }
    throw error;
  }
};
const sendVerificationEmail = async (user, rawToken) => {
  await deliverSecurityEmail(
    user.email,
    "Verify your VioAI email",
    null,
    rawToken,
  );
};
const requireDatabase = (res) => {
  if (mongoose.connection.readyState === 1) return true;
  res
    .status(503)
    .json({ message: "Database is unavailable. Please try again shortly." });
  return false;
};

const createSession = async (user, req, res) => {
  const rawSessionId = createToken();
  user.sessions = user.sessions.filter((session) => !session.revokedAt);
  while (user.sessions.length >= MAX_ACTIVE_SESSIONS) {
    const oldest = user.sessions
      .sort((a, b) => a.lastActiveAt - b.lastActiveAt)
      .shift();
    oldest.revokedAt = new Date();
  }
  user.sessions.push({
    sessionHash: hashToken(rawSessionId),
    device: deviceFor(req),
    ipAddress: ipFor(req),
  });
  const session = user.sessions[user.sessions.length - 1];
  user.activityHistory.push({
    type: "login",
    success: true,
    device: deviceFor(req),
    ipAddress: ipFor(req),
  });
  user.activityHistory = user.activityHistory.slice(-100);
  await user.save();
  setAuthCookie(
    res,
    jwt.sign(
      { userId: user._id.toString(), sessionId: rawSessionId },
      process.env.JWT_SECRET || "your_jwt_secret_key",
      { expiresIn: "7d" },
    ),
  );
};

const register = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1)
      return res.status(503).json({ message: "Database is unavailable." });
    const { name, email, password } = req.body;
    const normalizedEmail = String(email || "")
      .trim()
      .toLowerCase();
    if (!name || !normalizedEmail || !password)
      return res.status(400).json({ message: "All fields are required" });
    const validationError = passwordError(password);
    if (validationError)
      return res.status(400).json({ message: validationError });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail))
      return res.status(400).json({ message: "Enter a valid email address" });
    if (await User.exists({ email: normalizedEmail }))
      return res.status(400).json({ message: "Email already in use" });
    const rawToken = createVerificationCode();
    const user = new User({
      name: String(name).trim(),
      email: normalizedEmail,
      password,
      emailVerificationTokenHash: hashToken(rawToken),
      emailVerificationExpiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    });
    user.activityHistory.push({
      type: "registration",
      device: deviceFor(req),
      ipAddress: ipFor(req),
    });
    await user.save();
    await sendVerificationEmail(user, rawToken);
    res
      .status(201)
      .json({
        message: "Account created. Check your email for the verification code.",
        email: normalizedEmail,
      });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

const login = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1)
      return res.status(503).json({ message: "Database is unavailable." });
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();
    const { password } = req.body;
    if (!email || !password)
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    const user = await User.findOne({ email }).select("+password");
    if (!user) return res.status(401).json({ message: "Invalid credentials" });
    if (user.lockedUntil && user.lockedUntil > new Date())
      return res
        .status(423)
        .json({ message: "Account temporarily locked. Try again later." });
    if (!(await user.comparePassword(password))) {
      user.failedLoginAttempts += 1;
      user.activityHistory.push({
        type: "login",
        success: false,
        device: deviceFor(req),
        ipAddress: ipFor(req),
      });
      if (user.failedLoginAttempts >= MAX_LOGIN_FAILURES) {
        user.lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
        user.securityAlerts.push({
          type: "failed-login-lockout",
          message:
            "Your account was locked after repeated failed login attempts.",
        });
      }
      user.activityHistory = user.activityHistory.slice(-100);
      await user.save();
      return res.status(401).json({ message: "Invalid credentials" });
    }
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    await createSession(user, req, res);
    res
      .status(200)
      .json({ message: "Login successful", user: publicUser(user) });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

const verifyEmail = async (req, res) => {
  const email = String(req.body.email || req.query.email || "")
    .trim()
    .toLowerCase();
  const code = normalizeVerificationCode(
    req.body.code || req.body.verificationCode || req.query.code,
  );
  const user = await User.findOne({ email }).select(
    "+emailVerificationTokenHash",
  );
  if (
    !user ||
    user.emailVerificationTokenHash !== hashToken(code) ||
    !user.emailVerificationExpiresAt ||
    user.emailVerificationExpiresAt < new Date()
  )
    return res
      .status(400)
      .json({ message: "Verification code is invalid or expired." });
  user.emailVerifiedAt = new Date();
  user.emailVerificationTokenHash = null;
  user.emailVerificationExpiresAt = null;
  await user.save();
  res.json({ message: "Email verified. You can now sign in." });
};

const resendVerificationCode = async (req, res) => {
  try {
    if (!requireDatabase(res)) return;
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();
    const user = await User.findOne({ email }).select(
      "+emailVerificationTokenHash",
    );
    if (!user || user.emailVerifiedAt)
      return res.status(400).json({ message: "Unable to resend verification code." });
    const code = createVerificationCode();
    user.emailVerificationTokenHash = hashToken(code);
    user.emailVerificationExpiresAt = new Date(Date.now() + TOKEN_TTL_MS);
    await user.save();
    await sendVerificationEmail(user, code);
    res.json({ message: "A new verification code has been sent." });
  } catch (err) {
    console.error("Verification email resend error:", err);
    res.status(503).json({ message: "We could not send a new verification code right now." });
  }
};

const logout = async (req, res) => {
  const user = await User.findById(req.userId);
  const session = user?.sessions.id(req.sessionId);
  if (session) session.revokedAt = new Date();
  if (user) await user.save();
  clearAuthCookie(res);
  res.json({ message: "Logged out" });
};
const requestPasswordReset = async (req, res) => {
  try {
    if (!requireDatabase(res)) return;
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ message: "Enter a valid email address" });
    const user = await User.findOne({ email }).select(
      "+passwordResetTokenHash",
    );
    if (!user)
      return res
        .status(404)
        .json({ message: "No account was found for this email address." });
    const rawToken = createToken();
    user.passwordResetTokenHash = hashToken(rawToken);
    user.passwordResetExpiresAt = new Date(Date.now() + TOKEN_TTL_MS);
    await user.save();
    await deliverSecurityEmail(
      email,
      "Reset your VioAI password",
      passwordResetUrl(rawToken),
    );
    res.json({
      sent: true,
      message: "Check your email. Password reset instructions have been sent.",
    });
  } catch (err) {
    console.error("Password reset email error:", err.message);
    res
      .status(503)
      .json({
        message:
          err.code === "EAUTH"
            ? err.publicMessage ||
              "Gmail webhook authorization failed. Check GMAIL_WEBHOOK_SECRET in Render."
            : ["ETIMEDOUT", "ECONNECTION", "ESOCKET", "ENETUNREACH"].includes(
                  err.code,
                )
              ? "The live server could not reach the Gmail webhook. Check GMAIL_WEBHOOK_URL in Render."
            : err.publicMessage ||
              "We could not send the reset email right now. Please try again shortly.",
      });
  }
};
const resetPassword = async (req, res) => {
  if (!requireDatabase(res)) return;
  const { token, password, confirmPassword } = req.body;
  const normalizedToken = String(token || "").trim();
  if (!normalizedToken)
    return res
      .status(400)
      .json({ message: "Reset link is invalid or expired." });
  if (password !== confirmPassword)
    return res.status(400).json({ message: "Passwords do not match" });
  const validationError = passwordError(password);
  if (validationError)
    return res.status(400).json({ message: validationError });
  const user = await User.findOne({
    passwordResetTokenHash: hashToken(normalizedToken),
  }).select("+passwordResetTokenHash");
  if (
    !user ||
    !user.passwordResetExpiresAt ||
    user.passwordResetExpiresAt < new Date()
  )
    return res
      .status(400)
      .json({ message: "Reset link is invalid or expired." });
  user.password = password;
  user.passwordResetTokenHash = null;
  user.passwordResetExpiresAt = null;
  user.sessions.forEach((session) => {
    session.revokedAt = new Date();
  });
  await user.save();
  res.json({ message: "Password updated. Please sign in again." });
};
const updatePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const validationError = passwordError(newPassword);
  if (validationError)
    return res.status(400).json({ message: validationError });
  const user = await User.findById(req.userId).select("+password");
  if (!user || !(await user.comparePassword(currentPassword)))
    return res.status(400).json({ message: "Current password is incorrect" });
  user.password = newPassword;
  user.sessions.forEach((session) => {
    if (session._id.toString() !== req.sessionId)
      session.revokedAt = new Date();
  });
  await user.save();
  res.json({ message: "Password updated" });
};
const getSecurityData = async (req, res) => {
  const user = await User.findById(req.userId).select(
    "sessions activityHistory securityAlerts emailVerifiedAt",
  );
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json({
    sessions: user.sessions
      .filter((session) => !session.revokedAt)
      .map((session) => ({
        id: session._id,
        device: session.device,
        ipAddress: session.ipAddress,
        createdAt: session.createdAt,
        lastActiveAt: session.lastActiveAt,
        current: session._id.toString() === req.sessionId,
      })),
    activityHistory: user.activityHistory.slice().reverse(),
    securityAlerts: user.securityAlerts.slice().reverse(),
  });
};
const revokeSession = async (req, res) => {
  const user = await User.findById(req.userId);
  const session = user?.sessions.id(req.params.sessionId);
  if (!session) return res.status(404).json({ message: "Session not found" });
  session.revokedAt = new Date();
  await user.save();
  if (req.params.sessionId === req.sessionId) clearAuthCookie(res);
  res.json({ message: "Session terminated" });
};
const getMe = async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ message: "User not found" });
  res.status(200).json({ user: publicUser(user) });
};

module.exports = {
  register,
  login,
  verifyEmail,
  resendVerificationCode,
  logout,
  requestPasswordReset,
  resetPassword,
  updatePassword,
  getSecurityData,
  revokeSession,
  getMe,
};
