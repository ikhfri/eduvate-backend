const express = require("express");
const authController = require("../controllers/authController"); // Path disesuaikan
const { authorizeRole } = require("../middleware/authMiddleware");

const { authenticateToken } = require("../middleware/authMiddleware"); // Path disesuaikan
const router = express.Router();

// /api/auth/register
router.post(
  "/add-user",
  authorizeRole(["ADMIN"]),
  authenticateToken,
  authController.register
);
