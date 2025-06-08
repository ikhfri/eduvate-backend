// backend/src/controllers/taskController.js
const prisma = require("../prismaClient"); // Path disesuaikan
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const UPLOAD_FOLDER_NAME = "nevtik"; // bucket dan folder di supabase storage

const projectRoot = process.cwd(); // Root direktori proyek
 // Hilangkan './' jika ada

// --- Helper Functions ---
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

// --- /api/tasks ---
const createTask = async (req, res) => {
  // POST
  const { title, description, submissionStartDate, deadline } = req.body;
  const authorId = req.user.id;

  if (!title || !description || !submissionStartDate || !deadline) {
    return res
      .status(400)
      .json({
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

// backend/src/controllers/taskController.js

// backend/src/controllers/taskController.js
// ... (kode lain yang sudah ada)

// --- /api/tasks ---
const getAllTasks = async (req, res) => {
  try {
    const userId = req.user.id; // Dapatkan ID pengguna yang login dari middleware otentikasi
    const userRole = req.user.role; // Dapatkan peran pengguna

    let tasks = await prisma.task.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: { name: true, email: true } },
        _count: { // Untuk menghitung total submission (berguna untuk admin/mentor)
          select: { submissions: true },
        }
      },
    });

    // Jika pengguna adalah siswa, coba dapatkan submission mereka untuk setiap tugas
    if (userRole === 'STUDENT') {
      const taskIds = tasks.map(task => task.id);
      if (taskIds.length > 0) { // Hanya query jika ada tugas
        const submissions = await prisma.submission.findMany({
          where: {
            taskId: { in: taskIds },
            studentId: userId,
          },
          select: {
            taskId: true,
            grade: true,
            submittedAt: true,
            // Anda bisa pilih field lain dari submission jika perlu ditampilkan di kartu
          }
        });

        // Buat map untuk akses cepat ke submission berdasarkan taskId
        const submissionsMap = new Map();
        submissions.forEach(sub => submissionsMap.set(sub.taskId, sub));

        // Tambahkan informasi mySubmission ke setiap tugas
        tasks = tasks.map(task => ({
          ...task,
          mySubmission: submissionsMap.get(task.id) || null,
        }));
      } else {
        // Jika tidak ada tugas, pastikan setiap tugas (jika ada) memiliki mySubmission: null
         tasks = tasks.map(task => ({
          ...task,
          mySubmission: null,
        }));
      }
    }
    // Untuk admin/mentor, properti mySubmission tidak akan ditambahkan
    // atau akan null, mereka akan melihat detail submission di halaman lain.

    res.json(tasks); // Kirim tasks yang sudah ada info submission (jika siswa)
  } catch (error) {
    console.error("Get all tasks error:", error);
    res
      .status(500)
      .json({ message: "Gagal mengambil daftar tugas.", error: error.message });
  }
};

// ... (sisa fungsi controller Anda)

module.exports = {
  // ... (ekspor fungsi-fungsi Anda yang lain)
  getAllTasks,
  // ... (ekspor fungsi-fungsi Anda yang lain)
};
// --- /api/tasks/:taskId ---
const getTaskById = async (req, res) => {
  // GET
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
  // PUT
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
    res
      .status(500)
      .json({
        message: "Gagal melakukan patch pada tugas.",
        error: error.message,
      });
  }
};

