const User = require("../models/user");
const EmployerProfile = require("../models/employerProfile");
const CandidateProfile = require("../models/candidateProfile");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const {
  refreshAdminDashboard,
} = require("../services/socketService");

// ==========================================
// Register
// ==========================================
const register = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      phone,
    } = req.body;

    // ==========================================
    // Block public admin account creation
    // ==========================================
    if (role === "admin") {
      return res.status(403).json({
        message: "Admin accounts cannot be created publicly.",
      });
    }

    // ==========================================
    // Check existing user
    // ==========================================
    const existingUser = await User.findOne({
      email,
    });

    if (existingUser) {
      return res.status(400).json({
        message: "Email already registered",
      });
    }

    // ==========================================
    // Hash password
    // ==========================================
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log("REGISTER BODY:", req.body);
    console.log("REGISTER ROLE:", role);

    // ==========================================
    // Create User
    // ==========================================
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      phone,
    });

    // ==========================================
    // Create Employer Profile
    // ==========================================
    if (role === "employer") {
      await EmployerProfile.create({
        user: user._id,
        contactPerson: name,
        employerType: "Private Household",
        householdName: "",
        province: "Not specified",
        city: "Not specified",
        suburb: "",
        profileActive: true,
        hiringStatus: "Looking",
      });

      console.log(
        "EMPLOYER PROFILE CREATED:",
        user._id.toString()
      );
    }

    // ==========================================
    // Create Candidate Profile
    // ==========================================
    if (role === "candidate") {
      await CandidateProfile.create({
        user: user._id,
        firstName: name,
        surname: "",
        profileActive: true,
        profileCompleted: false,
        profileVerified: false,
      });

      console.log(
        "CANDIDATE PROFILE CREATED:",
        user._id.toString()
      );
    }

    // ==========================================
    // Refresh admin dashboard
    // ==========================================
    refreshAdminDashboard();

    // ==========================================
    // Remove password from response
    // ==========================================
    const {
      password: removedPassword,
      ...userWithoutPassword
    } = user.toObject();

    return res.status(201).json({
      message: "User registered successfully",
      user: userWithoutPassword,
    });

  } catch (error) {
    console.error("REGISTER ERROR:", error);

    return res.status(500).json({
      message: error.message,
    });
  }
};

// ==========================================
// Login
// ==========================================
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({
      email,
    });

    if (!user) {
      return res.status(400).json({
        message: "User not found",
      });
    }

    const validPassword = await bcrypt.compare(
      password,
      user.password
    );

    if (!validPassword) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    user.lastLogin = new Date();

    await user.save();

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    const {
      password: removedPassword,
      ...userWithoutPassword
    } = user.toObject();

    return res.json({
      token,
      user: userWithoutPassword,
    });

  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  register,
  login,
};
