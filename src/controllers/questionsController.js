const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/authMiddleware");
const prisma = require("../prismaClient");

router.get("/", authenticateToken, async (req, res) => {
  try {
    const quizzes = await prisma.quiz.findMany();
    res.json(quizzes);
  } catch (error) {
    console.error("Error getAllQuiz:", error);
    res.status(500).json({ message: "Gagal mengambil quiz" });
  }
});

module.exports = router;
