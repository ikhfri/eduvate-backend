const prisma = require("../prismaClient"); 
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const UPLOAD_FOLDER_NAME = "nevtik"; 

const projectRoot = process.cwd(); 

const handleNotImplemented = (req, res) =>
  res.status(501).json({ message: "Not Implemented" });
const handleOptions = (req, res) => {
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD"
  );
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.sendStatus(204);
};

const createTask = async (req, res) => {
  const { title, description, submissionStartDate, deadline } = req.body;
  const authorId = req.user.id;

  if (!title || !description || !submissionStartDate || !deadline) {
    return res.status(400).json({
      message:
        "Judul, deskripsi, tanggal mulai pengumpulan, dan deadline dibutuhkan.",
    });
  }
  const startDate = new Date(submissionStartDate);
  const endDate = new Date(deadline);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return res.status(400).json({ message: "Format tanggal tidak valid." });
  }
  if (startDate >= endDate) {
    return res
      .status(400)
      .json({ message: "Tanggal mulai pengumpulan harus sebelum deadline." });
  }

  try {
    const task = await prisma.task.create({
      data: {
        title,
        description,
        submissionStartDate: startDate,
        deadline: endDate,
        authorId,
      },
    });
    res.status(201).json({ message: "Tugas berhasil dibuat.", task });
  } catch (error) {
    console.error("Create task error:", error);
    res
      .status(500)
      .json({ message: "Gagal membuat tugas.", error: error.message });
  }
};


const getAllTasks = async (req, res) => {
  try {
    const userId = req.user.id; 
    const userRole = req.user.role; 

    let tasks = await prisma.task.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: { name: true, email: true } },
        _count: {
          select: { submissions: true },
        },
      },
    });

    if (userRole === "STUDENT") {
      const taskIds = tasks.map((task) => task.id);
      if (taskIds.length > 0) {
        const submissions = await prisma.submission.findMany({
          where: {
            taskId: { in: taskIds },
            studentId: userId,
          },
          select: {
            taskId: true,
            grade: true,
            submittedAt: true,
          },
        });

        const submissionsMap = new Map();
        submissions.forEach((sub) => submissionsMap.set(sub.taskId, sub));

        tasks = tasks.map((task) => ({
          ...task,
          mySubmission: submissionsMap.get(task.id) || null,
        }));
      } else {
        tasks = tasks.map((task) => ({
          ...task,
          mySubmission: null,
        }));
      }
    }

    res.json(tasks); 
  } catch (error) {
    console.error("Get all tasks error:", error);
    res
      .status(500)
      .json({ message: "Gagal mengambil daftar tugas.", error: error.message });
  }
};


module.exports = {
  getAllTasks,
};
const getTaskById = async (req, res) => {
  const { taskId } = req.params;
  try {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { author: { select: { name: true } } },
    });
    if (!task)
      return res.status(404).json({ message: "Tugas tidak ditemukan." });
    res.json(task);
  } catch (error) {
    console.error("Get task by id error:", error);
    res
      .status(500)
      .json({ message: "Gagal mengambil detail tugas.", error: error.message });
  }
};

