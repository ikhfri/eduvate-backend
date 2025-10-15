const prisma = require("../prismaClient");
const xlsx = require("xlsx");

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

const validateQuestionOptions = (options, type, correctAnswerKeywords) => {
  if (type === "ESSAY") {
    if (!correctAnswerKeywords || typeof correctAnswerKeywords !== "string") {
      return "Soal esai harus memiliki kata kunci jawaban yang valid (string).";
    }
    return null;
  }

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

  return null;
};

const createQuiz = async (req, res) => {
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
        duration: parseInt(duration, 10),
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

const getAllQuizzesAdmin = async (req, res) => {
  try {
    const quizzes = await prisma.quiz.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: { name: true, email: true } },
        _count: { select: { questions: true, quizAttempts: true } },
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

const getQuizByIdAdmin = async (req, res) => {
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

const updateQuiz = async (req, res) => {
  const { quizId } = req.params;
  const { title, description, submissionStartDate, deadline } = req.body;
  const userId = req.user.id;

  try {
    const quizToUpdate = await prisma.quiz.findUnique({
      where: { id: quizId },
    });
    if (!quizToUpdate) {
      return res.status(404).json({ message: "Kuis tidak ditemukan." });
    }
    if (quizToUpdate.authorId !== userId && req.user.role !== "ADMIN") {
      return res
        .status(403)
        .json({ message: "Anda tidak berhak mengubah kuis ini." });
    }

    const dataToUpdate = {};
    if (title) dataToUpdate.title = title;
    if (description !== undefined) dataToUpdate.description = description;

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
      return res
        .status(400)
        .json({ message: "Tanggal mulai pengerjaan harus sebelum deadline." });
    }
    if (submissionStartDate !== undefined)
      dataToUpdate.submissionStartDate = newStartDate;
    if (deadline !== undefined) dataToUpdate.deadline = newEndDate;

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
    res.status(500).json({
      message: "Gagal melakukan patch pada kuis.",
      error: error.message,
    });
  }
};

const deleteQuiz = async (req, res) => {
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
    }
    await prisma.quiz.delete({ where: { id: quizId } });
    res.json({ message: "Kuis berhasil dihapus." });
  } catch (error) {
    console.error("Delete quiz error:", error);
    res
      .status(500)
      .json({ message: "Gagal menghapus kuis.", error: error.message });
  }
};

