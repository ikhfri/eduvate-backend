
const prisma = require("../prismaClient");


const updateUserProfile = async (req, res) => {
  const userId = req.user.id;
  const { name } = req.body;

  if (!name || name.trim() === "") {
    return res.status(400).json({ message: "Nama tidak boleh kosong." });
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name: name,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    res.json({ message: "Profil berhasil diperbarui.", user: updatedUser });
  } catch (error) {
    console.error("Update user profile error:", error);
    res
      .status(500)
      .json({ message: "Gagal memperbarui profil.", error: error.message });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
    res.json({ message: "Berhasil mengambil daftar pengguna.", data: users });
  } catch (error) {
    console.error("Get all users error:", error);
    res
      .status(500)
      .json({
        message: "Gagal mengambil daftar pengguna.",
        error: error.message,
      });
  }
};


const deleteUser = async (req, res) => {
  const { userId } = req.params;
  const adminId = req.user.id;

  if (userId === adminId) {
    return res
      .status(400)
      .json({
        message:
          "Admin tidak dapat menghapus akunnya sendiri melalui endpoint ini.",
      });
  }

  try {

    await prisma.user.delete({
      where: { id: userId },
    });

    res.json({ message: "Pengguna berhasil dihapus." });
  } catch (error) {
    console.error("Delete user error:", error);
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Pengguna tidak ditemukan." });
    }
    if (error.code === "P2003") {
      return res
        .status(409)
        .json({
          message:
            "Gagal menghapus: Pengguna ini masih terhubung dengan data lain (misalnya sebagai pembuat tugas atau kuis).",
        });
    }
    res
      .status(500)
      .json({ message: "Gagal menghapus pengguna.", error: error.message });
  }
};

const updateUserRole = async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;
  const adminId = req.user.id;

  if (!["ADMIN", "MENTOR", "STUDENT"].includes(role)) {
    return res
      .status(400)
      .json({ message: "Peran yang diberikan tidak valid." });
  }

  if (userId === adminId) {
    return res
      .status(400)
      .json({ message: "Admin tidak dapat mengubah perannya sendiri." });
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: role },
      select: { id: true, name: true, email: true, role: true }, 
    });
    res.json({
      message: `Peran untuk pengguna ${
        updatedUser.name || updatedUser.email
      } berhasil diubah.`,
      data: updatedUser,
    });
  } catch (error) {
    console.error("Update user role error:", error);
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Pengguna tidak ditemukan." });
    }
    res
      .status(500)
      .json({
        message: "Gagal mengubah peran pengguna.",
        error: error.message,
      });
  }
};

module.exports = {
  getAllUsers,
  deleteUser,
  updateUserRole,
  updateUserProfile,
};
