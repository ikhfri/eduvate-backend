
const express = require("express");
const router = express.Router();
const { authorizeRole } = require("../middleware/authMiddleware");

const statsController = require("../controllers/statsController");
const { authenticateToken } = require("../middleware/authMiddleware");

router.get("/",authorizeRole(["ADMIN", "MENTOR", "STUDENT"]), authenticateToken, statsController.getDashboardStats);
router.get(
  "/my-stats",
  authorizeRole(["ADMIN", "MENTOR", "STUDENT"]),
  authenticateToken,
  statsController.getStudentStats
);

router.get(
  "/detailed",
  authenticateToken,
  authorizeRole(["ADMIN", "MENTOR"]),
  statsController.getDetailedStats
);

module.exports = router;
