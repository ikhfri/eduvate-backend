const express = require("express");
const attendanceController = require("../controllers/attendanceController");
const {
  authenticateToken,
  authorizeRole,
} = require("../middleware/authMiddleware");

const router = express.Router();

// --- STUDENT ROUTE ---
router.post(
  "/request-leave",
  authenticateToken,
  authorizeRole(["STUDENT"]),
  attendanceController.requestLeave
);

// --- ADMIN/MENTOR ROUTES ---
router.post(
  "/mark",
  authenticateToken,
  authorizeRole(["ADMIN", "MENTOR"]),
  attendanceController.markAttendance
);
router.get(
  "/recap",
  authenticateToken,
  authorizeRole(["ADMIN", "MENTOR"]),
  attendanceController.getWeeklyRecap
);
router.get(
  "/student/:studentId",
  authenticateToken,
  authorizeRole(["ADMIN", "MENTOR"]),
  attendanceController.getAttendanceHistoryByStudent
);

// [BARU] Route untuk ekspor
router.get(
  "/recap/export",
  authenticateToken,
  authorizeRole(["ADMIN", "MENTOR"]),
  attendanceController.exportWeeklyRecap
);
router.get(
  "/student/:studentId/export",
  authenticateToken,
  authorizeRole(["ADMIN", "MENTOR"]),
  attendanceController.exportStudentHistory
);
router.get(
  "/daily-recap", // <- Tambahkan endpoint ini
  authenticateToken,
  authorizeRole(["ADMIN", "MENTOR"]),
  attendanceController.getDailyRecap
);

router.post(
  "/qr-check-in", // Endpoint baru kita
  authenticateToken,
  authorizeRole(["ADMIN", "MENTOR"]),
  attendanceController.checkInByQR
);

module.exports = router;
