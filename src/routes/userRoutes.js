
const express = require("express");
const userController = require("../controllers/userController");
const authController = require("../controllers/authController");

const {
  authenticateToken,
  authorizeRole,
} = require("../middleware/authMiddleware");


const router = express.Router();

router.put("/profile", authenticateToken, userController.updateUserProfile);

router.get(
  "/",
  authenticateToken,
  authorizeRole(["ADMIN"]),
  userController.getAllUsers
);

router.put(
  "/:userId/role",
  authenticateToken,
  authorizeRole(["ADMIN"]),
  userController.updateUserRole
);

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
