const express = require("express");
const quizController = require("../controllers/quizController");
const cacheMiddleware = require("../middleware/cachingMiddleware"); 
const {
  authenticateToken,
  authorizeRole,
} = require("../middleware/authMiddleware");

const router = express.Router();

router
  .route("/")
  .post(authorizeRole(["ADMIN", "MENTOR"]), quizController.createQuiz)
  .get(
    authorizeRole(["ADMIN", "MENTOR"]),
    quizController.getAllQuizzesAdmin
  );

router
  .route("/:quizId")
  .get(
    authorizeRole(["ADMIN", "MENTOR"]),
    cacheMiddleware(1), 
    quizController.getQuizByIdAdmin
  )
  .put(authorizeRole(["ADMIN", "MENTOR"]), quizController.updateQuiz)
  .patch(authorizeRole(["ADMIN", "MENTOR"]), quizController.patchQuiz)
  .delete(authorizeRole(["ADMIN", "MENTOR"]), quizController.deleteQuiz);

router
  .route("/:quizId/questions")
  .post(authorizeRole(["ADMIN", "MENTOR"]), quizController.addQuestionToQuiz)
  .get(
    authorizeRole(["ADMIN", "MENTOR"]),
    quizController.getQuestionsForQuizAdmin
  );

router
  .route("/:quizId/questions/:questionId")
  .put(authorizeRole(["ADMIN", "MENTOR"]), quizController.updateQuestion)
  .delete(authorizeRole(["ADMIN", "MENTOR"]), quizController.deleteQuestion);

router.route("/:quizId/results").get(
  authorizeRole(["ADMIN", "MENTOR"]),
  quizController.getQuizResultsAndRanking
);


router.get(
  "/available",
  authenticateToken,
  cacheMiddleware(5), 
  quizController.getAvailableQuizzesForStudent
);

router.get(
  "/:quizId/take",
  authenticateToken,
  authorizeRole(["STUDENT"]),
  quizController.startOrResumeAttempt
);

router.post(
  "/:quizId/attempt",
  authenticateToken,
  authorizeRole(["STUDENT"]),
  quizController.submitQuizAttempt
);

router.get(
  "/:quizId/attempt",
  authenticateToken,
  authorizeRole(["STUDENT"]),
  quizController.getMyQuizAttemptResult
);

router.patch(
  "/attempts/:attemptId/save-progress",
  authenticateToken,
  quizController.saveAttemptProgress
);

router.get(
  "/:quizId/submissions",
  authenticateToken,
  authorizeRole(["ADMIN", "MENTOR"]),
  quizController.getAttemptsForQuiz
);

router.delete(
  "/attempts/:attemptId",
  authenticateToken,
  authorizeRole(["ADMIN", "MENTOR"]),
  quizController.deleteAttempt
);

module.exports = router;

router.get(
  "/:quizId/export",
  authenticateToken,
  authorizeRole(["ADMIN", "MENTOR"]),
  quizController.exportQuizResults
);
