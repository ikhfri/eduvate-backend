// backend/src/routes/quizRoutes.js
const express = require("express");
const quizController = require("../controllers/quizController");
const { authorizeRole } = require("../middleware/authMiddleware");
const router = express.Router();

// === ADMIN & MENTOR ROUTES ===

// --- /api/quizzes ---
// (Koleksi Kuis - Admin/Mentor)
router
  .route("/")
  .post(authorizeRole(["ADMIN", "MENTOR"]), quizController.createQuiz)
  .get(authorizeRole(["ADMIN", "MENTOR"]), quizController.getAllQuizzesAdmin)
  // Placeholder untuk metode lain pada koleksi kuis (jika diperlukan)
  .put(authorizeRole(["ADMIN", "MENTOR"]), quizController.handleNotImplemented)
  .delete(
    authorizeRole(["ADMIN", "MENTOR"]),
    quizController.handleNotImplemented
  )
  .patch(
    authorizeRole(["ADMIN", "MENTOR"]),
    quizController.handleNotImplemented
  )
  .options(quizController.handleOptions)
  .head(quizController.handleNotImplemented);

// --- /api/quizzes/:quizId ---
// (Satu Kuis Spesifik - Admin/Mentor)
router
  .route("/:quizId")
  .get(authorizeRole(["ADMIN", "MENTOR"]), quizController.getQuizByIdAdmin)
  .put(authorizeRole(["ADMIN", "MENTOR"]), quizController.updateQuiz)
  .patch(authorizeRole(["ADMIN", "MENTOR"]), quizController.patchQuiz)
  .delete(authorizeRole(["ADMIN", "MENTOR"]), quizController.deleteQuiz)
  .post(authorizeRole(["ADMIN", "MENTOR"]), quizController.handleNotImplemented) // POST ke kuis spesifik tidak umum
  .options(quizController.handleOptions)
  .head(quizController.handleNotImplemented);

// --- /api/quizzes/:quizId/questions ---
// (Koleksi Soal dalam Satu Kuis - Admin/Mentor)
router
  .route("/:quizId/questions")
  .post(authorizeRole(["ADMIN", "MENTOR"]), quizController.addQuestionToQuiz)
  .get(
    authorizeRole(["ADMIN", "MENTOR"]),
    quizController.getQuestionsForQuizAdmin
  )
  .put(authorizeRole(["ADMIN", "MENTOR"]), quizController.handleNotImplemented) // Bulk update soal?
  .delete(
    authorizeRole(["ADMIN", "MENTOR"]),
    quizController.handleNotImplemented
  ) // Bulk delete soal?
  .patch(
    authorizeRole(["ADMIN", "MENTOR"]),
    quizController.handleNotImplemented
  )
  .options(quizController.handleOptions)
  .head(quizController.handleNotImplemented);

// --- /api/quizzes/:quizId/questions/:questionId ---
// (Satu Soal Spesifik dalam Kuis - Admin/Mentor)
router
  .route("/:quizId/questions/:questionId")
  .get(authorizeRole(["ADMIN", "MENTOR"]), quizController.handleNotImplemented) // Admin bisa lihat detail soal via getQuestionsForQuizAdmin
  .put(authorizeRole(["ADMIN", "MENTOR"]), quizController.updateQuestion)
  .patch(authorizeRole(["ADMIN", "MENTOR"]), quizController.patchQuestion)
  .delete(authorizeRole(["ADMIN", "MENTOR"]), quizController.deleteQuestion)
  .post(authorizeRole(["ADMIN", "MENTOR"]), quizController.handleNotImplemented)
  .options(quizController.handleOptions)
  .head(quizController.handleNotImplemented);

// --- /api/quizzes/:quizId/results ---
// (Hasil dan Ranking Kuis - Admin/Mentor)
router
  .route("/:quizId/results")
  .get(
    authorizeRole(["ADMIN", "MENTOR"]),
    quizController.getQuizResultsAndRanking
  )
  .post(authorizeRole(["ADMIN", "MENTOR"]), quizController.handleNotImplemented)
  .put(authorizeRole(["ADMIN", "MENTOR"]), quizController.handleNotImplemented)
  .delete(
    authorizeRole(["ADMIN", "MENTOR"]),
    quizController.handleNotImplemented
  )
  .patch(
    authorizeRole(["ADMIN", "MENTOR"]),
    quizController.handleNotImplemented
  )
  .options(quizController.handleOptions)
  .head(quizController.handleNotImplemented);

// === STUDENT ROUTES ===

// --- /api/quizzes (GET - untuk siswa) ---
// (Siswa melihat daftar kuis yang tersedia)
// Perlu cara untuk membedakan GET ini dari GET admin. Bisa dengan query param atau path berbeda.
// Untuk sekarang, kita akan membuat path yang sedikit berbeda untuk siswa.
// Perbaikan di quizRoutes.js (atau file serupa di backend)

router.get("/available" ,quizController.getAvailableQuizzesForStudent);

// --- /api/quizzes/:quizId/take ---
// (Siswa mengambil detail kuis untuk dikerjakan)
// Menggunakan sub-path '/take' agar jelas bedanya dengan GET admin untuk kuis spesifik
router
  .route("/:quizId/take")
  .get(authorizeRole(["STUDENT"]), quizController.getQuizForStudentToTake)
  .post(authorizeRole(["STUDENT"]), quizController.handleNotImplemented) // Tidak ada POST di sini
  .put(authorizeRole(["STUDENT"]), quizController.handleNotImplemented)
  .delete(authorizeRole(["STUDENT"]), quizController.handleNotImplemented)
  .patch(authorizeRole(["STUDENT"]), quizController.handleNotImplemented)
  .options(quizController.handleOptions)
  .head(quizController.handleNotImplemented);

// --- /api/quizzes/:quizId/attempt ---
// (Siswa mengirimkan jawaban kuis)
router
  .route("/:quizId/attempt")
  .post(authorizeRole(["STUDENT"]), quizController.submitQuizAttempt)
  .get(authorizeRole(["STUDENT"]), quizController.getMyQuizAttemptResult) // GET untuk melihat hasil attempt sendiri
  .put(authorizeRole(["STUDENT"]), quizController.handleNotImplemented) // Tidak ada PUT di sini
  .delete(authorizeRole(["STUDENT"]), quizController.handleNotImplemented)
  .patch(authorizeRole(["STUDENT"]), quizController.handleNotImplemented)
  .options(quizController.handleOptions)
  .head(quizController.handleNotImplemented);

module.exports = router;
