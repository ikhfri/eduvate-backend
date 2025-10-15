
const express = require("express");
const materialController = require("../controllers/materialController");
const {
  authenticateToken,
  authorizeRole,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", authenticateToken, materialController.getAllMaterials);

router.post(
  "/",
  authenticateToken,
  authorizeRole(["ADMIN", "MENTOR"]),
  materialController.createMaterial
);

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
