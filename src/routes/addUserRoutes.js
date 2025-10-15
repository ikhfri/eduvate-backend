const express = require("express");
const authController = require("../controllers/authController"); 
const { authorizeRole } = require("../middleware/authMiddleware");

const { authenticateToken } = require("../middleware/authMiddleware"); 
const router = express.Router();

router.post(
  "/add-user",
  authorizeRole(["ADMIN"]),
  authenticateToken,
  authController.register
);

