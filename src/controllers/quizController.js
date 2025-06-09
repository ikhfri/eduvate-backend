const prisma = require("../prismaClient");

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

// --- Validasi untuk Soal Kuis ---

const validateQuestionOptions = (options) => {
  if (!Array.isArray(options) || options.length === 0) {
    return "Pilihan jawaban (options) harus berupa array dan tidak boleh kosong.";
  }

  let correctAnswerExists = false;

  for (const opt of options) {
    if (typeof opt.text !== "string" || typeof opt.isCorrect !== "boolean") {
      return 'Setiap pilihan jawaban harus memiliki properti "text" (string) dan "isCorrect" (boolean).';
    }

    if (opt.isCorrect) {
      correctAnswerExists = true;
    }
  }

  if (!correctAnswerExists) {
    return "Setidaknya satu pilihan jawaban harus ditandai sebagai benar (isCorrect: true).";
  }

  return null; // Valid
};

// === ADMIN/MENTOR ROUTES ===

// --- /api/quizzes ---

// Membuat kuis baru

const createQuiz = async (req, res) => {
  // POST

  const { title, description, submissionStartDate, deadline, duration } =
    req.body;

  const authorId = req.user.id;

  if (!title || !deadline) {
    return res
      .status(400)
      .json({ message: "Judul dan deadline kuis dibutuhkan." });
  }

  const dl = new Date(deadline);

  let ssd = null;

  if (submissionStartDate) {
    ssd = new Date(submissionStartDate);

    if (isNaN(ssd.getTime())) {
      return res
        .status(400)
        .json({ message: "Format tanggal mulai pengerjaan tidak valid." });
    }
  }

  if (isNaN(dl.getTime())) {
    return res.status(400).json({ message: "Format deadline tidak valid." });
  }

  if (ssd && ssd >= dl) {
    return res
      .status(400)
      .json({ message: "Tanggal mulai pengerjaan harus sebelum deadline." });
  }

  try {
    const quiz = await prisma.quiz.create({
      data: {
        title,

        description,

        submissionStartDate: ssd,

        deadline: dl,

        authorId,

        duration: parseInt(duration, 10), // Simpan durasi sebagai integer
      },
    });

    res.status(201).json({ message: "Kuis berhasil dibuat.", quiz });
  } catch (error) {
    console.error("Create quiz error:", error);

    res
      .status(500)
      .json({ message: "Gagal membuat kuis.", error: error.message });
  }
};

// Mendapatkan semua kuis (untuk admin/mentor, mungkin dengan lebih banyak detail)

const getAllQuizzesAdmin = async (req, res) => {
  // GET

  try {
    const quizzes = await prisma.quiz.findMany({
      orderBy: { createdAt: "desc" },

      include: {
        author: { select: { name: true, email: true } },

        _count: { select: { questions: true, quizAttempts: true } }, // Jumlah soal dan percobaan
      },
    });

    res.json(quizzes);
  } catch (error) {
    console.error("Get all quizzes (admin) error:", error);

    res
      .status(500)
      .json({ message: "Gagal mengambil daftar kuis.", error: error.message });
  }
};

// --- /api/quizzes/:quizId ---

// Mendapatkan detail satu kuis (untuk admin/mentor, termasuk semua soal)

const getQuizByIdAdmin = async (req, res) => {
  // GET

  const { quizId } = req.params;

  try {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },

      include: {
        author: { select: { name: true } },

        questions: true,
      },
    });

    if (!quiz) {
      return res.status(404).json({ message: "Kuis tidak ditemukan." });
    }

    res.json(quiz);
  } catch (error) {
    console.error("Get quiz by id (admin) error:", error);

    res
      .status(500)
      .json({ message: "Gagal mengambil detail kuis.", error: error.message });
  }
};

// Mengupdate kuis

