const express = require("express");
const taskController = require("../controllers/taskController");
const { authorizeRole } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const cacheMiddleware = require("../middleware/cachingMiddleware");
const router = express.Router();

// --- /api/tasks ---
router
  .route("/")
  .get(
    cacheMiddleware(5), // Cache daftar task (global untuk semua user)
    taskController.getAllTasks
  )
  .post(authorizeRole(["ADMIN", "MENTOR"]), taskController.createTask)
  .put(authorizeRole(["ADMIN", "MENTOR"]), taskController.putAllTasks)
  .delete(authorizeRole(["ADMIN", "MENTOR"]), taskController.deleteAllTasks)
  .patch(authorizeRole(["ADMIN", "MENTOR"]), taskController.patchAllTasks)
  .options(taskController.optionsAllTasks)
  .head(taskController.headAllTasks);

// --- /api/tasks/:taskId ---
router
  .route("/:taskId")
  .get(
    cacheMiddleware(2), // Detail task bisa pakai cache pendek
    taskController.getTaskById
  )
  .put(authorizeRole(["ADMIN", "MENTOR"]), taskController.updateTask)
  .delete(authorizeRole(["ADMIN", "MENTOR"]), taskController.deleteTask)
  .patch(authorizeRole(["ADMIN", "MENTOR"]), taskController.patchTask)
  .post(authorizeRole(["ADMIN", "MENTOR"]), taskController.postTaskById)
  .options(taskController.optionsTaskById)
  .head(taskController.headTaskById);

// --- /api/tasks/:taskId/submit --- (❌ JANGAN cache)
router
  .route("/:taskId/submit")
  .post(
    upload.single("submissionFile"),
    taskController.submitTask
  )
  .get(authorizeRole(["STUDENT"]), taskController.getSubmitTaskInfo)
  .put(
    upload.single("submissionFile"),
    taskController.putSubmitTask
  )
  .delete(authorizeRole(["STUDENT"]), taskController.deleteSubmitTask)
  .patch(
    upload.single("submissionFile"),
    taskController.patchSubmitTask
  )
  .options(taskController.optionsSubmitTask)
  .head(taskController.headSubmitTask);

// --- /api/tasks/:taskId/submissions ---
router
  .route("/:taskId/submissions")
  .get(
    authorizeRole(["ADMIN", "MENTOR"]),
    cacheMiddleware(1), // Cache sangat pendek, karena bisa ada penilaian
    taskController.getSubmissionsForTask
  )
  .post(
    authorizeRole(["ADMIN", "MENTOR"]),
    taskController.postSubmissionsForTask
  )
  .put(authorizeRole(["ADMIN", "MENTOR"]), taskController.putSubmissionsForTask)
  .delete(
    authorizeRole(["ADMIN", "MENTOR"]),
    taskController.deleteSubmissionsForTask
  )
  .patch(
    authorizeRole(["ADMIN", "MENTOR"]),
    taskController.patchSubmissionsForTask
  )
  .options(taskController.optionsSubmissionsForTask)
  .head(taskController.headSubmissionsForTask);

// --- /api/tasks/:taskId/my-submission --- (❌ personal user, no cache)
router
  .route("/:taskId/my-submission")
  .get(authorizeRole(["STUDENT"]), taskController.getMySubmissionForTask)
  .post(authorizeRole(["STUDENT"]), taskController.postMySubmission)
  .put(authorizeRole(["STUDENT"]), taskController.putMySubmission)
  .delete(authorizeRole(["STUDENT"]), taskController.deleteMySubmission)
  .patch(authorizeRole(["STUDENT"]), taskController.patchMySubmission)
  .options(taskController.optionsMySubmission)
  .head(taskController.headMySubmission);

// --- /api/tasks/submissions/:submissionId/grade ---
router
  .route("/submissions/:submissionId/grade")
  .put(authorizeRole(["ADMIN", "MENTOR"]), taskController.gradeSubmission)
  .get(
    authorizeRole(["ADMIN", "MENTOR"]),
    cacheMiddleware(1), // Bisa di-cache pendek untuk grade info
    taskController.getGradeInfo
  )
  .post(authorizeRole(["ADMIN", "MENTOR"]), taskController.postGrade)
  .delete(authorizeRole(["ADMIN", "MENTOR"]), taskController.deleteGrade)
  .patch(
    authorizeRole(["ADMIN", "MENTOR"]),
    taskController.patchGradeSubmission
  )
  .options(taskController.optionsGrade)
  .head(taskController.headGrade);

// --- /api/tasks/submissions/:submissionId/file ---
router
  .route("/submissions/:submissionId/file")
  .get(
    authorizeRole(["ADMIN", "MENTOR"]),
    cacheMiddleware(2), // File bisa di-cache sebentar
    taskController.getSubmissionFile
  )
  .delete(
    authorizeRole(["ADMIN", "MENTOR"]),
    taskController.deleteSubmissionFile
  )
  .post(authorizeRole(["ADMIN", "MENTOR"]), taskController.postSubmissionFile)
  .put(authorizeRole(["ADMIN", "MENTOR"]), taskController.putSubmissionFile)
  .patch(authorizeRole(["ADMIN", "MENTOR"]), taskController.patchSubmissionFile)
  .options(taskController.optionsSubmissionFile)
  .head(taskController.headSubmissionFile);

module.exports = router;
