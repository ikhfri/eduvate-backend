
const express = require("express");
const rankingController = require("../controllers/rankingController");
const {
  authenticateToken,
  authorizeRole,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.get(
  "/top-students",
  authenticateToken,
  rankingController.getTopStudentsRanking
);

router.post(
  "/reveal",
  authenticateToken,
  authorizeRole(["ADMIN", "MENTOR"]),
  rankingController.revealRanking
);

router.post(
  "/hide",
  authenticateToken,
  authorizeRole(["ADMIN", "MENTOR"]),
  rankingController.hideRanking
);

module.exports = router;