const updateQuiz = async (req, res) => {
  // PUT

  const { quizId } = req.params;

  const { title, description, submissionStartDate, deadline } = req.body;

  const userId = req.user.id; // Untuk verifikasi author

  try {
    const quizToUpdate = await prisma.quiz.findUnique({
      where: { id: quizId },
    });

    if (!quizToUpdate) {
      return res.status(404).json({ message: "Kuis tidak ditemukan." });
    } // Hanya author atau admin yang bisa update (sesuaikan jika MENTOR juga bisa)

    if (quizToUpdate.authorId !== userId && req.user.role !== "ADMIN") {
      return res
        .status(403)
        .json({ message: "Anda tidak berhak mengubah kuis ini." });
    }

    const dataToUpdate = {};

    if (title) dataToUpdate.title = title;

    if (description !== undefined) dataToUpdate.description = description; // Bisa jadi string kosong

    let newStartDate = quizToUpdate.submissionStartDate,
      newEndDate = quizToUpdate.deadline;

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

    if (newStartDate && newEndDate && newStartDate >= newEndDate) {
      // Periksa hanya jika keduanya ada

      return res
        .status(400)
        .json({ message: "Tanggal mulai pengerjaan harus sebelum deadline." });
    }

    if (submissionStartDate !== undefined)
      dataToUpdate.submissionStartDate = newStartDate; // Update jika ada di body

    if (deadline !== undefined) dataToUpdate.deadline = newEndDate; // Update jika ada di body

    const updatedQuiz = await prisma.quiz.update({
      where: { id: quizId },

      data: dataToUpdate,
    });

    res.json({ message: "Kuis berhasil diperbarui.", quiz: updatedQuiz });
  } catch (error) {
    console.error("Update quiz error:", error);

    res
      .status(500)
      .json({ message: "Gagal memperbarui kuis.", error: error.message });
  }
};

const patchQuiz = async (req, res) => {
  // PATCH

  // Implementasi PATCH mirip dengan updateTask, hanya update field yang diberikan

  const { quizId } = req.params;

  const userId = req.user.id;

  const updateData = { ...req.body };

  delete updateData.id;

  delete updateData.authorId;

  delete updateData.createdAt;

  delete updateData.updatedAt;

  try {
    const quizToUpdate = await prisma.quiz.findUnique({
      where: { id: quizId },
    });

    if (!quizToUpdate)
      return res.status(404).json({ message: "Kuis tidak ditemukan." });

    if (quizToUpdate.authorId !== userId && req.user.role !== "ADMIN") {
      return res
        .status(403)
        .json({ message: "Anda tidak berhak mengubah kuis ini." });
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
      updateData.submissionStartDate || quizToUpdate.submissionStartDate;

    const finalEndDate = updateData.deadline || quizToUpdate.deadline;

    if (finalStartDate && finalEndDate && finalStartDate >= finalEndDate) {
      return res
        .status(400)
        .json({ message: "Tanggal mulai pengerjaan harus sebelum deadline." });
    }

    const patchedQuiz = await prisma.quiz.update({
      where: { id: quizId },

      data: updateData,
    });

    res.json({ message: "Kuis berhasil di-patch.", quiz: patchedQuiz });
  } catch (error) {
    console.error("Patch quiz error:", error);

    res
      .status(500)
      .json({
        message: "Gagal melakukan patch pada kuis.",
        error: error.message,
      });
  }
};

// Menghapus kuis (beserta semua soal dan percobaan terkait karena onDelete: Cascade)

const deleteQuiz = async (req, res) => {
  // DELETE

  const { quizId } = req.params;

  const userId = req.user.id;

  try {
    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });

    if (!quiz) {
      return res.status(404).json({ message: "Kuis tidak ditemukan." });
    }

    if (quiz.authorId !== userId && req.user.role !== "ADMIN") {
      return res
        .status(403)
        .json({ message: "Anda tidak berhak menghapus kuis ini." });
    } // Prisma akan menghapus Question dan QuizAttempt terkait jika onDelete: Cascade diatur di schema.prisma // Jika QuizAnswer juga perlu dihapus saat Question dihapus, atur onDelete: Cascade di relasi Question-QuizAnswer

    await prisma.quiz.delete({ where: { id: quizId } });

    res.json({ message: "Kuis berhasil dihapus." });
  } catch (error) {
    console.error("Delete quiz error:", error); // Periksa error spesifik jika ada, misal P2003 jika ada foreign key constraint yang menghalangi

    res
      .status(500)
      .json({ message: "Gagal menghapus kuis.", error: error.message });
  }
};

