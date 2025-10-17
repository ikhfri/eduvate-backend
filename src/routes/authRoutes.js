const express = require("express");
const authController = require("../controllers/authController"); 

const { authenticateToken } = require("../middleware/authMiddleware"); 
const router = express.Router();


router.put("/change-password", authenticateToken, authController.changePassword);
router.post("/login", authController.login);

router.get("/me", authenticateToken, authController.getCurrentUser);



module.exports = router;