const updateTask = async (req, res) => {
  const { taskId } = req.params;
  const { title, description, submissionStartDate, deadline } = req.body;
  const userId = req.user.id;

  try {
    const taskToUpdate = await prisma.task.findUnique({
      where: { id: taskId },
    });
    if (!taskToUpdate)
      return res.status(404).json({ message: "Tugas tidak ditemukan." });
    if (taskToUpdate.authorId !== userId && req.user.role !== "ADMIN") {
      return res
        .status(403)
        .json({ message: "Anda tidak berhak mengubah tugas ini." });
    }

    const dataToUpdate = {};
    if (title) dataToUpdate.title = title;
    if (description) dataToUpdate.description = description;
    let newStartDate = taskToUpdate.submissionStartDate,
      newEndDate = taskToUpdate.deadline;

    if (submissionStartDate) {
      newStartDate = new Date(submissionStartDate);
      if (isNaN(newStartDate.getTime()))
        return res
          .status(400)
          .json({ message: "Format tanggal mulai tidak valid." });
    }
    if (deadline) {
      newEndDate = new Date(deadline);
      if (isNaN(newEndDate.getTime()))
        return res
          .status(400)
          .json({ message: "Format deadline tidak valid." });
    }
    if (newStartDate >= newEndDate) {
      return res
        .status(400)
        .json({ message: "Tanggal mulai pengumpulan harus sebelum deadline." });
    }
    dataToUpdate.submissionStartDate = newStartDate;
    dataToUpdate.deadline = newEndDate;

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: dataToUpdate,
    });
    res.json({ message: "Tugas berhasil diperbarui.", task: updatedTask });
  } catch (error) {
    console.error("Update task error:", error);
    res
      .status(500)
      .json({ message: "Gagal memperbarui tugas.", error: error.message });
  }
};
const patchTask = async (req, res) => {
  // PATCH
  const { taskId } = req.params;
  const userId = req.user.id;
  const updateData = { ...req.body };
  delete updateData.id;
  delete updateData.authorId;
  delete updateData.createdAt;
  delete updateData.updatedAt;

  try {
    const taskToUpdate = await prisma.task.findUnique({
      where: { id: taskId },
    });
    if (!taskToUpdate)
      return res.status(404).json({ message: "Tugas tidak ditemukan." });
    if (taskToUpdate.authorId !== userId && req.user.role !== "ADMIN") {
      return res
        .status(403)
        .json({ message: "Anda tidak berhak mengubah tugas ini." });
    }

    if (updateData.submissionStartDate) {
      const newStartDate = new Date(updateData.submissionStartDate);
      if (isNaN(newStartDate.getTime()))
        return res
          .status(400)
          .json({ message: "Format tanggal mulai tidak valid." });
      updateData.submissionStartDate = newStartDate;
    }
    if (updateData.deadline) {
      const newEndDate = new Date(updateData.deadline);
      if (isNaN(newEndDate.getTime()))
        return res
          .status(400)
          .json({ message: "Format deadline tidak valid." });
      updateData.deadline = newEndDate;
    }

    const finalStartDate =
      updateData.submissionStartDate || taskToUpdate.submissionStartDate;
    const finalEndDate = updateData.deadline || taskToUpdate.deadline;
    if (finalStartDate >= finalEndDate) {
      return res
        .status(400)
        .json({ message: "Tanggal mulai pengumpulan harus sebelum deadline." });
    }

    const patchedTask = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
    });
    res.json({ message: "Tugas berhasil di-patch.", task: patchedTask });
  } catch (error) {
    console.error("Patch task error:", error);
    res.status(500).json({
      message: "Gagal melakukan patch pada tugas.",
      error: error.message,
    });
  }
};
const deleteTask = async (req, res) => {
  const { submissionId } = req.params;

  try {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
    });

    if (!submission) {
      return res.status(404).json({ message: "Submission tidak ditemukan." });
    }

    if (!submission.fileUrl) {
      return res.status(400).json({
        message: "File untuk submission ini tidak ada atau sudah dihapus.",
      });
    }

    const urlParts = submission.fileUrl.split("/");
    const fileName = urlParts[urlParts.length - 1];

    const { error: deleteError } = await supabase.storage
      .from(UPLOAD_FOLDER_NAME)
      .remove([fileName]);

    if (deleteError) {
      console.error("Gagal menghapus file di Supabase Storage:", deleteError);
      return res.status(500).json({
        message: "Gagal menghapus file di penyimpanan.",
        error: deleteError.message,
      });
    }

    const updatedSubmission = await prisma.submission.update({
      where: { id: submissionId },
      data: {
        fileUrl: null,
        comment: `${submission.comment || ""} [File dihapus oleh admin ${
          req.user.email
        } pada ${new Date().toISOString()}]`.trim(),
      },
    });

    res.json({
      message: "File submission berhasil dihapus dari penyimpanan Supabase.",
      submission: updatedSubmission,
    });
  } catch (error) {
    console.error("Delete submission file error:", error);
    res.status(500).json({
      message: "Gagal menghapus file submission.",
      error: error.message,
    });
  }
};



