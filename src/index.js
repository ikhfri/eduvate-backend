
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

const app = express();
const PORT = process.env.PORT || 3001; 

// Middleware
app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
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