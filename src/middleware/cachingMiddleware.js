// D:\backend_lms\src\middleware\cachingMiddleware.js

const mcache = require("memory-cache");

/**
 * Middleware untuk caching respons.
 * @param {number} duration - Durasi cache dalam menit.
 */
const cacheMiddleware = (duration) => {
  return (req, res, next) => {
    // Buat kunci unik untuk setiap URL request.
    // Contoh: '/api/quizzes' atau '/api/tasks?page=2'
    const key = "__express__" + req.originalUrl || req.url;

    // Coba ambil data dari cache
    const cachedBody = mcache.get(key);

    if (cachedBody) {
      // Jika data ada di cache (cache hit), langsung kirim respons
      console.log(`Mengambil dari Cache: ${key}`);
      res.send(cachedBody);
      return;
    } else {
      // Jika data tidak ada (cache miss), kita siapkan untuk menyimpan respons nanti
      console.log(`Cache tidak ditemukan, memproses: ${key}`);

      // Kita "bungkus" fungsi res.send yang asli
      const originalSend = res.send;

      // Definisikan fungsi send baru yang akan menyimpan hasilnya ke cache
      res.send = (body) => {
        // FIX: durasi diubah dari detik ke menit (menit * 60 * 1000)
        mcache.put(key, body, duration * 60 * 1000);
        // Panggil fungsi res.send yang asli untuk mengirim data ke pengguna
        originalSend.call(res, body);
      };

      // Lanjutkan ke controller berikutnya
      next();
    }
  };
};

module.exports = cacheMiddleware;
