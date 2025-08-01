
const path = require('path'); // PASTIKAN INI DI BARIS PALING ATAS setelah komentar


// Muat variabel lingkungan dari file .env HANYA jika bukan environment 'test'
// Untuk 'test', jest.setup.js akan menangani pemuatan .env.test

    // else {
    //    console.log('File .env berhasil dimuat untuk environment dev/production.');
    // }


const express = require('express');
const cors = require('cors');
const fs = require('fs');
const multer = require('multer'); 
const questionsController = require("./controllers/questionsController");
const statsRoutes = require("./routes/statsRoutes");
const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');
const userRoutes = require('./routes/userRoutes'); // <-- TAMBAHKAN BARIS INI
const quizRoutes = require('./routes/quizRoutes'); 
const { authenticateToken } = require('./middleware/authMiddleware'); 
const rankingRoutes = require('./routes/rankingRoutes'); // <-- 1. Impor di sini
const materialRoutes = require("./routes/materialRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes")
const app = express();
const PORT = process.env.PORT || 3001; 
const allowedOrigins = ["https://lms.nevtik.org", "https://tkj.nevtik.org", "http://localhost:3000"]; // <-- 2. Tambahkan origin yang diizinkan
const cookieParser = require("cookie-parser");
app.use(cookieParser());

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg =
          "The CORS policy for this site does not allow access from the specified Origin.";
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true, // kalau perlu kirim cookie atau auth header
  })
);

app.use(express.json()); 
app.use(express.urlencoded({ extended: true })); 



// Rute
app.get('/', (req, res) => {
  res.send('Selamat datang di LMS Backend API!');
});

app.use('/api/auth', authRoutes);
app.use('/api/users', authenticateToken, userRoutes); // <-- DAN TAMBAHKAN BARIS INI
app.use('/api/tasks', authenticateToken, taskRoutes); 
app.use('/api/quizzes', authenticateToken, quizRoutes); 
app.use('/api/questions', authenticateToken, questionsController);  
app.use("/api/stats",authenticateToken, statsRoutes);
app.use("/api/rankings", rankingRoutes);
app.use("/api/materials", materialRoutes);
app.use("/api/attendance", attendanceRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Global error handler:", err); 
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: `Multer error: ${err.message}` });
  } else if (err.message && err.message.startsWith('Tipe file tidak diizinkan')) { 
    return res.status(400).json({ message: err.message });
  } else if (err.status) { 
    return res.status(err.status).json({ message: err.message });
  }
  res.status(500).send({ message: 'Terjadi kesalahan pada server!', error: err.message });
});

if (require.main === module && process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
  });
}

module.exports = app;