// --- /api/quizzes/:quizId/questions ---

// Menambahkan soal baru ke kuis

const addQuestionToQuiz = async (req, res) => {
  // POST

  const { quizId } = req.params;

  const { text, options, type, imageUrl } = req.body; // options: [{"text": "A", "isCorrect": true}, ...]

  const userId = req.user.id;

  if (!text || !options) {
    return res
      .status(400)
      .json({ message: "Teks soal dan pilihan jawaban (options) dibutuhkan." });
  }

  const optionsError = validateQuestionOptions(options);

  if (optionsError) {
    return res.status(400).json({ message: optionsError });
  }

  try {
    // Pastikan kuis ada dan user berhak memodifikasi

    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });

    if (!quiz) {
      return res.status(404).json({ message: "Kuis tidak ditemukan." });
    }

    if (quiz.authorId !== userId && req.user.role !== "ADMIN") {
      return res
        .status(403)
        .json({ message: "Anda tidak berhak menambahkan soal ke kuis ini." });
    }

    const question = await prisma.question.create({
      data: {
        text,

        options, // Prisma akan menangani JSON.stringify secara otomatis

        imageUrl: imageUrl || null, // Simpan imageUrl, atau null jika tidak ada

        type,

        quizId,
      },
    });

    res
      .status(201)
      .json({ message: "Soal berhasil ditambahkan ke kuis.", question });
  } catch (error) {
    console.error("Add question to quiz error:", error);

    res
      .status(500)
      .json({ message: "Gagal menambahkan soal.", error: error.message });
  }
};

// Mendapatkan semua soal dari satu kuis (untuk admin review/edit)

const getQuestionsForQuizAdmin = async (req, res) => {
  // GET

  const { quizId } = req.params;

  try {
    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });

    if (!quiz) {
      return res.status(404).json({ message: "Kuis tidak ditemukan." });
    } // Tidak perlu otorisasi tambahan jika sudah bisa akses kuisnya

    const questions = await prisma.question.findMany({
      where: { quizId },
    });

    res.json(questions);
  } catch (error) {
    console.error("Get questions for quiz (admin) error:", error);

    res
      .status(500)
      .json({ message: "Gagal mengambil soal kuis.", error: error.message });
  }
};

// --- /api/quizzes/:quizId/questions/:questionId ---

// Mengupdate soal kuis

const updateQuestion = async (req, res) => {
  const { questionId } = req.params; // FIX: Tambahkan 'imageUrl' di sini juga

  const { text, type, options, imageUrl } = req.body; // ... (validasi sama seperti di atas)

  try {
    const updatedQuestion = await prisma.question.update({
      where: { id: questionId },

      data: {
        text,

        type,

        imageUrl: imageUrl || null,

        options: type === "ESSAY" ? [] : options,
      },
    });

    res.json({
      message: "Pertanyaan berhasil diperbarui.",

      data: updatedQuestion,
    });
  } catch (error) {
    console.error("Update question error:", error);

    res

      .status(500)

      .json({ message: "Gagal memperbarui pertanyaan.", error: error.message });
  }
};

const patchQuestion = async (req, res) => {
  // PATCH

  // Mirip dengan PUT, tapi hanya field yang ada di body yang diupdate

  return updateQuestion(req, res); // Delegasi ke PUT untuk saat ini
};

// Menghapus soal dari kuis

