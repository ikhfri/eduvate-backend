// D:\backend_lms\src\controllers\attendanceController.js

const prisma = require("../prismaClient");
const {
  startOfWeek,
  endOfWeek,
  startOfDay,
  endOfDay,
  parseISO,
  addDays, // <-- Sering lupa diimpor
  format, // <-- Sering lupa diimpor
} = require("date-fns");
const { id: localeID } = require("date-fns/locale"); // <-- UBAH DI SINI. Impor locale sekali saja.

const xlsx = require("xlsx"); // Pastikan Anda sudah menginstal xlsx

/**
 * [STUDENT] Mengajukan izin untuk hari ini.
 */
const requestLeave = async (req, res) => {
  const studentId = req.user.id;
  const { notes } = req.body;
  const today = startOfDay(new Date());

  try {
    const existingAttendance = await prisma.attendance.findUnique({
      where: { studentId_date: { studentId, date: today } },
    });
    if (existingAttendance) {
      return res
        .status(409)
        .json({
          message: `Anda sudah memiliki status absensi '${existingAttendance.status}' untuk hari ini.`,
        });
    }
    const newLeaveRequest = await prisma.attendance.create({
      data: { studentId, date: today, status: "IZIN", notes },
    });
    res
      .status(201)
      .json({
        message: "Pengajuan izin berhasil dicatat.",
        data: newLeaveRequest,
      });
  } catch (error) {
    res.status(500).json({ message: "Gagal mengajukan izin." });
  }
};

/**
 * [ADMIN/MENTOR] Menandai kehadiran siswa (Hadir/Alfa).
 */
const markAttendance = async (req, res) => {
  const { studentId, date, status } = req.body;
  const markedById = req.user.id;

  // FIX: Menggunakan parseISO untuk menghindari masalah timezone
  // Ini akan menginterpretasikan '2025-07-31' sebagai awal hari pada tanggal tersebut di zona waktu server
  const targetDate = startOfDay(parseISO(date));

  if (!["HADIR", "ALFA"].includes(status)) {
    return res.status(400).json({ message: "Status tidak valid." });
  }

  try {
    const attendanceRecord = await prisma.attendance.upsert({
      where: { studentId_date: { studentId, date: targetDate } },
      update: { status, markedById },
      create: { studentId, date: targetDate, status, markedById },
    });
    res.json({
      message: "Kehadiran berhasil ditandai.",
      data: attendanceRecord,
    });
  } catch (error) {
    res.status(500).json({ message: "Gagal menandai kehadiran." });
  }
};

/**
 * [ADMIN/MENTOR] Mengambil rekap absensi mingguan.
 */
const getWeeklyRecap = async (req, res) => {
  const { weekStartDate } = req.query;
  // FIX: Menggunakan parseISO untuk konsistensi
  const startDate = startOfWeek(
    parseISO(weekStartDate || new Date().toISOString()),
    { weekStartsOn: 1 }
  );
  const endDate = endOfWeek(
    parseISO(weekStartDate || new Date().toISOString()),
    { weekStartsOn: 1 }
  );

  try {
    const students = await prisma.user.findMany({
      where: { role: "STUDENT" },
      select: { id: true, name: true },
    });
    const attendances = await prisma.attendance.findMany({
      where: { date: { gte: startDate, lte: endDate } },
    });

    const recap = students.map((student) => {
      const studentAttendances = attendances.filter(
        (a) => a.studentId === student.id
      );
      return {
        studentId: student.id,
        name: student.name,
        records: studentAttendances.map((a) => ({
          date: a.date,
          status: a.status,
        })),
      };
    });

    res.json({ data: { recap, startDate, endDate } });
  } catch (error) {
    res.status(500).json({ message: "Gagal mengambil rekap mingguan." });
  }
};

/**
 * [ADMIN/MENTOR] Mengambil riwayat absensi per siswa.
 */
const getAttendanceHistoryByStudent = async (req, res) => {
  const { studentId } = req.params;

  try {
    // Ambil data siswa dan riwayat absensinya secara bersamaan
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        name: true,
        email: true,
        attendances: {
          // Ini akan mengambil relasi absensi
          orderBy: {
            date: "desc", // Urutkan dari yang terbaru
          },
        },
      },
    });

    if (!student) {
      return res.status(404).json({ message: "Siswa tidak ditemukan." });
    }

    // Ubah nama relasi agar lebih jelas di frontend
    const responseData = {
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
      },
      history: student.attendances,
    };

    res.json({ data: responseData });
  } catch (error) {
    res.status(500).json({ message: "Gagal mengambil riwayat siswa." });
  }
};

/**
 * [BARU] Mengekspor rekap mingguan ke Excel.
 */
