// backend/src/routes/taskRoutes.js
const express = require("express");
const taskController = require("../controllers/taskController"); // Path disesuaikan
const { authorizeRole } = require("../middleware/authMiddleware"); // Path disesuaikan
const upload = require("../middleware/uploadMiddleware"); // Path disesuaikan
const router = express.Router();

// --- /api/tasks ---
router
  .route("/")
  .get(taskController.getAllTasks)
  .post(authorizeRole(["ADMIN", "MENTOR"]), taskController.createTask)
  .put(authorizeRole(["ADMIN", "MENTOR"]), taskController.putAllTasks)
  .delete(authorizeRole(["ADMIN", "MENTOR"]), taskController.deleteAllTasks)
  .patch(authorizeRole(["ADMIN", "MENTOR"]), taskController.patchAllTasks)
  .options(taskController.optionsAllTasks)
  .head(taskController.headAllTasks);

// --- /api/tasks/:taskId ---
router
  .route("/:taskId")
  .get(taskController.getTaskById)
  .put(authorizeRole(["ADMIN", "MENTOR"]), taskController.updateTask)
  .delete(authorizeRole(["ADMIN", "MENTOR"]), taskController.deleteTask)
  .patch(authorizeRole(["ADMIN", "MENTOR"]), taskController.patchTask)
  .post(authorizeRole(["ADMIN", "MENTOR"]), taskController.postTaskById)
  .options(taskController.optionsTaskById)
  .head(taskController.headTaskById);

// --- /api/tasks/:taskId/submit ---
router
  .route("/:taskId/submit")
  .post(
    authorizeRole(["STUDENT"]),
    upload.single("submissionFile"),
    taskController.submitTask
  )
  .get(authorizeRole(["STUDENT"]), taskController.getSubmitTaskInfo)
  .put(
    authorizeRole(["STUDENT"]),
    upload.single("submissionFile"),
    taskController.putSubmitTask
  )
  .delete(authorizeRole(["STUDENT"]), taskController.deleteSubmitTask)
  .patch(
    authorizeRole(["STUDENT"]),
    upload.single("submissionFile"),
    taskController.patchSubmitTask
  )
  .options(taskController.optionsSubmitTask)
  .head(taskController.headSubmitTask);

// --- /api/tasks/:taskId/submissions ---
router
  .route("/:taskId/submissions")
  .get(authorizeRole(["ADMIN", "MENTOR"]), taskController.getSubmissionsForTask)
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

// --- /api/tasks/:taskId/my-submission ---
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
  .get(authorizeRole(["ADMIN", "MENTOR"]), taskController.getGradeInfo)
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
  .delete(
    authorizeRole(["ADMIN", "MENTOR"]),
    taskController.deleteSubmissionFile
  )
  .get(authorizeRole(["ADMIN", "MENTOR"]), taskController.getSubmissionFile)
  .post(authorizeRole(["ADMIN", "MENTOR"]), taskController.postSubmissionFile)
  .put(authorizeRole(["ADMIN", "MENTOR"]), taskController.putSubmissionFile)
  .patch(authorizeRole(["ADMIN", "MENTOR"]), taskController.patchSubmissionFile)
  .options(taskController.optionsSubmissionFile)
  .head(taskController.headSubmissionFile);

module.exports = router;
