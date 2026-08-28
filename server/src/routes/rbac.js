const express = require("express");
const { protect } = require("../middleware/auth.js");
const { authorize } = require("../middleware/rbac.js");
const { PERMISSIONS } = require("../config/rbac.js");
const { listUsers, updateUserRole, updateUserStatus, deleteUser, getMentorReports } = require("../controllers/rbaccontroller.js");

const router = express.Router();
router.use(protect);
router.get("/mentor/reports", authorize(PERMISSIONS.REVIEW_REPORTS), getMentorReports);
router.get("/users", authorize(PERMISSIONS.MANAGE_USERS), listUsers);
router.patch("/users/:userId/role", authorize(PERMISSIONS.MANAGE_ROLES), updateUserRole);
router.patch("/users/:userId/status", authorize(PERMISSIONS.MANAGE_USERS), updateUserStatus);
router.delete("/users/:userId", authorize(PERMISSIONS.MANAGE_USERS), deleteUser);

module.exports = router;