const exportWeeklyRecap = async (req, res) => {
  console.log("--- FUNGSI exportWeeklyRecap MULAI DIJALANKAN ---");
  try {
    const { weekStartDate } = req.query;
    const referenceDate = weekStartDate ? parseISO(weekStartDate) : new Date();
    const startDate = startOfWeek(referenceDate, { weekStartsOn: 1 });
    const endDate = endOfWeek(referenceDate, { weekStartsOn: 1 });

    const students = await prisma.user.findMany({
      where: { role: "STUDENT" },
      select: { id: true, name: true, email: true },
    });
    const attendances = await prisma.attendance.findMany({
      where: { date: { gte: startDate, lte: endDate } },
    });

    const weekDays = Array.from({ length: 7 }).map((_, i) => startOfDay(addDays(startDate, i)));

    const dataForExcel = students.map((student) => {
      const row = { "Nama Siswa": student.name || "N/A", Email: student.email };
      weekDays.forEach((day) => {
        const columnHeader = format(day, "EEE, dd MMM", { locale: localeID }); // <-- PERBAIKAN DI SINI
        const record = attendances.find((a) => a.studentId === student.id && startOfDay(a.date).getTime() === day.getTime());
        row[columnHeader] = record ? record.status : "-";
      });
      return row;
    });

    const worksheet = xlsx.utils.json_to_sheet(dataForExcel);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Rekap Mingguan");

    const filename = `rekap-absensi-mingguan-${format(startDate, "yyyy-MM-dd")}.xlsx`;
    const buffer = xlsx.write(workbook, { bookType: "xlsx", type: "buffer" });

    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buffer);
  } catch (error) {
    console.error("ERROR EXPORT REKAP MINGGUAN:", error); // Tambahkan log error detail
    res.status(500).json({ message: "Gagal mengekspor rekap.", error: error.message });
  }
};
/**
 * [BARU] Mengekspor riwayat absensi satu siswa ke Excel.
 */
const exportStudentHistory = async (req, res) => {
  console.log("--- FUNGSI exportStudentHistory MULAI DIJALANKAN ---");
  try {
    const { studentId } = req.params;
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { name: true, email: true },
    });
    if (!student) return res.status(404).json({ message: "Siswa tidak ditemukan." });

    const history = await prisma.attendance.findMany({
      where: { studentId },
      orderBy: { date: "desc" },
    });

    const dataForExcel = history.map((rec) => ({
      Tanggal: format(new Date(rec.date), "EEEE, dd MMMM yyyy", {
        locale: localeID, // <-- PERBAIKAN DI SINI
      }),
      Status: rec.status,
      Catatan: rec.notes || "-",
    }));

    const worksheet = xlsx.utils.json_to_sheet(dataForExcel);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Riwayat Absensi");

    const filename = `riwayat-absensi-${student.name?.replace(/\s+/g, "-") || student.email}.xlsx`;
    const buffer = xlsx.write(workbook, { bookType: "xlsx", type: "buffer" });

    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buffer);
  } catch (error) {
    console.error("ERROR EXPORT RIWAYAT SISWA:", error); // Tambahkan log error detail
    res.status(500).json({ message: "Gagal mengekspor riwayat.", error: error.message });
  }
};
const getDailyRecap = async (req, res) => {
  const { date } = req.query; // Mengharapkan format 'yyyy-MM-dd'
  if (!date) {
    return res.status(400).json({ message: "Parameter tanggal dibutuhkan." });
  }

  const targetDate = startOfDay(parseISO(date));

  try {
    // 1. Ambil semua siswa
    const students = await prisma.user.findMany({
      where: { role: "STUDENT" },
      select: { id: true, name: true, email: true },
    });

    // 2. Ambil data absensi hanya untuk tanggal yang dipilih
    const attendances = await prisma.attendance.findMany({
      where: {
        date: targetDate,
      },
      select: {
        studentId: true,
        status: true,
        notes: true,
      },
    });

    // 3. Buat map untuk pencarian cepat
    const attendanceMap = new Map(
      attendances.map((a) => [
        a.studentId,
        { status: a.status, notes: a.notes },
      ])
    );

    // 4. Gabungkan daftar siswa dengan status absensi mereka
    const dailyRecap = students.map((student) => ({
      ...student,
      attendance: attendanceMap.get(student.id) || null, // null jika belum ada catatan
    }));

    res.json({ data: dailyRecap });
  } catch (error) {
    console.error("Get daily recap error:", error);
    res
      .status(500)
      .json({ message: "Gagal mengambil rekap harian.", error: error.message });
  }
};

const checkInWithQR = async (req, res) => {
  const { studentId } = req.body;
  const markedById = req.user.id; // ID Admin/Mentor yang melakukan scan
  const today = startOfDay(new Date());

  if (!studentId) {
    return res.status(400).json({ message: "ID Siswa tidak valid." });
  }

  try {
    // 1. Verifikasi apakah siswa ada
    const student = await prisma.user.findUnique({
      where: { id: studentId, role: "STUDENT" },
    });

    if (!student) {
      return res.status(404).json({ message: "Siswa tidak ditemukan." });
    }

    // 2. Cek apakah siswa sudah absen hari ini
    const existingAttendance = await prisma.attendance.findUnique({
      where: { studentId_date: { studentId, date: today } },
    });

    if (existingAttendance) {
      return res
        .status(409)
        .json({ message: `Sudah Absen: ${student.name || student.email}` });
    }

    // 3. Buat catatan kehadiran baru
    await prisma.attendance.create({
      data: {
        studentId,
        date: today,
        status: "HADIR",
        markedById,
      },
    });

    res
      .status(201)
      .json({ message: `Absen Berhasil: ${student.name || student.email}` });
  } catch (error) {
    console.error("QR Check-in error:", error);
    res.status(500).json({ message: "Terjadi kesalahan pada server." });
  }
};

module.exports = {
  requestLeave,
  markAttendance,
  getWeeklyRecap,
  getAttendanceHistoryByStudent,
  getDailyRecap, // <-- Tambahkan fungsi baru ini
  exportWeeklyRecap, // <-- Tambahkan
  exportStudentHistory, // <-- Tambahkan
  checkInWithQR, // <-- Tambahkan fungsi baru ini
};
