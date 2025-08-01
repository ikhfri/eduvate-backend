const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");

const prisma = new PrismaClient();

async function seedUsers() {
  const users = [];
  const filePath = path.join(__dirname, "users.csv");

  // Baca CSV
  await new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => users.push(row))
      .on("end", resolve)
      .on("error", reject);
  });

  console.log(`Membaca ${users.length} user dari CSV...`);

  for (const user of users) {
    try {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      await prisma.user.create({
        data: {
          name: user.name,
          email: user.email,
          password: hashedPassword,
          role: user.role || "USER",
        },
      });
      console.log(`User ${user.name} berhasil dibuat`);
    } catch (err) {
      console.error(`Gagal membuat user ${user.name}:`, err.message);
    }
  }

  await prisma.$disconnect();
}

seedUsers().catch((err) => {
  console.error(err);
  prisma.$disconnect();
});
