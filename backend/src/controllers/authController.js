const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// ===============================
// ADMIN REGISTER
// ===============================
const register = async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      registrationKey,
    } = req.body;

    if (!username || !email || !password || !registrationKey) {
      return res.status(400).json({
        message:
          "Username, email, password and registration key are required",
      });
    }

    // Check registration key
    if (registrationKey !== process.env.ADMIN_REGISTRATION_KEY) {
      return res.status(403).json({
        message: "Invalid registration key",
      });
    }

    const cleanUsername = String(username).trim();
    const cleanEmail = String(email).trim().toLowerCase();

    if (cleanUsername.length < 3) {
      return res.status(400).json({
        message: "Username must contain at least 3 characters",
      });
    }

    if (!cleanEmail.includes("@")) {
      return res.status(400).json({
        message: "Invalid email address",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must contain at least 8 characters",
      });
    }

    // Check existing admin
    const existingAdmin = await pool.query(
      `
      SELECT id
      FROM admins
      WHERE username = $1
         OR email = $2
      LIMIT 1
      `,
      [cleanUsername, cleanEmail]
    );

    if (existingAdmin.rows.length > 0) {
      return res.status(409).json({
        message: "Username or email already registered",
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create admin
    const result = await pool.query(
      `
      INSERT INTO admins
        (username, email, password_hash, role)
      VALUES
        ($1, $2, $3, 'admin')
      RETURNING
        id,
        username,
        email,
        role,
        created_at
      `,
      [cleanUsername, cleanEmail, passwordHash]
    );

    return res.status(201).json({
      message: "Admin registered successfully",
      admin: result.rows[0],
    });

  } catch (error) {
    console.error("Admin registration error:", error);

    return res.status(500).json({
      message: "Admin registration failed",
    });
  }
};


// ===============================
// ADMIN LOGIN
// ===============================
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        message: "Username and password are required",
      });
    }

    const result = await pool.query(
      `
      SELECT
        id,
        username,
        email,
        password_hash,
        role
      FROM admins
      WHERE username = $1
      LIMIT 1
      `,
      [String(username).trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Invalid username or password",
      });
    }

    const admin = result.rows[0];

    const passwordMatch = await bcrypt.compare(
      password,
      admin.password_hash
    );

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid username or password",
      });
    }

    const token = jwt.sign(
      {
        id: admin.id,
        username: admin.username,
        role: admin.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "8h",
      }
    );

    return res.json({
      message: "Login successful",

      token,

      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
      },
    });

  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      message: "Login failed",
    });
  }
};

module.exports = {
  register,
  login,
};