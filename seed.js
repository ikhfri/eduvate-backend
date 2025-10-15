const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function seedAdmin() {
  try {
    const hashedPassword = await bcrypt.hash("2wsx1qaz", 10); 

    const admin = await prisma.user.create({
      data: {
        email: "admin@nupidstinger.com", 
        password: hashedPassword,
        name: "TEK Admin",
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
