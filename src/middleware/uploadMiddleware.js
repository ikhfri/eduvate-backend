const multer = require("multer");

// Gunakan memory storage untuk menyimpan file di memori (buffer)
const storage = multer.memoryStorage();

// Filter file: terima file dokumen dan juga semua jenis gambar (image)
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    "application/pdf",
    "application/zip",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/jpeg",
    "image/png",
    "application/vnd.ms-excel", // .xls
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
    "image/gif",
    "image/webp",
    "image/svg+xml",
    "image/bmp",
    "image/tiff",
  ];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Tipe file tidak diizinkan. Hanya PDF, ZIP, DOC, DOCX dan semua jenis foto (JPEG, PNG, GIF, dll) yang diperbolehkan."
      ),
      false
    );
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 1024 * 1024 * 3, // 3MB max
  },
  fileFilter,
});

module.exports = upload;
