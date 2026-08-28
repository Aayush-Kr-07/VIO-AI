const express = require("express");
const { protect } = require("../middleware/auth.js");
const { authorize } = require("../middleware/rbac.js");
const { PERMISSIONS } = require("../config/rbac.js");
const { calculateReadiness, getReadiness } = require("../controllers/readinesscontroller.js");

const router = express.Router();
router.use(protect, authorize(PERMISSIONS.VIEW_OWN_PERFORMANCE));
router.get("/", getReadiness);
router.post("/calculate", calculateReadiness);

module.exports = router;
