
	const prisma = require("../prismaClient");

	const getDetailedStats = async (req, res) => {
	try {
		const [
		userStatsRaw,
		taskCount,
		submissionCount,
		avgGradeResult,
		quizCount,
		attemptCount,
		avgScoreResult,
		] = await prisma.$transaction([
		prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
		prisma.task.count(),
		prisma.submission.count(),
		prisma.submission.aggregate({ _avg: { grade: true } }),
		prisma.quiz.count(),
		prisma.quizAttempt.count(),
		prisma.quizAttempt.aggregate({ _avg: { score: true } }),
		]);

		const userStats = userStatsRaw.map((stat) => ({
		role: stat.role,
		count: stat._count._all,
		}));

		const responseData = {
		userStats: userStats,
		taskStats: {
			totalTasks: taskCount,
			totalSubmissions: submissionCount,
			averageGrade: avgGradeResult._avg.grade,
		},
		quizStats: {
			totalQuizzes: quizCount,
			totalAttempts: attemptCount,
			averageScore: avgScoreResult._avg.score,
		},
		};

		res.json({
		message: "Statistik detail berhasil diambil.",
		data: responseData,
		});
	} catch (error) {
		console.error("Get detailed stats error:", error);
		res
		.status(500)
		.json({
			message: "Gagal mengambil statistik detail.",
			error: error.message,
		});
	}
	};


	const getDashboardStats = async (req, res) => {
    const { id: userId, role } = req.user;

    try {
      if (role === "ADMIN" || role === "MENTOR") {
        const [taskCount, quizCount, userCount] = await prisma.$transaction([
          prisma.task.count(),
          prisma.quiz.count(),
          prisma.user.count(),
        ]);

        return res.json({
          message: "Statistik Admin/Mentor berhasil diambil.",
          data: {
            tasks: taskCount,
            quizzes: quizCount,
            users: userCount,
          },
        });
      } else if (role === "STUDENT") {
        const now = new Date();

        const allTasksPromise = prisma.task.findMany({ select: { id: true } });
        const studentSubmissionsPromise = prisma.submission.findMany({
          where: { studentId: userId },
          select: { taskId: true },
        });
        const availableQuizzesPromise = prisma.quiz.count({
          where: {
            deadline: { gte: now },
            NOT: { quizAttempts: { some: { studentId: userId } } },
          },
        });

        const [allTasks, studentSubmissions, availableQuizzesCount] =
          await Promise.all([
            allTasksPromise,
            studentSubmissionsPromise,
            availableQuizzesPromise,
          ]);

        const submittedTaskIds = new Set(
          studentSubmissions.map((sub) => sub.taskId)
        );
        const activeTasksCount = allTasks.filter(
          (task) => !submittedTaskIds.has(task.id)
        ).length;
        const completedTasksCount = submittedTaskIds.size;

        return res.json({
          message: "Statistik Siswa berhasil diambil.",
          data: {
            activeTasks: activeTasksCount,
            availableQuizzes: availableQuizzesCount,
            completedTasks: completedTasksCount,
          },
        });
      } else {
        return res.status(403).json({ message: "Peran tidak dikenali." });
      }
    } catch (error) {
      console.error("Get dashboard stats error:", error);
      res.status(500).json({
        message: "Gagal mengambil statistik dashboard.",
        error: error.message,
      });
    }
  };
  const getStudentStats = async (req, res) => {
    const studentId = req.user.id;

    try {
      const [taskSubmissions, quizAttempts] = await prisma.$transaction([
        prisma.submission.findMany({
          where: { studentId: studentId },
          select: { grade: true },
        }),
        prisma.quizAttempt.findMany({
          where: { studentId: studentId },
          select: { score: true },
        }),
      ]);

      const completedTasks = taskSubmissions.length;
      const gradedTasks = taskSubmissions.filter((sub) => sub.grade !== null);
      const totalTaskGrade = gradedTasks.reduce(
        (sum, sub) => sum + (sub.grade || 0),
        0
      );
      const averageTaskGrade =
        gradedTasks.length > 0 ? totalTaskGrade / gradedTasks.length : null;

      const completedQuizzes = quizAttempts.length;
      const totalQuizScore = quizAttempts.reduce(
        (sum, attempt) => sum + attempt.score,
        0
      );
      const averageQuizScore =
        completedQuizzes > 0 ? totalQuizScore / completedQuizzes : null;

      const responseData = {
        taskStats: {
          completedCount: completedTasks,
          averageGrade: averageTaskGrade,
        },
        quizStats: {
          completedCount: completedQuizzes,
          averageScore: averageQuizScore,
        },
      };

      res.json({
        message: "Statistik pribadi berhasil diambil.",
        data: responseData,
      });
    } catch (error) {
      console.error("Get student stats error:", error);
      res
        .status(500)
        .json({
          message: "Gagal mengambil statistik pribadi.",
          error: error.message,
        });
    }
  };
  

	  
	module.exports = {
	getDashboardStats,
	getDetailedStats,
	getStudentStats
	};
