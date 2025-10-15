const prisma = require("../prismaClient");

const createMaterial = async (req, res) => {
  const { title, description, driveUrl, thumbnailUrl } = req.body;
  const authorId = req.user.id;

  if (!title || !driveUrl) {
    return res
      .status(400)
      .json({ message: "Judul dan URL Google Drive wajib diisi." });
  }

  try {
    const newMaterial = await prisma.material.create({
      data: {
        title,
        description,
        driveUrl,
        thumbnailUrl: thumbnailUrl || null,
        authorId,
      },
    });
    res
      .status(201)
      .json({ message: "Materi berhasil dibuat.", data: newMaterial });
  } catch (error) {
    console.error("Create material error:", error);
    res.status(500).json({ message: "Gagal membuat materi." });
  }
};

const getAllMaterials = async (req, res) => {
  try {
    const materials = await prisma.material.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: { name: true } },
      },
    });
    res.json({ message: "Berhasil mengambil semua materi.", data: materials });
  } catch (error) {
    console.error("Get all materials error:", error);
    res.status(500).json({ message: "Gagal mengambil materi." });
  }
};

const updateMaterial = async (req, res) => {
  const { materialId } = req.params;
  const { title, description, driveUrl, thumbnailUrl } = req.body;

  try {
    const updatedMaterial = await prisma.material.update({
      where: { id: materialId },
      data: {
        title,
        description,
        driveUrl,
        thumbnailUrl,
      },
    });
    res.json({ message: "Materi berhasil diperbarui.", data: updatedMaterial });
  } catch (error) {
    console.error("Update material error:", error);
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Materi tidak ditemukan." });
    }
    res.status(500).json({ message: "Gagal memperbarui materi." });
  }
};

const deleteMaterial = async (req, res) => {
  const { materialId } = req.params;
  try {
    await prisma.material.delete({
      where: { id: materialId },
    });
    res.json({ message: "Materi berhasil dihapus." });
  } catch (error) {
    console.error("Delete material error:", error);
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Materi tidak ditemukan." });
    }
    res.status(500).json({ message: "Gagal menghapus materi." });
  }
};

module.exports = {
  createMaterial,
  getAllMaterials,
  deleteMaterial,
  updateMaterial,
};
