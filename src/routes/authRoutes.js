// backend/src/routes/authRoutes.js
const express = require("express");
const authController = require("../controllers/authController"); // Path disesuaikan

const { authenticateToken } = require("../middleware/authMiddleware"); // Path disesuaikan
const router = express.Router();


router.put("/change-password", authenticateToken, authController.changePassword);
// /api/auth/login
router.post("/login", authController.login);

// /api/auth/me
router.get("/me", authenticateToken, authController.getCurrentUser);



module.exports = router;
