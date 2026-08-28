const express = require("express");
const { protect } = require("../middleware/auth.js");
const { authorize } = require("../middleware/rbac.js");
const { PERMISSIONS } = require("../config/rbac.js");
const {
  startInterview,
  submitAnswer,
  getInterviews,
  getInterview,
  finishInterview,
  deleteInterview,
} = require("../controllers/interviewcontroller.js");
const router = express.Router();

router.use(protect, authorize(PERMISSIONS.ACCESS_INTERVIEWS));

router.post("/start", startInterview);
router.post("/submit-answer", submitAnswer);
router.post("/finish", finishInterview);
router.delete("/:id", deleteInterview);
router.get("/", getInterviews);
router.get("/:id", getInterview);

module.exports = router;
