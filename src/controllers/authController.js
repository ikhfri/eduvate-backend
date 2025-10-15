const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../prismaClient");

const register = async (req, res) => {
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
    res.status(500).json({
      message: "Terjadi kesalahan saat registrasi.",
      error: error.message,
    });
  }
};

const handleRegisterNotImplemented = (req, res) =>
  res.status(501).json({ message: "Not Implemented" });

const login = async (req, res) => {
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

const getCurrentUser = async (req, res) => {
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

const changePassword = async (req, res) => {
  const userId = req.user.id;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res
      .status(400)
      .json({ message: "Password saat ini dan password baru wajib diisi." });
  }

  if (newPassword.length < 6) {
    return res
      .status(400)
      .json({ message: "Password baru minimal harus 6 karakter." });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ message: "Pengguna tidak ditemukan." });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Password saat ini salah." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    res.json({ message: "Password berhasil diubah." });
  } catch (error) {
    console.error("Change password error:", error);
    res
      .status(500)
      .json({ message: "Gagal mengubah password.", error: error.message });
  }
};

module.exports = {
  changePassword,
  login,
  register,
  getCurrentUser,
 
};
