const { hasPermission, isValidRole } = require("../config/rbac.js");

const authorize = (...permissions) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Authentication required" });
  if (!isValidRole(req.user.role)) {
    return res.status(403).json({ message: "Your account has no valid platform role" });
  }
  if (!permissions.every((permission) => hasPermission(req.user.role, permission))) {
    return res.status(403).json({ message: "You do not have permission to access this resource" });
  }
  next();
};

const allowRoles = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Authentication required" });
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: "Your role cannot access this resource" });
  }
  next();
};

module.exports = { authorize, allowRoles };