const deleteQuestion = async (req, res) => {
  // DELETE

  const { quizId, questionId } = req.params;

  const userId = req.user.id;

  try {
    const question = await prisma.question.findUnique({
      where: { id: questionId },

      include: { quiz: true },
    });

    if (!question || question.quizId !== quizId) {
      return res
        .status(404)
        .json({ message: "Soal tidak ditemukan pada kuis ini." });
    }

    if (question.quiz.authorId !== userId && req.user.role !== "ADMIN") {
      return res
        .status(403)
        .json({ message: "Anda tidak berhak menghapus soal ini." });
    } // Hapus jawaban terkait soal ini jika onDelete: Cascade tidak diatur di QuizAnswer-Question // await prisma.quizAnswer.deleteMany({ where: { questionId: questionId }});

    await prisma.question.delete({ where: { id: questionId } });

    res.json({ message: "Soal berhasil dihapus." });
  } catch (error) {
    console.error("Delete question error:", error);

    res
      .status(500)
      .json({ message: "Gagal menghapus soal.", error: error.message });
  }
};

// === STUDENT ROUTES ===

// --- /api/quizzes (GET - untuk siswa) ---

// Mendapatkan daftar kuis yang aktif/tersedia untuk siswa

const getAvailableQuizzesForStudent = async (req, res) => {
  // GET

  const now = new Date();

  try {
    const quizzes = await prisma.quiz.findMany({
      where: {
        // Kuis yang sudah dimulai (jika ada submissionStartDate) dan belum melewati deadline

        OR: [
          { submissionStartDate: null, deadline: { gte: now } }, // Tidak ada tanggal mulai, cek deadline

          { submissionStartDate: { lte: now }, deadline: { gte: now } }, // Ada tanggal mulai, cek rentang
        ],
      },

      orderBy: { deadline: "asc" }, // Urutkan berdasarkan deadline terdekat

      select: {
        // Pilih field yang relevan untuk siswa

        id: true,

        title: true,

        description: true,

        submissionStartDate: true,

        deadline: true,

        author: { select: { name: true } },

        _count: { select: { questions: true } }, // Jumlah soal
      },
    });

    res.json(quizzes);
  } catch (error) {
    console.error("Get available quizzes (student) error:", error);

    res
      .status(500)
      .json({ message: "Gagal mengambil daftar kuis.", error: error.message });
  }
};

// --- /api/quizzes/:quizId (GET - untuk siswa mengambil kuis) ---

// Mendapatkan detail kuis dan soalnya (tanpa kunci jawaban) untuk dikerjakan siswa

// Perbaikan untuk getQuizForStudentToTake di backend/src/controllers/quizController.js

