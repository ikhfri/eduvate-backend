// backend/src/routes/authRoutes.js
const express = require("express");
const authController = require("../controllers/authController"); // Path disesuaikan

const { authenticateToken } = require("../middleware/authMiddleware"); // Path disesuaikan
const router = express.Router();


router.put("/change-password", authenticateToken, authController.changePassword);
// /api/auth/login
router.post("/login", authController.login);
router.put("/login", authController.putLogin);
router.delete("/login", authController.deleteLogin);
router.patch("/login", authController.patchLogin);
router.options("/login", authController.optionsLogin);
router.head("/login", authController.headLogin);

// /api/auth/me
router.get("/me", authenticateToken, authController.getCurrentUser);
router.post("/me", authenticateToken, authController.postMe);
router.put("/me", authenticateToken, authController.putMe);
router.delete("/me", authenticateToken, authController.deleteMe);
router.patch("/me", authenticateToken, authController.patchMe);
router.options("/me", authenticateToken, authController.optionsMe);
router.head("/me", authenticateToken, authController.headMe);


module.exports = router;
