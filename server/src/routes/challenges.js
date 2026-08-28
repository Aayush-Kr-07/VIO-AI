const express = require("express");
const { protect } = require("../middleware/auth.js");
const { authorize } = require("../middleware/rbac.js");
const { PERMISSIONS } = require("../config/rbac.js");
const { listChallenges, submitChallenge, leaderboard } = require("../controllers/challengecontroller.js");

const router = express.Router();
router.use(protect, authorize(PERMISSIONS.ATTEMPT_CHALLENGES));
router.get("/", listChallenges);
router.get("/leaderboard", leaderboard);
router.post("/:id/submit", submitChallenge);
module.exports = router;