const getQuizForStudentToTake = async (req, res) => {
  // GET

  const { quizId } = req.params;

  const studentId = req.user.id;

  const now = new Date();

  try {
    // Cek apakah siswa sudah pernah mengerjakan kuis ini

    const existingAttempt = await prisma.quizAttempt.findUnique({
      where: { quizId_studentId: { quizId, studentId } },
    });

    if (existingAttempt) {
      return res
        .status(403)
        .json({
          message: "Anda sudah pernah mengerjakan kuis ini.",
          attemptId: existingAttempt.id,
        });
    }

    const quizFromDb = await prisma.quiz.findUnique({
      where: { id: quizId },

      include: {
        questions: {
          // orderBy: { id: 'asc' }, // Opsional, bisa diaktifkan jika perlu urutan

          select: {
            // Hanya pilih field yang dibutuhkan siswa

            id: true,

            text: true,

            type: true, // <-- FIX 1: Tambahkan 'type'
            imageUrl: true,

            options: true, // Siswa perlu melihat pilihan
          },
        },

        author: { select: { name: true } },
      },
    });

    if (!quizFromDb) {
      return res.status(404).json({ message: "Kuis tidak ditemukan." });
    } // Cek apakah kuis aktif

    const isQuizActive =
      (quizFromDb.submissionStartDate
        ? now >= quizFromDb.submissionStartDate
        : true) && now <= quizFromDb.deadline;

    if (!isQuizActive) {
      return res
        .status(403)
        .json({
          message: "Kuis ini tidak aktif atau sudah melewati batas waktu.",
        });
    } // FIX 2: Modifikasi options dengan aman dan hapus 'isCorrect'

    const questionsForStudent = quizFromDb.questions.map((q) => {
      let optionsForStudent = []; // Default ke array kosong // Hanya proses 'options' jika ada dan merupakan array

      if (Array.isArray(q.options)) {
        // Hapus informasi 'isCorrect' dari setiap pilihan sebelum dikirim

        optionsForStudent = q.options.map((opt) => ({ text: opt.text }));
      }

      return {
        id: q.id,

        text: q.text,

        imageUrl: q.imageUrl,

        type: q.type,

        duration: quizFromDb.duration, // <-- SERTAKAN DURATION DI SINI

        options: optionsForStudent,
      };
    }); // Buat objek respons akhir dengan pertanyaan yang sudah diproses

    const quizForStudent = {
      id: quizFromDb.id,

      title: quizFromDb.title,

      description: quizFromDb.description,

      duration: quizFromDb.duration,

      questions: questionsForStudent,
    };

    res.json(quizForStudent);
  } catch (error) {
    console.error("Get quiz for student to take error:", error);

    res
      .status(500)
      .json({
        message: "Gagal mengambil detail kuis untuk dikerjakan.",
        error: error.message,
      });
  }
};

// --- /api/quizzes/:quizId/attempt ---

// Siswa mengirimkan jawaban kuis

const submitQuizAttempt = async (req, res) => {
  const { quizId } = req.params;
  const studentId = req.user.id;
  const { answers } = req.body;

  if (!Array.isArray(answers)) {
    return res.status(400).json({ message: "Format jawaban tidak valid." });
  }

  try {
    // 1. Dapatkan data kuis untuk validasi dan penilaian
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { questions: { orderBy: { id: "asc" } } },
    });

    if (!quiz) {
      return res.status(404).json({ message: "Kuis tidak ditemukan." });
    }

    // 2. Cari attempt yang sedang berlangsung (IN_PROGRESS) untuk siswa ini
    const existingAttempt = await prisma.quizAttempt.findFirst({
      where: {
        quizId: quizId,
        studentId: studentId,
        status: "IN_PROGRESS", // Cari yang statusnya masih berjalan
      },
    });

    if (!existingAttempt) {
      return res
        .status(404)
        .json({
          message: "Sesi kuis tidak ditemukan atau sudah selesai dikerjakan.",
        });
    }

    // 3. Proses jawaban dan hitung skor (logika ini tetap sama)
    let correctAnswersCount = 0;
    const quizAnswersData = [];

    for (const userAnswer of answers) {
      const question = quiz.questions.find(
        (q) => q.id === userAnswer.questionId
      );
      if (!question) continue;

      let isCorrect = false;
      const answerData = {
        questionId: userAnswer.questionId,
        isCorrect: false,
        selectedOptionIndex: userAnswer.selectedOptionIndex,
        answerText: userAnswer.answerText,
      };

      if (
        question.type === "MULTIPLE_CHOICE" ||
        question.type === "TRUE_FALSE"
      ) {
        if (
          userAnswer.selectedOptionIndex !== null &&
          userAnswer.selectedOptionIndex !== undefined
        ) {
          const selectedOption =
            question.options[userAnswer.selectedOptionIndex];
          if (selectedOption?.isCorrect) {
            isCorrect = true;
            correctAnswersCount++;
          }
        }
      }
      answerData.isCorrect = isCorrect;
      quizAnswersData.push(answerData);
    }

    const totalQuestions = quiz.questions.length;
    const score =
      totalQuestions > 0 ? (correctAnswersCount / totalQuestions) * 100 : 0;

    // 4. UPDATE attempt yang ada, bukan create yang baru
    const finalAttempt = await prisma.quizAttempt.update({
      where: { id: existingAttempt.id },
      data: {
        score: parseFloat(score.toFixed(2)),
        status: "COMPLETED", // Ubah status menjadi selesai
        submittedAt: new Date(), // Catat waktu submit final
        answers: {
          // Hapus jawaban progress lama (jika ada) dan buat yang baru
          deleteMany: {},
          create: quizAnswersData,
        },
      },
    });

    res
      .status(200)
      .json({
        message: "Jawaban kuis berhasil dikirim.",
        attemptId: finalAttempt.id,
      });
  } catch (error) {
    console.error("Submit quiz attempt error:", error);
    res
      .status(500)
      .json({
        message: "Gagal mengirimkan jawaban kuis.",
        error: error.message,
      });
  }
};

