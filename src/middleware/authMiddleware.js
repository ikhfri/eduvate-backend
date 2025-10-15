const jwt = require("jsonwebtoken");
const prisma = require("../prismaClient");

const authenticateToken = (req, res, next) => {
  if (req.method === "OPTIONS") {
    return next();
  }

  let token = null;
  const authHeader = req.headers["authorization"];
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res
      .status(401)
      .json({ message: "Unauthorized: Token tidak ditemukan." });
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, userData) => {
    if (err) {
      console.error("JWT Verification Error:", err.message);
      return res
        .status(403)
        .json({ message: "Forbidden: Token tidak valid atau kadaluarsa." });
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: userData.userId },
      });
      if (!user) {
        return res
          .status(403)
          .json({ message: "Forbidden: Pengguna tidak ditemukan." });
      }
      req.user = user;
      next();
    } catch (error) {
      console.error("Error fetching user in authMiddleware:", error);
      return res
        .status(500)
        .json({ message: "Kesalahan server saat otentikasi." });
    }
  });
};

const authorizeRole = (rolesAllowed) => {
  return (req, res, next) => {
    if (req.method === "OPTIONS") return next();

    console.log("AuthorizeRole - req.user:", req.user);
    console.log("AuthorizeRole - rolesAllowed:", rolesAllowed);
    console.log(
      "AuthorizeRole - req.user.role:",
      req.user ? req.user.role : "User object not found"
    );
    console.log(
      "AuthorizeRole - does rolesAllowed include req.user.role?:",
      req.user ? rolesAllowed.includes(req.user.role) : "N/A"
    );

    if (!req.user || !rolesAllowed.includes(req.user.role)) {
      return res.status(403).json({
        message: "Akses ditolak. Anda tidak memiliki peran yang sesuai.",
      });
    }
    next();
  };
};

module.exports = { authenticateToken, authorizeRole };