const submitTask = async (req, res) => {
  const { taskId } = req.params;
  const studentId = req.user.id;

  if (!req.file)
    return res.status(400).json({ message: "File submission dibutuhkan." });

  try {
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      return res.status(404).json({ message: "Tugas tidak ditemukan." });
    }

    const now = new Date();
    if (now < task.submissionStartDate) {
      return res
        .status(400)
        .json({ message: "Waktu pengumpulan tugas belum dimulai." });
    }
    if (now > task.deadline) {
      return res
        .status(400)
        .json({ message: "Waktu pengumpulan tugas telah berakhir." });
    }

    const existingSubmission = await prisma.submission.findUnique({
      where: { taskId_studentId: { taskId: taskId, studentId: studentId } },
    });
    if (existingSubmission) {
      return res
        .status(400)
        .json({ message: "Anda sudah pernah mengirimkan tugas ini." });
    }

    const originalFileName = req.file.originalname;

    const uniqueFileName = originalFileName;

    const { data, error: uploadError } = await supabase.storage
      .from(UPLOAD_FOLDER_NAME)
      .upload(uniqueFileName, req.file.buffer, {
        contentType: req.file.mimetype,
        cacheControl: "3600",
        upsert: false, 
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data: publicUrlData } = supabase.storage
      .from(UPLOAD_FOLDER_NAME)
      .getPublicUrl(uniqueFileName);

    const submission = await prisma.submission.create({
      data: {
        taskId,
        studentId,
        fileUrl: publicUrlData.publicUrl,
      },
    });

    res
      .status(201)
      .json({ message: "Tugas berhasil dikumpulkan.", submission });
  } catch (error) {
    console.error("Submit task error:", error);
    if (error.code === "P2002") {
      return res.status(400).json({
        message:
          "Anda sudah pernah mengirimkan tugas ini (constraint violation).",
      });
    }
    res
      .status(500)
      .json({ message: "Gagal mengumpulkan tugas.", error: error.message });
  }
};

const getSubmissionsForTask = async (req, res) => {
  const { taskId } = req.params;
  try {
    const submissions = await prisma.submission.findMany({
      where: { taskId },
      include: { student: { select: { id: true, name: true, email: true } } },
      orderBy: { submittedAt: "desc" },
    });
    res.json(submissions);
  } catch (error) {
    console.error("Get submissions for task error:", error);
    res.status(500).json({
      message: "Gagal mengambil daftar submission.",
      error: error.message,
    });
  }
};

const getMySubmissionForTask = async (req, res) => {
  const { taskId } = req.params;
  const studentId = req.user.id;
  try {
    const submission = await prisma.submission.findUnique({
      where: { taskId_studentId: { taskId: taskId, studentId: studentId } },
      include: {
        task: {
          select: { title: true, deadline: true, submissionStartDate: true },
        },
      },
    });
    if (!submission)
      return res.status(404).json({
        message:
          "Anda belum mengumpulkan tugas ini atau tugas tidak ditemukan.",
      });
    res.json(submission);
  } catch (error) {
    console.error("Get my submission error:", error);
    res.status(500).json({
      message: "Gagal mengambil submission Anda.",
      error: error.message,
    });
  }
};

const gradeSubmission = async (req, res) => {
  const { submissionId } = req.params;
  const { grade, comment } = req.body;

  if (grade === undefined || grade === null)
    return res.status(400).json({ message: "Nilai dibutuhkan." });
  const parsedGrade = parseInt(grade, 10);
  if (isNaN(parsedGrade) || parsedGrade < 0 || parsedGrade > 100) {
    return res
      .status(400)
      .json({ message: "Nilai harus berupa angka antara 0 dan 100." });
  }
  try {
    const dataToUpdate = { grade: parsedGrade };
    if (comment !== undefined) {
      dataToUpdate.comment = comment;
    }

    const submission = await prisma.submission.update({
      where: { id: submissionId },
      data: dataToUpdate,
    });
    res.json({ message: "Nilai dan komentar berhasil disimpan.", submission });
  } catch (error) {
    console.error("Grade submission error:", error);
    res
      .status(500)
      .json({ message: "Gagal memberi nilai.", error: error.message });
  }
};
const patchGradeSubmission = async (req, res) => {
  return gradeSubmission(req, res);
};

