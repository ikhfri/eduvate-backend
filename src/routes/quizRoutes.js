// backend/src/routes/quizRoutes.js
const express = require("express");
const quizController = require("../controllers/quizController");
const cacheMiddleware = require("../middleware/cachingMiddleware"); // sudah dalam satuan menit
const {
  authenticateToken,
  authorizeRole,
} = require("../middleware/authMiddleware");

const router = express.Router();

// === ADMIN & MENTOR ROUTES ===

// Koleksi Kuis - /api/quizzes
router
  .route("/")
  .post(authorizeRole(["ADMIN", "MENTOR"]), quizController.createQuiz)
  .get(
    authorizeRole(["ADMIN", "MENTOR"]),
    quizController.getAllQuizzesAdmin
  );

// Satu Kuis Spesifik - /api/quizzes/:quizId
router
  .route("/:quizId")
  .get(
    authorizeRole(["ADMIN", "MENTOR"]),
    cacheMiddleware(1), // 1 menit
    quizController.getQuizByIdAdmin
  )
  .put(authorizeRole(["ADMIN", "MENTOR"]), quizController.updateQuiz)
  .patch(authorizeRole(["ADMIN", "MENTOR"]), quizController.patchQuiz)
  .delete(authorizeRole(["ADMIN", "MENTOR"]), quizController.deleteQuiz);

// Koleksi Soal dalam Satu Kuis - /api/quizzes/:quizId/questions
router
  .route("/:quizId/questions")
  .post(authorizeRole(["ADMIN", "MENTOR"]), quizController.addQuestionToQuiz)
  .get(
    authorizeRole(["ADMIN", "MENTOR"]),
    quizController.getQuestionsForQuizAdmin
  );

// Satu Soal Spesifik dalam Kuis - /api/quizzes/:quizId/questions/:questionId
router
  .route("/:quizId/questions/:questionId")
  .put(authorizeRole(["ADMIN", "MENTOR"]), quizController.updateQuestion)
  .delete(authorizeRole(["ADMIN", "MENTOR"]), quizController.deleteQuestion);

// Hasil dan Ranking Kuis - /api/quizzes/:quizId/results
router.route("/:quizId/results").get(
  authorizeRole(["ADMIN", "MENTOR"]),
  quizController.getQuizResultsAndRanking
);

// === STUDENT ROUTES ===

// Melihat daftar kuis yang tersedia - /api/quizzes/available
router.get(
  "/available",
  authenticateToken,
  cacheMiddleware(5), // 5 menit
  quizController.getAvailableQuizzesForStudent
);

// Memulai atau melanjutkan kuis - /api/quizzes/:quizId/take
router.get(
  "/:quizId/take",
  authenticateToken,
  authorizeRole(["STUDENT"]),
  quizController.startOrResumeAttempt
); // ❌ Jangan pakai cache

// Mengirimkan jawaban kuis - /api/quizzes/:quizId/attempt
router.post(
  "/:quizId/attempt",
  authenticateToken,
  authorizeRole(["STUDENT"]),
  quizController.submitQuizAttempt
);

// Melihat hasil attempt sendiri - /api/quizzes/:quizId/attempt
router.get(
  "/:quizId/attempt",
  authenticateToken,
  authorizeRole(["STUDENT"]),
  quizController.getMyQuizAttemptResult
);

// Menyimpan progres pengerjaan kuis
router.patch(
  "/attempts/:attemptId/save-progress",
  authenticateToken,
  quizController.saveAttemptProgress
);

// Lihat semua attempt untuk kuis (admin)
router.get(
  "/:quizId/submissions",
  authenticateToken,
  authorizeRole(["ADMIN", "MENTOR"]),
  quizController.getAttemptsForQuiz
);

// Hapus attempt
router.delete(
  "/attempts/:attemptId",
  authenticateToken,
  authorizeRole(["ADMIN", "MENTOR"]),
  quizController.deleteAttempt
);

module.exports = router;
