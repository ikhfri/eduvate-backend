const express = require("express");
const attendanceController = require("../controllers/attendanceController");
const {
  authenticateToken,
  authorizeRole,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.post(
  "/request-leave",
  authenticateToken,
  authorizeRole(["STUDENT"]),
  attendanceController.requestLeave
);

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
  "/daily-recap", 
  authenticateToken,
  authorizeRole(["ADMIN", "MENTOR"]),
  attendanceController.getDailyRecap
);

router.post(
  "/qr-check-in",
  authenticateToken,
  authorizeRole(["ADMIN", "MENTOR"]),
  attendanceController.checkInWithQR
);

module.exports = router;
