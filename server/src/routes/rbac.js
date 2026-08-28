const express = require("express");
const { protect } = require("../middleware/auth.js");
const { authorize } = require("../middleware/rbac.js");
const { PERMISSIONS } = require("../config/rbac.js");
const { listUsers, updateUserRole, getMentorReports } = require("../controllers/rbaccontroller.js");

const router = express.Router();
router.use(protect);
router.get("/mentor/reports", authorize(PERMISSIONS.REVIEW_REPORTS), getMentorReports);
router.get("/users", authorize(PERMISSIONS.MANAGE_USERS), listUsers);
router.patch("/users/:userId/role", authorize(PERMISSIONS.MANAGE_ROLES), updateUserRole);

module.exports = router;