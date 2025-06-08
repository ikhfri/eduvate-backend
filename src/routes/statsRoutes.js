// D:\backend_lms\src\routes\statsRoutes.js

const express = require("express");
const router = express.Router();
const { authorizeRole } = require("../middleware/authMiddleware");

const statsController = require("../controllers/statsController");
const { authenticateToken } = require("../middleware/authMiddleware");

// Endpoint ini hanya memerlukan pengguna untuk login, tanpa memandang peran.
// GET /api/stats/
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
