// backend/src/controllers/authController.js
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../prismaClient"); // Path disesuaikan

// --- /api/auth/register ---
const register = async (req, res) => {
  // POST
  const { email, password, name, role } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email dan password dibutuhkan." });
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "Email sudah terdaftar." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: role || "STUDENT",
      },
    });

    const userResponse = {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
    };
    res
      .status(201)
      .json({ message: "Registrasi berhasil.", user: userResponse });
  } catch (error) {
    console.error("Register error:", error);
    res
      .status(500)
      .json({
        message: "Terjadi kesalahan saat registrasi.",
        error: error.message,
      });
  }
};
const handleRegisterNotImplemented = (req, res) =>
  res.status(501).json({ message: "Not Implemented" });

// --- /api/auth/login ---
const login = async (req, res) => {
  // POST
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email dan password dibutuhkan." });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: "Email atau password salah." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Email atau password salah." });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    const userResponse = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
    res.json({ message: "Login berhasil.", token, user: userResponse });
  } catch (error) {
    console.error("Login error:", error);
    res
      .status(500)
      .json({ message: "Terjadi kesalahan saat login.", error: error.message });
  }
};
const handleLoginNotImplemented = (req, res) =>
  res.status(501).json({ message: "Not Implemented" });

// --- /api/auth/me ---
const getCurrentUser = async (req, res) => {
  // GET
  if (!req.user) {
    return res.status(401).json({ message: "Tidak terautentikasi." });
  }
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });
    if (!user) {
      return res.status(404).json({ message: "Pengguna tidak ditemukan." });
    }
    res.json(user);
  } catch (error) {
    console.error("Error fetching current user:", error);
    res
      .status(500)
      .json({ message: "Kesalahan server saat mengambil data pengguna." });
  }
};
const handleMeNotImplemented = (req, res) =>
  res.status(501).json({ message: "Not Implemented" });

const handleOptions = (req, res) => {
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD"
  );
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.sendStatus(204);
};

module.exports = {
  register,
  putRegister: handleRegisterNotImplemented,
  deleteRegister: handleRegisterNotImplemented,
  patchRegister: handleRegisterNotImplemented,
  optionsRegister: handleOptions,
  headRegister: handleRegisterNotImplemented,

  login,
  putLogin: handleLoginNotImplemented,
  deleteLogin: handleLoginNotImplemented,
  patchLogin: handleLoginNotImplemented,
  optionsLogin: handleOptions,
  headLogin: handleLoginNotImplemented,

  getCurrentUser,
  postMe: handleMeNotImplemented,
  putMe: handleMeNotImplemented,
  deleteMe: handleMeNotImplemented,
  patchMe: handleMeNotImplemented,
  optionsMe: handleOptions,
  headMe: handleMeNotImplemented,
};