const deleteSubmissionFile = async (req, res) => {
  const { submissionId } = req.params;

  try {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
    });

    if (!submission) {
      return res.status(404).json({ message: "Submission tidak ditemukan." });
    }

    if (!submission.fileUrl) {
      return res.status(400).json({
        message: "File untuk submission ini tidak ada atau sudah dihapus.",
      });
    }

    const fileName = path.basename(submission.fileUrl); 
    const filePath = path.join(projectRoot, UPLOAD_FOLDER_NAME, fileName); 

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);

      const updatedSubmission = await prisma.submission.update({
        where: { id: submissionId },
        data: {
          fileUrl: null,
          comment: `${submission.comment || ""} [File dihapus oleh admin ${
            req.user.email
          } pada ${new Date().toISOString()}]`.trim(),
        },
      });
      res.json({
        message: "File submission berhasil dihapus dari server.",
        submission: updatedSubmission,
      });
    } else {
      const updatedSubmission = await prisma.submission.update({
        where: { id: submissionId },
        data: {
          fileUrl: null,
          comment: `${
            submission.comment || ""
          } [File tidak ditemukan di server (path: ${filePath}), URL pada database telah diupdate oleh admin ${
            req.user.email
          } pada ${new Date().toISOString()}]`.trim(),
        },
      });
      console.warn(
        `File ${filePath} tidak ditemukan di server saat mencoba menghapus, tetapi URL di DB diupdate.`
      );
      res.status(200).json({
        message:
          "File tidak ditemukan di server, URL pada database telah diupdate (kemungkinan sudah terhapus sebelumnya).",
        submission: updatedSubmission,
      });
    }
  } catch (error) {
    console.error("Delete submission file error:", error);
    res.status(500).json({
      message: "Gagal menghapus file submission.",
      error: error.message,
    });
  }
};

module.exports = {
  createTask,
  getAllTasks,
  putAllTasks: handleNotImplemented,
  deleteAllTasks: handleNotImplemented,
  patchAllTasks: handleNotImplemented,
  optionsAllTasks: handleOptions,
  headAllTasks: handleNotImplemented,

  getTaskById,
  updateTask,
  deleteTask,
  patchTask,
  postTaskById: handleNotImplemented,
  optionsTaskById: handleOptions,
  headTaskById: handleNotImplemented,

  submitTask,
  getSubmitTaskInfo: handleNotImplemented,
  putSubmitTask: handleNotImplemented,
  deleteSubmitTask: handleNotImplemented,
  patchSubmitTask: handleNotImplemented,
  optionsSubmitTask: handleOptions,
  headSubmitTask: handleNotImplemented,

  getSubmissionsForTask,
  postSubmissionsForTask: handleNotImplemented,
  putSubmissionsForTask: handleNotImplemented,
  deleteSubmissionsForTask: handleNotImplemented,
  patchSubmissionsForTask: handleNotImplemented,
  optionsSubmissionsForTask: handleOptions,
  headSubmissionsForTask: handleNotImplemented,

  getMySubmissionForTask,
  postMySubmission: handleNotImplemented,
  putMySubmission: handleNotImplemented,
  deleteMySubmission: handleNotImplemented,
  patchMySubmission: handleNotImplemented,
  optionsMySubmission: handleOptions,
  headMySubmission: handleNotImplemented,

  gradeSubmission,
  getGradeInfo: handleNotImplemented,
  postGrade: handleNotImplemented,
  deleteGrade: handleNotImplemented,
  patchGradeSubmission,
  optionsGrade: handleOptions,
  headGrade: handleNotImplemented,

  deleteSubmissionFile,
  getSubmissionFile: handleNotImplemented,
  postSubmissionFile: handleNotImplemented,
  putSubmissionFile: handleNotImplemented,
  patchSubmissionFile: handleNotImplemented,
  optionsSubmissionFile: handleOptions,
  headSubmissionFile: handleNotImplemented,
};