// --- /api/quizzes/:quizId/my-attempt ---

// Siswa melihat hasil percobaan kuis mereka

// Perbaikan untuk fungsi getMyQuizAttemptResult di D:\backend_lms\src\controllers\quizController.js

// Siswa melihat hasil percobaan kuis mereka

const getMyQuizAttemptResult = async (req, res) => {
  // GET

  const { quizId } = req.params;

  const studentId = req.user.id;

  try {
    // Menggunakan query Prisma yang lebih detail dari Anda, ini sudah bagus.

    const attempt = await prisma.quizAttempt.findUnique({
      where: { quizId_studentId: { quizId, studentId } },

      include: {
        quiz: { select: { title: true, description: true, deadline: true } },

        student: { select: { name: true, email: true } },

        answers: {
          include: {
            question: {
              select: {
                id: true,
                text: true,
                options: true,
                type: true,
                imageUrl: true,
              },
            },
          },

          orderBy: { question: { id: "asc" } }, // Pastikan pengurutan sudah benar
        },
      },
    });

    if (!attempt) {
      return res
        .status(404)
        .json({
          message:
            "Anda belum mengerjakan kuis ini atau hasil tidak ditemukan.",
        });
    } // FIX: Hapus pemrosesan 'detailedAnswers' yang rentan error. // Kirim objek 'attempt' yang diterima langsung dari Prisma. // Frontend sudah dirancang untuk menangani struktur data ini.

    res.json({ message: "Berhasil mengambil hasil kuis", data: attempt });
  } catch (error) {
    console.error("Get my quiz attempt result error:", error);

    res
      .status(500)
      .json({
        message: "Gagal mengambil hasil kuis Anda.",
        error: error.message,
      });
  }
};

// Pastikan Anda meng-export fungsi ini dengan benar di bagian bawah file.

// module.exports = { /*...,*/ getMyQuizAttemptResult, /*...*/ };

// --- /api/quizzes/:quizId/results (ADMIN/MENTOR) ---

// Admin/Mentor melihat semua hasil percobaan untuk satu kuis (ranking)

