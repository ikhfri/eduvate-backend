// D:\backend_lms\src\routes\userRoutes.js

const express = require("express");
const userController = require("../controllers/userController");
const authController = require("../controllers/authController"); // Path disesuaikan

// FIX: Menggabungkan impor dari middleware yang sama
const {
  authenticateToken,
  authorizeRole,
} = require("../middleware/authMiddleware");

// FIX: Menghapus baris 'require("..")' yang menyebabkan impor melingkar
// const { route } = require("..");

const router = express.Router();

// Route untuk update profil pengguna yang sedang login
router.put("/profile", authenticateToken, userController.updateUserProfile);

// Route untuk admin mendapatkan semua pengguna
router.get(
  "/",
  authenticateToken,
  authorizeRole(["ADMIN"]),
  userController.getAllUsers
);

// Route untuk admin mengubah peran pengguna
router.put(
  "/:userId/role",
  authenticateToken,
  authorizeRole(["ADMIN"]),
  userController.updateUserRole
);

// FIX: Menghapus duplikasi route delete
// Route untuk admin menghapus pengguna
router.delete(
  "/:userId",
  authenticateToken,
  authorizeRole(["ADMIN"]),
  userController.deleteUser
);

router.post(
  "/add",
  authorizeRole(["ADMIN"]),
  authenticateToken,
  authController.register
);


module.exports = router;
