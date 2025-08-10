// Buat file baru: D:\backend_lms\src\routes\materialRoutes.js

const express = require("express");
const materialController = require("../controllers/materialController");
const {
  authenticateToken,
  authorizeRole,
} = require("../middleware/authMiddleware");

const router = express.Router();

// GET /api/materials - Semua pengguna yang login bisa melihat
router.get("/", authenticateToken, materialController.getAllMaterials);

// POST /api/materials - Hanya Admin/Mentor yang bisa membuat
router.post(
  "/",
  authenticateToken,
  authorizeRole(["ADMIN", "MENTOR"]),
  materialController.createMaterial
);

// DELETE /api/materials/:materialId - Hanya Admin/Mentor yang bisa menghapus
router.delete(
  "/:materialId",
  authenticateToken,
  authorizeRole(["ADMIN", "MENTOR"]),
  materialController.deleteMaterial
);

router.put(
  "/:materialId",
  authenticateToken,
  authorizeRole(["ADMIN", "MENTOR"]),
  materialController.updateMaterial
);

module.exports = router;
