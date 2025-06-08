// D:\backend_lms\src\controllers\rankingController.js

const prisma = require("../prismaClient");

const RANKING_VISIBILITY_KEY = "rankingVisibility";

/**
 * [ADMIN/MENTOR] Mengubah status visibilitas peringkat menjadi terlihat.
 */
const revealRanking = async (req, res) => {
  try {
    await prisma.systemSetting.upsert({
      where: { key: RANKING_VISIBILITY_KEY },
      update: { value: { isRevealed: true } },
      create: { key: RANKING_VISIBILITY_KEY, value: { isRevealed: true } },
    });
    res.json({ message: "Peringkat sekarang terlihat oleh siswa." });
  } catch (error) {
    res.status(500).json({ message: "Gagal mengubah pengaturan." });
  }
};

/**
 * [ADMIN/MENTOR] Mengubah status visibilitas peringkat menjadi tersembunyi.
 */
const hideRanking = async (req, res) => {
  try {
    await prisma.systemSetting.upsert({
      where: { key: RANKING_VISIBILITY_KEY },
      update: { value: { isRevealed: false } },
      create: { key: RANKING_VISIBILITY_KEY, value: { isRevealed: false } },
    });
    res.json({ message: "Peringkat sekarang tersembunyi dari siswa." });
  } catch (error) {
    res.status(500).json({ message: "Gagal mengubah pengaturan." });
  }
};

/**
 * Mengambil peringkat siswa dengan logika visibilitas.
 */
const getTopStudentsRanking = async (req, res) => {
  const { role } = req.user;
  try {
    // 1. Dapatkan pengaturan visibilitas
    const rankingSetting = await prisma.systemSetting.findUnique({
      where: { key: RANKING_VISIBILITY_KEY },
    });
    const isRevealed = rankingSetting?.value?.isRevealed || false;

    // 2. Jika siswa dan peringkat belum diumumkan, kirim data kosong
    if (role === "STUDENT" && !isRevealed) {
      return res.json({
        message: "Peringkat belum diumumkan.",
        data: {
          quizTitle: "Peringkat Siswa",
          attempts: [],
          isRevealed: false,
        },
      });
    }

    // 3. Lanjutkan logika pengambilan data jika diizinkan
    // (Logika perhitungan skor sama seperti sebelumnya)
    const allStudents = await prisma.user.findMany({
      where: { role: "STUDENT" },
      select: { id: true, name: true, email: true },
    });
    const [taskAggregates, quizAggregates] = await prisma.$transaction([
      prisma.submission.groupBy({ by: ["studentId"], _avg: { grade: true } }),
      prisma.quizAttempt.groupBy({ by: ["studentId"], _avg: { score: true } }),
    ]);

    const studentTaskAvg = new Map(
      taskAggregates.map((item) => [item.studentId, item._avg.grade || 0])
    );
    const studentQuizAvg = new Map(
      quizAggregates.map((item) => [item.studentId, item._avg.score || 0])
    );

    const studentScores = allStudents.map((student) => {
      const avgGrade = studentTaskAvg.get(student.id) || 0;
      const avgScore = studentQuizAvg.get(student.id) || 0;
      const finalScore = (avgGrade + avgScore) / 2;
      return { ...student, finalScore };
    });

    const rankedStudents = studentScores
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, 5);

    res.json({
      message: "Peringkat siswa teratas berhasil diambil.",
      data: {
        quizTitle: "Peringkat Siswa Teratas",
        attempts: rankedStudents,
        isRevealed: isRevealed, // Kirim status visibilitas ke frontend
      },
    });
  } catch (error) {
    console.error("Get top students ranking error:", error);
    res
      .status(500)
      .json({
        message: "Gagal mengambil data peringkat.",
        error: error.message,
      });
  }
};

module.exports = {
  getTopStudentsRanking,
  revealRanking,
  hideRanking,
};
