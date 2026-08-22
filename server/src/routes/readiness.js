const express = require("express");
const { protect } = require("../middleware/auth.js");
const { calculateReadiness, getReadiness } = require("../controllers/readinesscontroller.js");

const router = express.Router();
router.use(protect);
router.get("/", getReadiness);
router.post("/calculate", calculateReadiness);

module.exports = router;