const deleteTask = async (req, res) => {
  // DELETE
  const { taskId } = req.params;
  const userId = req.user.id;
  try {
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task)
      return res.status(404).json({ message: "Tugas tidak ditemukan." });
    if (task.authorId !== userId && req.user.role !== "ADMIN") {
      return res
        .status(403)
        .json({ message: "Anda tidak berhak menghapus tugas ini." });
    }
    const submissions = await prisma.submission.findMany({
      where: { taskId: taskId },
    });
    for (const sub of submissions) {
      if (sub.fileUrl) {
        // sub.fileUrl adalah /uploads/filename.ext
        // Kita butuh path absolut ke file di server
        const fileName = path.basename(sub.fileUrl);
        const oldFilePath = path.join(
          projectRoot,
          UPLOAD_FOLDER_NAME,
          fileName
        );
        try {
          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
            console.log(
              `File ${oldFilePath} berhasil dihapus saat menghapus tugas.`
            );
          }
        } catch (err) {
          console.error(
            `Gagal menghapus file ${oldFilePath} saat menghapus tugas:`,
            err
          );
        }
      }
    }
    await prisma.submission.deleteMany({ where: { taskId: taskId } });
    await prisma.task.delete({ where: { id: taskId } });
    res.json({
      message: "Tugas dan semua file submission terkait berhasil dihapus.",
    });
  } catch (error) {
    console.error("Delete task error:", error);
    if (error.code === "P2003")
      return res
        .status(400)
        .json({
          message:
            "Gagal menghapus tugas. Hapus dulu semua submission terkait.",
        });
    res
      .status(500)
      .json({ message: "Gagal menghapus tugas.", error: error.message });
  }
};

// --- /api/tasks/:taskId/submit ---

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

    // Gunakan nama file asli
    const originalFileName = req.file.originalname;

    // Jika kamu khawatir overwrite, bisa tambahkan timestamp seperti ini:
    // const uniqueFileName = `${Date.now()}-${originalFileName}`;

    // Kalau yakin tidak masalah overwrite, pakai saja:
    const uniqueFileName = originalFileName;

    const { data, error: uploadError } = await supabase.storage
      .from(UPLOAD_FOLDER_NAME)
      .upload(uniqueFileName, req.file.buffer, {
        contentType: req.file.mimetype,
        cacheControl: "3600",
        upsert: false, // jangan overwrite file jika sudah ada
      });

    if (uploadError) {
      throw uploadError;
    }

    // Dapatkan public URL file
    const { data: publicUrlData } = supabase.storage
      .from(UPLOAD_FOLDER_NAME)
      .getPublicUrl(uniqueFileName);

    // Simpan url file ke database
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

// --- /api/tasks/:taskId/submissions ---
const getSubmissionsForTask = async (req, res) => {
  // GET
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
    res
      .status(500)
      .json({
        message: "Gagal mengambil daftar submission.",
        error: error.message,
      });
  }
};

// --- /api/tasks/:taskId/my-submission ---
const getMySubmissionForTask = async (req, res) => {
  // GET
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
      return res
        .status(404)
        .json({
          message:
            "Anda belum mengumpulkan tugas ini atau tugas tidak ditemukan.",
        });
    res.json(submission);
  } catch (error) {
    console.error("Get my submission error:", error);
    res
      .status(500)
      .json({
        message: "Gagal mengambil submission Anda.",
        error: error.message,
      });
  }
};

// --- /api/tasks/submissions/:submissionId/grade ---
const gradeSubmission = async (req, res) => {
  // PUT
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
  // PATCH
  return gradeSubmission(req, res);
};

// --- /api/tasks/submissions/:submissionId/file ---
const deleteSubmissionFile = async (req, res) => {
  // DELETE
  const { submissionId } = req.params;

  try {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
    });

    if (!submission) {
      return res.status(404).json({ message: "Submission tidak ditemukan." });
    }

    if (!submission.fileUrl) {
      return res
        .status(400)
        .json({
          message: "File untuk submission ini tidak ada atau sudah dihapus.",
        });
    }

    const fileName = path.basename(submission.fileUrl); // Ambil nama file dari /uploads/filename.ext
    const filePath = path.join(projectRoot, UPLOAD_FOLDER_NAME, fileName); // Path absolut ke file

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
      res
        .status(200)
        .json({
          message:
            "File tidak ditemukan di server, URL pada database telah diupdate (kemungkinan sudah terhapus sebelumnya).",
          submission: updatedSubmission,
        });
    }
  } catch (error) {
    console.error("Delete submission file error:", error);
    res
      .status(500)
      .json({
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
