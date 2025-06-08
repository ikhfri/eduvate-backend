const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function seedAdmin() {
  try {
    // Hash the admin password
    const hashedPassword = await bcrypt.hash("2wsx1qaz", 10); // Replace "admin123" with a secure password

    // Create the admin user
    const admin = await prisma.user.create({
      data: {
        email: "admin@nevtik.org", // Replace with desired admin email
        password: hashedPassword,
        name: "Nevtik Admin",
        role: "ADMIN",
      },
    });

    console.log("Admin user created successfully:", admin.email);
  } catch (error) {
    console.error("Error seeding admin user:", error);
  } finally {
    await prisma.$disconnect();
  }
}

seedAdmin();