const addQuestionToQuiz = async (req, res) => {
  const { quizId } = req.params;
  const { text, options, type, imageUrl, correctAnswerKeywords } = req.body;
  const userId = req.user.id;

  if (!text) {
    return res.status(400).json({ message: "Teks soal dibutuhkan." });
  }
  if (type !== "ESSAY" && !options) {
    return res.status(400).json({
      message: "Pilihan jawaban (options) dibutuhkan untuk tipe selain esai.",
    });
  }

  const optionsError = validateQuestionOptions(
    options,
    type,
    correctAnswerKeywords
  );
  if (optionsError) {
    return res.status(400).json({ message: optionsError });
  }

  try {
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
        options: type === "ESSAY" ? [] : options,
        imageUrl: imageUrl || null,
        type,
        quizId,
        correctAnswerKeywords: type === "ESSAY" ? correctAnswerKeywords : null,
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

const getQuestionsForQuizAdmin = async (req, res) => {
  const { quizId } = req.params;
  try {
    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) {
      return res.status(404).json({ message: "Kuis tidak ditemukan." });
    }
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

const updateQuestion = async (req, res) => {
  const { questionId } = req.params;
  const { text, type, options, imageUrl, correctAnswerKeywords } = req.body;
  const userId = req.user.id;

  try {
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: { quiz: true },
    });
    if (!question) {
      return res.status(404).json({ message: "Soal tidak ditemukan." });
    }
    if (question.quiz.authorId !== userId && req.user.role !== "ADMIN") {
      return res
        .status(403)
        .json({ message: "Anda tidak berhak memperbarui soal ini." });
    }

    const optionsError = validateQuestionOptions(
      options,
      type,
      correctAnswerKeywords
    );
    if (optionsError) {
      return res.status(400).json({ message: optionsError });
    }

    const updatedQuestion = await prisma.question.update({
      where: { id: questionId },
      data: {
        text,
        type,
        imageUrl: imageUrl || null,
        options: type === "ESSAY" ? [] : options,
        correctAnswerKeywords: type === "ESSAY" ? correctAnswerKeywords : null,
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
  const { questionId } = req.params;
  const userId = req.user.id;
  const updateData = { ...req.body };

  try {
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: { quiz: true },
    });
    if (!question) {
      return res.status(404).json({ message: "Soal tidak ditemukan." });
    }
    if (question.quiz.authorId !== userId && req.user.role !== "ADMIN") {
      return res
        .status(403)
        .json({ message: "Anda tidak berhak memperbarui soal ini." });
    }

    const optionsError = validateQuestionOptions(
      updateData.options || question.options,
      updateData.type || question.type,
      updateData.correctAnswerKeywords || question.correctAnswerKeywords
    );
    if (optionsError) {
      return res.status(400).json({ message: optionsError });
    }

    if (updateData.type === "ESSAY") {
      updateData.options = [];
      if (!updateData.correctAnswerKeywords) {
        updateData.correctAnswerKeywords = question.correctAnswerKeywords;
      }
    }

    const updatedQuestion = await prisma.question.update({
      where: { id: questionId },
      data: updateData,
    });

    res.json({
      message: "Pertanyaan berhasil di-patch.",
      data: updatedQuestion,
    });
  } catch (error) {
    console.error("Patch question error:", error);
    res.status(500).json({
      message: "Gagal melakukan patch pada pertanyaan.",
      error: error.message,
    });
  }
};

const deleteQuestion = async (req, res) => {
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
    }
    await prisma.question.delete({ where: { id: questionId } });
    res.json({ message: "Soal berhasil dihapus." });
  } catch (error) {
    console.error("Delete question error:", error);
    res
      .status(500)
      .json({ message: "Gagal menghapus soal.", error: error.message });
  }
};

const getAvailableQuizzesForStudent = async (req, res) => {
  const now = new Date();
  try {
    const quizzes = await prisma.quiz.findMany({
      where: {
        OR: [
          { submissionStartDate: null, deadline: { gte: now } },
          { submissionStartDate: { lte: now }, deadline: { gte: now } },
        ],
      },
      orderBy: { deadline: "asc" },
      select: {
        id: true,
        title: true,
        description: true,
        submissionStartDate: true,
        deadline: true,
        author: { select: { name: true } },
        _count: { select: { questions: true } },
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

const getQuizForStudentToTake = async (req, res) => {
  const { quizId } = req.params;
  const studentId = req.user.id;
  const now = new Date();

  try {
    const completedAttempt = await prisma.quizAttempt.findFirst({
      where: { quizId, studentId, status: "COMPLETED" },
    });
    if (completedAttempt) {
      return res.status(403).json({
        message: "Anda sudah pernah menyelesaikan kuis ini.",
        attemptId: completedAttempt.id,
      });
    }

    const quizFromDb = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
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

    if (!quizFromDb) {
      return res.status(404).json({ message: "Kuis tidak ditemukan." });
    }

    const isQuizActive =
      (quizFromDb.submissionStartDate
        ? now >= quizFromDb.submissionStartDate
        : true) && now <= quizFromDb.deadline;
    if (!isQuizActive) {
      return res.status(403).json({
        message: "Kuis ini tidak aktif atau sudah melewati batas waktu.",
      });
    }

    let attempt = await prisma.quizAttempt.findFirst({
      where: { quizId, studentId, status: "IN_PROGRESS" },
    });

    let questionOrder = [];

    if (attempt) {
      console.log(`Melanjutkan sesi kuis ${attempt.id}. Memuat urutan soal...`);
      questionOrder =
        attempt.progress?.questionOrder ||
        quizFromDb.questions.map((q) => q.id);
    } else {
      console.log(`Memulai sesi kuis baru untuk kuis ${quizId}.`);
      let questionsToShuffle = [...quizFromDb.questions];
      for (let i = questionsToShuffle.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [questionsToShuffle[i], questionsToShuffle[j]] = [
          questionsToShuffle[j],
          questionsToShuffle[i],
        ];
      }
      questionOrder = questionsToShuffle.map((q) => q.id);
      console.log(`Urutan soal baru yang diacak:`, questionOrder);

      attempt = await prisma.quizAttempt.create({
        data: {
          quizId,
          studentId,
          status: "IN_PROGRESS",
          score: 0,
          timeLeftInSeconds: quizFromDb.duration
            ? quizFromDb.duration * 60
            : null,
          progress: {
            answers: {},
            questionOrder: questionOrder,
          },
        },
      });
    }

    const sortedQuestions = questionOrder
      .map((id) => quizFromDb.questions.find((q) => q.id === id))
      .filter(Boolean);

    const questionsForStudent = sortedQuestions.map((q) => {
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

    const quizForStudent = {
      id: quizFromDb.id,
      title: quizFromDb.title,
      description: quizFromDb.description,
      duration: quizFromDb.duration,
      questions: questionsForStudent,
      attempt: attempt,
    };

    res.json({
      message: "Berhasil mengambil detail kuis",
      data: quizForStudent,
    });
  } catch (error) {
    console.error("Get quiz for student to take error:", error);
    res
      .status(500)
      .json({ message: "Gagal mengambil detail kuis.", error: error.message });
  }
};

const submitQuizAttempt = async (req, res) => {
  const { quizId } = req.params;
  const studentId = req.user.id;
  const { answers } = req.body;

  if (!Array.isArray(answers)) {
    return res.status(400).json({ message: "Format jawaban tidak valid." });
  }

  try {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { questions: { orderBy: { id: "asc" } } },
    });

    if (!quiz) {
      return res.status(404).json({ message: "Kuis tidak ditemukan." });
    }

    const existingAttempt = await prisma.quizAttempt.findFirst({
      where: { quizId: quizId, studentId: studentId, status: "IN_PROGRESS" },
    });

    if (!existingAttempt) {
      return res.status(404).json({
        message: "Sesi kuis tidak ditemukan atau sudah selesai dikerjakan.",
      });
    }

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
      } else if (question.type === "ESSAY") {
        if (userAnswer.answerText && question.correctAnswerKeywords) {
          const keywords = question.correctAnswerKeywords
            .toLowerCase()
            .split(",")
            .map((k) => k.trim());
          const userAnswerText = userAnswer.answerText.toLowerCase();
          isCorrect = keywords.some((keyword) =>
            userAnswerText.includes(keyword)
          );
          if (isCorrect) {
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

    const finalAttempt = await prisma.quizAttempt.update({
      where: { id: existingAttempt.id },
      data: {
        score: parseFloat(score.toFixed(2)),
        status: "COMPLETED",
        submittedAt: new Date(),
        answers: {
          deleteMany: {},
          create: quizAnswersData,
        },
      },
    });

    res.status(200).json({
      message: "Jawaban kuis berhasil dikirim.",
      attemptId: finalAttempt.id,
    });
  } catch (error) {
    console.error("Submit quiz attempt error:", error);
    res.status(500).json({
      message: "Gagal mengirimkan jawaban kuis.",
      error: error.message,
    });
  }
};

const getMyQuizAttemptResult = async (req, res) => {
  const { quizId } = req.params;
  const studentId = req.user.id;

  try {
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
                correctAnswerKeywords: true,
              },
            },
          },
          orderBy: { question: { id: "asc" } },
        },
      },
    });

    if (!attempt) {
      return res.status(404).json({
        message: "Anda belum mengerjakan kuis ini atau hasil tidak ditemukan.",
      });
    }

    res.json({ message: "Berhasil mengambil hasil kuis", data: attempt });
  } catch (error) {
    console.error("Get my quiz attempt result error:", error);
    res.status(500).json({
      message: "Gagal mengambil hasil kuis Anda.",
      error: error.message,
    });
  }
};

const getQuizResultsAndRanking = async (req, res) => {
  const { quizId } = req.params;
  try {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: { title: true },
    });
    if (!quiz) {
      return res.status(404).json({ message: "Kuis tidak ditemukan" });
    }

    const attempts = await prisma.quizAttempt.findMany({
      where: { quizId },
      include: {
        student: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ score: "desc" }, { submittedAt: "asc" }],
    });

    const participantCount = attempts.length;
    let averageScore = 0;
    if (participantCount > 0) {
      const totalScore = attempts.reduce(
        (sum, attempt) => sum + attempt.score,
        0
      );
      averageScore = totalScore / participantCount;
    }

    const responseData = {
      quizTitle: quiz.title,
      attempts: attempts,
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
    res.status(500).json({
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

    const isQuizActive =
      (quiz.submissionStartDate ? now >= quiz.submissionStartDate : true) &&
      now <= quiz.deadline;
    if (!isQuizActive) {
      return res.status(403).json({
        message: "Kuis ini tidak aktif atau sudah melewati batas waktu.",
      });
    }

    const completedAttempt = await prisma.quizAttempt.findFirst({
      where: { quizId, studentId, status: "COMPLETED" },
    });
    if (completedAttempt) {
      return res
        .status(403)
        .json({ message: "Anda sudah menyelesaikan kuis ini." });
    }

    let attempt = await prisma.quizAttempt.findFirst({
      where: { quizId, studentId, status: "IN_PROGRESS" },
    });

    if (!attempt) {
      attempt = await prisma.quizAttempt.create({
        data: {
          quizId,
          studentId,
          status: "IN_PROGRESS",
          score: 0,
          timeLeftInSeconds: quiz.duration ? quiz.duration * 60 : null,
          progress: { answers: {} },
        },
      });
      console.log("New attempt created:", attempt.id);
    } else {
      console.log("Resuming attempt:", attempt.id);
    }

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
          progress: attempt.progress || { answers: {} },
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
    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        quiz: {
          select: {
            id: true,
            duration: true,
            questions: { select: { id: true, type: true, options: true } },
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

    if (!progress || typeof progress !== "object" || !progress.answers) {
      return res.status(400).json({ message: "Format progress tidak valid." });
    }

    const validQuestionIds = attempt.quiz.questions.map((q) => q.id);
    for (const questionId of Object.keys(progress.answers)) {
      if (!validQuestionIds.includes(questionId)) {
        return res
          .status(400)
          .json({ message: `ID soal ${questionId} tidak valid.` });
      }
      const answer = progress.answers[questionId];
      if (typeof answer !== "object" || answer.isAnswered === undefined) {
        return res.status(400).json({
          message: `Format jawaban untuk soal ${questionId} tidak valid.`,
        });
      }
      const question = attempt.quiz.questions.find((q) => q.id === questionId);
      if (
        question.type !== "ESSAY" &&
        answer.selectedOptionIndex !== undefined
      ) {
        if (answer.selectedOptionIndex >= question.options.length) {
          return res.status(400).json({
            message: `Indeks jawaban untuk soal ${questionId} tidak valid.`,
          });
        }
      }
    }

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

    if (violationCount !== undefined) {
      if (!Number.isInteger(violationCount) || violationCount < 0) {
        return res
          .status(400)
          .json({ message: "Jumlah pelanggaran tidak valid." });
      }
    }

    await prisma.quizAttempt.update({
      where: { id: attemptId },
      data: {
        progress,
        timeLeftInSeconds: timeLeftInSeconds ?? attempt.timeLeftInSeconds,
        violationCount: violationCount ?? attempt.violationCount,
      },
    });

    res.json({ message: "Progres berhasil disimpan." });
  } catch (error) {
    console.error("Save progress error:", error);
    res
      .status(500)
      .json({ message: "Gagal menyimpan progres.", error: error.message });
  }
};

const getAttemptsForQuiz = async (req, res) => {
  const { quizId } = req.params;
  try {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: { title: true },
    });
    if (!quiz) {
      return res.status(404).json({ message: "Kuis tidak ditemukan." });
    }

    const attempts = await prisma.quizAttempt.findMany({
      where: { quizId: quizId },
      include: {
        student: { select: { id: true, name: true, email: true } },
      },
      orderBy: { submittedAt: "desc" },
    });

    res.json({
      message: "Berhasil mengambil data percobaan kuis.",
      data: { quizTitle: quiz.title, attempts: attempts },
    });
  } catch (error) {
    console.error("Get attempts for quiz error:", error);
    res.status(500).json({
      message: "Gagal mengambil data percobaan kuis.",
      error: error.message,
    });
  }
};

const deleteAttempt = async (req, res) => {
  const { attemptId } = req.params;
  try {
    await prisma.quizAttempt.delete({
      where: { id: attemptId },
    });
    res.json({
      message:
        "Percobaan kuis berhasil dihapus. Siswa dapat mengerjakan ulang.",
    });
  } catch (error) {
    console.error("Delete attempt error:", error);
    if (error.code === "P2025") {
      return res
        .status(404)
        .json({ message: "Percobaan kuis tidak ditemukan." });
    }
    res.status(500).json({
      message: "Gagal menghapus percobaan kuis.",
      error: error.message,
    });
  }
};

const exportQuizResults = async (req, res) => {
  const { quizId } = req.params;
  try {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          orderBy: { id: "asc" },
        },
      },
    });

    if (!quiz) {
      return res.status(404).json({ message: "Kuis tidak ditemukan." });
    }

    const attempts = await prisma.quizAttempt.findMany({
      where: { quizId },
      include: {
        student: { select: { name: true, email: true } },
        answers: {
          orderBy: { question: { id: "asc" } },
        },
      },
    });

    const dataForExcel = attempts.map((attempt) => {
      const rowData = {
        "Nama Siswa": attempt.student.name || "N/A",
        Email: attempt.student.email,
        Skor: attempt.score,
        "Waktu Pengumpulan": new Date(attempt.submittedAt).toLocaleString(
          "id-ID"
        ),
      };

      quiz.questions.forEach((question, index) => {
        const questionHeader = `Soal ${index + 1}: ${question.text.substring(
          0,
          40
        )}...`;
        const studentAnswer = attempt.answers.find(
          (ans) => ans.questionId === question.id
        );

        let answerText = "Tidak Dijawab";
        if (studentAnswer) {
          if (question.type === "ESSAY") {
            answerText = studentAnswer.answerText || "";
          } else if (
            studentAnswer.selectedOptionIndex !== null &&
            studentAnswer.selectedOptionIndex !== undefined
          ) {
            const options = question.options;
            if (
              Array.isArray(options) &&
              options[studentAnswer.selectedOptionIndex]
            ) {
              answerText = options[studentAnswer.selectedOptionIndex].text;
            }
          }
        }
        rowData[questionHeader] = answerText;
      });

      return rowData;
    });

    const worksheet = xlsx.utils.json_to_sheet(dataForExcel);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Hasil Kuis");

    if (dataForExcel.length > 0) {
      const colWidths = Object.keys(dataForExcel[0]).map((key) => ({
        wch:
          Math.max(
            key.length,
            ...dataForExcel.map((row) => (row[key] || "").toString().length)
          ) + 2,
      }));
      worksheet["!cols"] = colWidths;
    }

    const buffer = xlsx.write(workbook, { bookType: "xlsx", type: "buffer" });
    const filename = `hasil-kuis-${quiz.title.replace(/\s+/g, "-")}.xlsx`;

    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.send(buffer);
  } catch (error) {
    console.error("Export quiz results error:", error);
    res
      .status(500)
      .json({ message: "Gagal mengekspor hasil kuis.", error: error.message });
  }
};

module.exports = {
  getAttemptsForQuiz,
  deleteAttempt,
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
  getQuizResultsAndRanking,
  getAvailableQuizzesForStudent,
  getQuizForStudentToTake,
  submitQuizAttempt,
  getMyQuizAttemptResult,
  handleNotImplemented,
  handleOptions,
  startOrResumeAttempt,
  exportQuizResults,
  saveAttemptProgress,
};