const getQuizResultsAndRanking = async (req, res) => {
  // Menangani: GET /api/quizzes/:quizId/results

  const { quizId } = req.params;

  try {
    // 1. Ambil judul kuis terlebih dahulu untuk memastikan kuis ada

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },

      select: { title: true }, // Hanya butuh judul kuis
    });

    if (!quiz) {
      return res.status(404).json({ message: "Kuis tidak ditemukan" });
    } // 2. Ambil semua percobaan (attempts) untuk kuis ini

    const attempts = await prisma.quizAttempt.findMany({
      where: { quizId },

      include: {
        // Sertakan detail siswa yang mengerjakan

        student: { select: { id: true, name: true, email: true } },
      },

      orderBy: [
        { score: "desc" }, // Urutkan berdasarkan skor tertinggi dulu

        { submittedAt: "asc" }, // Jika skor sama, yang submit lebih dulu yang lebih tinggi peringkatnya
      ],
    }); // 3. Hitung statistik dari data attempts

    const participantCount = attempts.length;

    let averageScore = 0;

    if (participantCount > 0) {
      // Jumlahkan semua skor, lalu bagi dengan jumlah peserta

      const totalScore = attempts.reduce(
        (sum, attempt) => sum + attempt.score,

        0
      );

      averageScore = totalScore / participantCount;
    } // 4. Susun data lengkap untuk dikirim sebagai respons

    const responseData = {
      quizTitle: quiz.title,

      attempts: attempts, // 'attempts' sudah diurutkan dari query Prisma

      stats: {
        participantCount,

        averageScore,
      },
    };

    res.json({
      message: "Berhasil mengambil hasil dan ranking kuis.",

      data: responseData,
    });
  } catch (error) {
    console.error("Get quiz results and ranking error:", error);

    res

      .status(500)

      .json({
        message: "Gagal mengambil hasil dan ranking kuis.",

        error: error.message,
      });
  }
};
const startOrResumeAttempt = async (req, res) => {
  const { quizId } = req.params;
  const studentId = req.user.id;
  const now = new Date();

  try {
    // Cek apakah kuis ada dan aktif
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          orderBy: { id: "asc" },
          select: {
            id: true,
            text: true,
            type: true,
            imageUrl: true,
            options: true,
          },
        },
      },
    });

    if (!quiz) {
      return res.status(404).json({ message: "Kuis tidak ditemukan." });
    }

    // Validasi apakah kuis aktif
    const isQuizActive =
      (quiz.submissionStartDate ? now >= quiz.submissionStartDate : true) &&
      now <= quiz.deadline;
    if (!isQuizActive) {
      return res
        .status(403)
        .json({
          message: "Kuis ini tidak aktif atau sudah melewati batas waktu.",
        });
    }

    // Cek apakah ada percobaan yang sudah selesai
    const completedAttempt = await prisma.quizAttempt.findFirst({
      where: { quizId, studentId, status: "COMPLETED" },
    });
    if (completedAttempt) {
      return res
        .status(403)
        .json({ message: "Anda sudah menyelesaikan kuis ini." });
    }

    // Cek apakah ada attempt yang sedang berlangsung
    let attempt = await prisma.quizAttempt.findFirst({
      where: { quizId, studentId, status: "IN_PROGRESS" },
    });

    if (!attempt) {
      // Buat attempt baru
      attempt = await prisma.quizAttempt.create({
        data: {
          quizId,
          studentId,
          status: "IN_PROGRESS",
          score: 0,
          timeLeftInSeconds: quiz.duration ? quiz.duration * 60 : null,
          progress: { answers: {} }, // Inisialisasi progress
        },
      });
      console.log("New attempt created:", attempt.id);
    } else {
      console.log("Resuming attempt:", attempt.id);
    }

    // Proses pertanyaan untuk menghapus kunci jawaban
    const questionsForStudent = quiz.questions.map((q) => {
      const optionsForStudent = Array.isArray(q.options)
        ? q.options.map((opt) => ({ text: opt.text }))
        : [];
      return {
        id: q.id,
        text: q.text,
        type: q.type,
        imageUrl: q.imageUrl,
        options: optionsForStudent,
      };
    });

    res.json({
      message: "Sesi kuis berhasil dimulai/dilanjutkan.",
      data: {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        duration: quiz.duration,
        submissionStartDate: quiz.submissionStartDate,
        deadline: quiz.deadline,
        questions: questionsForStudent,
        attempt: {
          id: attempt.id,
          status: attempt.status,
          timeLeftInSeconds: attempt.timeLeftInSeconds,
          progress: attempt.progress || { answers: {} }, // Pastikan progress selalu ada
          violationCount: attempt.violationCount,
        },
      },
    });
  } catch (error) {
    console.error("Start/resume attempt error:", error);
    res
      .status(500)
      .json({ message: "Gagal memulai sesi kuis.", error: error.message });
  }
};
const saveAttemptProgress = async (req, res) => {
  const { attemptId } = req.params;
  const { progress, timeLeftInSeconds, violationCount } = req.body;
  const studentId = req.user.id;

  try {
    // Cek apakah attempt ada dan milik siswa
    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        quiz: {
          select: {
            id: true,
            duration: true,
            questions: { select: { id: true } },
          },
        },
      },
    });

    if (!attempt || attempt.studentId !== studentId) {
      return res.status(403).json({ message: "Akses ditolak." });
    }

    if (attempt.status === "COMPLETED") {
      return res.status(403).json({ message: "Kuis ini sudah diselesaikan." });
    }

    // Validasi progress
    if (!progress || typeof progress !== "object" || !progress.answers) {
      return res.status(400).json({ message: "Format progress tidak valid." });
    }

    // Validasi bahwa questionId dalam progress ada di kuis
    const validQuestionIds = attempt.quiz.questions.map((q) => q.id);
    for (const questionId of Object.keys(progress.answers)) {
      if (!validQuestionIds.includes(questionId)) {
        return res
          .status(400)
          .json({ message: `ID soal ${questionId} tidak valid.` });
      }
      const answer = progress.answers[questionId];
      if (typeof answer !== "object" || answer.isAnswered === undefined) {
        return res
          .status(400)
          .json({
            message: `Format jawaban untuk soal ${questionId} tidak valid.`,
          });
      }
    }

    // Validasi timeLeftInSeconds
    if (timeLeftInSeconds !== undefined) {
      if (typeof timeLeftInSeconds !== "number" || timeLeftInSeconds < 0) {
        return res.status(400).json({ message: "Sisa waktu tidak valid." });
      }
      if (
        attempt.quiz.duration &&
        timeLeftInSeconds > attempt.quiz.duration * 60
      ) {
        return res
          .status(400)
          .json({ message: "Sisa waktu melebihi durasi kuis." });
      }
    }

    // Validasi violationCount
    if (violationCount !== undefined) {
      if (!Number.isInteger(violationCount) || violationCount < 0) {
        return res
          .status(400)
          .json({ message: "Jumlah pelanggaran tidak valid." });
      }
    }

    // Perbarui attempt
    await prisma.quizAttempt.update({
      where: { id: attemptId },
      data: {
        progress,
        timeLeftInSeconds: timeLeftInSeconds ?? attempt.timeLeftInSeconds,
        violationCount: violationCount ?? attempt.violationCount,
      },
    });
    for (const questionId of Object.keys(progress.answers)) {
      if (!validQuestionIds.includes(questionId)) {
        return res
          .status(400)
          .json({ message: `ID soal ${questionId} tidak valid.` });
      }
      const answer = progress.answers[questionId];
      const question = await prisma.question.findUnique({
        where: { id: questionId },
      });
      if (
        question.type !== "ESSAY" &&
        answer.selectedOptionIndex !== undefined &&
        answer.selectedOptionIndex >= question.options.length
      ) {
        return res
          .status(400)
          .json({
            message: `Indeks jawaban untuk soal ${questionId} tidak valid.`,
          });
      }
    }

    res.json({ message: "Progres berhasil disimpan." });
  } catch (error) {
    console.error("Save progress error:", error);
    res
      .status(500)
      .json({ message: "Gagal menyimpan progres.", error: error.message });
  }
};

module.exports = {
  // Admin/Mentor

  createQuiz,

  getAllQuizzesAdmin,

  getQuizByIdAdmin,

  updateQuiz,

  patchQuiz,

  deleteQuiz,

  addQuestionToQuiz,

  getQuestionsForQuizAdmin,

  updateQuestion,

  patchQuestion,

  deleteQuestion,

  getQuizResultsAndRanking, // Siswa

  getAvailableQuizzesForStudent,

  getQuizForStudentToTake,

  submitQuizAttempt,

  getMyQuizAttemptResult, // Placeholder & Options

  handleNotImplemented,

  handleOptions,

  startOrResumeAttempt,

  saveAttemptProgress,
};
