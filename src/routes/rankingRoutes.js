// D:\backend_lms\src\routes\rankingRoutes.js

const express = require("express");
const rankingController = require("../controllers/rankingController");
const {
  authenticateToken,
  authorizeRole,
} = require("../middleware/authMiddleware");

const router = express.Router();

// Semua route di file ini akan berada di bawah /api/rankings

// GET /api/rankings/top-students
// Bisa diakses semua peran, logika visibilitas untuk siswa ada di dalam controller.
router.get(
  "/top-students",
  authenticateToken,
  rankingController.getTopStudentsRanking
);

// POST /api/rankings/reveal - Mengumumkan peringkat (Hanya Admin/Mentor)
router.post(
  "/reveal",
  authenticateToken,
  authorizeRole(["ADMIN", "MENTOR"]),
  rankingController.revealRanking
);

// POST /api/rankings/hide - Menyembunyikan peringkat (Hanya Admin/Mentor)
router.post(
  "/hide",
  authenticateToken,
  authorizeRole(["ADMIN", "MENTOR"]),
  rankingController.hideRanking
);

module.exports = router;
