const User = require("../models/user");
const EmployerProfile = require("../models/EmployerProfile");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const PasswordReset = require("../models/PasswordReset");
const RefreshToken = require("../models/RefreshToken");
const {
  refreshAdminDashboard,
} = require("../services/socketService");

// ==========================================
// REGISTER
// ==========================================
const register = async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;

    // Block public admin account creation.
    if (role === "admin") {
      return res.status(403).json({
        message: "Admin accounts cannot be created publicly.",
      });
    }

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        message: "Name, email, password and role are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(400).json({
        message: "Email already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role,
      phone,
    });

    // Create employer profile.
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
    }

    // Candidate profiles are completed later through
    // the Profile Builder.

    // Refresh admin dashboard without delaying registration.
    Promise.resolve(refreshAdminDashboard()).catch((error) => {
      console.error(
        "ADMIN DASHBOARD REFRESH ERROR:",
        error.message
      );
    });

    // Never return the password.
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
      message: "Registration failed. Please try again.",
    });
  }
};

// ==========================================
// LOGIN
// ==========================================
const login = async (req, res) => {
  const startTime = Date.now();

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid credentials",
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

    // Update last login without blocking authentication.
    User.updateOne(
      { _id: user._id },
      {
        $set: {
          lastLogin: new Date(),
        },
      }
    ).catch((error) => {
      console.error(
        "LAST LOGIN UPDATE ERROR:",
        error.message
      );
    });

    // Generate access token.
    const token = createAccessToken(user);

    let refreshToken = null;

    // Issue a persistent refresh token only when requested.
    if (req.body.keepLoggedIn === true) {
      refreshToken = await createRefreshToken(user);
    }

    // Remove password from response.
    const {
      password: removedPassword,
      ...userWithoutPassword
    } = user.toObject();

    console.log(`[LOGIN] ${Date.now() - startTime}ms`);

    return res.json({
      token,
      refreshToken,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);

    return res.status(500).json({
      message: "Login failed. Please try again.",
    });
  }
};

// ==========================================
// PASSWORD RESET EMAIL CONFIGURATION
// ==========================================
const passwordResetTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 465),
  secure:
    String(process.env.SMTP_SECURE).toLowerCase() === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ==========================================
// FORGOT PASSWORD
// POST /api/auth/forgot-password
// ==========================================
const forgotPassword = async (req, res) => {
  try {
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Please provide your email address.",
      });
    }

    const user = await User.findOne({ email });

    // Do not disclose whether an account exists.
    const genericMessage =
      "If an account exists for that email, password reset instructions will be sent.";

    if (!user) {
      return res.status(200).json({
        success: true,
        message: genericMessage,
      });
    }

    // Invalidate previous reset tokens.
    await PasswordReset.deleteMany({
      user: user._id,
    });

    // Generate a secure, one-time token.
    const rawToken = crypto.randomBytes(32).toString("hex");

    // Store only the token hash.
    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    const expiresAt = new Date(
      Date.now() + 30 * 60 * 1000
    );

    await PasswordReset.create({
      user: user._id,
      tokenHash,
      expiresAt,
    });

    const resetBaseUrl = process.env.PASSWORD_RESET_URL;

    if (!resetBaseUrl) {
      await PasswordReset.deleteMany({
        user: user._id,
      });

      console.error(
        "PASSWORD_RESET_URL is not configured."
      );

      return res.status(500).json({
        success: false,
        message: "Password reset is temporarily unavailable.",
      });
    }

    const separator = resetBaseUrl.includes("?")
      ? "&"
      : "?";

    const resetUrl =
      `${resetBaseUrl}${separator}token=${encodeURIComponent(rawToken)}`;

    // Escape user-provided name for HTML.
    const safeName = String(user.name || "there")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

    try {
      await passwordResetTransporter.sendMail({
        from:
          process.env.SMTP_FROM ||
          process.env.SMTP_USER,
        to: user.email,
        subject: "Reset your Nakky Academy password",
        text: [
          `Hello ${user.name || "there"},`,
          "",
          "We received a request to reset your Nakky Academy password.",
          "",
          "Open this link to choose a new password:",
          resetUrl,
          "",
          "This link expires in 30 minutes and can only be used once.",
          "If you did not request this reset, you can ignore this email.",
          "",
          "Nakky Academy",
        ].join("\n"),
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#222;">
            <h2 style="color:#d41475;">Nakky Academy</h2>
            <p>Hello ${safeName},</p>
            <p>We received a request to reset your Nakky Academy password.</p>
            <p>
              <a href="${resetUrl}"
                 style="display:inline-block;background:#d41475;color:#fff;padding:12px 20px;text-decoration:none;border-radius:6px;">
                Reset Password
              </a>
            </p>
            <p>This link expires in 30 minutes and can only be used once.</p>
            <p>If you did not request this reset, you can ignore this email.</p>
            <p>Nakky Academy</p>
          </div>
        `,
      });
    } catch (emailError) {
      await PasswordReset.deleteMany({
        user: user._id,
      });

      console.error(
        "Password reset email failed:",
        emailError.message
      );

      return res.status(503).json({
        success: false,
        message:
          "Unable to send the reset email right now. Please try again later.",
      });
    }

    return res.status(200).json({
      success: true,
      message: genericMessage,
    });
  } catch (error) {
    console.error(
      "Forgot password error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to process the password reset request.",
    });
  }
};

// ==========================================
// RESET PASSWORD
// POST /api/auth/reset-password
// ==========================================
const resetPassword = async (req, res) => {
  try {
    const token = String(req.body.token || "").trim();
    const newPassword = req.body.newPassword;

    if (!token || typeof newPassword !== "string") {
      return res.status(400).json({
        success: false,
        message:
          "A reset token and new password are required.",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message:
          "Your new password must be at least 8 characters long.",
      });
    }

    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const resetRecord = await PasswordReset.findOne({
      tokenHash,
      usedAt: null,
      expiresAt: { $gt: new Date() },
    });

    if (!resetRecord) {
      return res.status(400).json({
        success: false,
        message:
          "This password reset link is invalid or has expired. Please request a new one.",
      });
    }

    const user = await User.findById(resetRecord.user);

    if (!user) {
      await PasswordReset.deleteMany({
        user: resetRecord.user,
      });

      return res.status(400).json({
        success: false,
        message:
          "This password reset link is invalid or has expired. Please request a new one.",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    // Remove all reset tokens for this user.
    await PasswordReset.deleteMany({
      user: user._id,
    });

    // Revoke existing refresh tokens after password reset.
    await RefreshToken.updateMany(
      {
        user: user._id,
        revokedAt: null,
      },
      {
        $set: {
          revokedAt: new Date(),
        },
      }
    );

    return res.status(200).json({
      success: true,
      message:
        "Your password has been reset successfully. You can now log in.",
    });
  } catch (error) {
    console.error(
      "Reset password error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to reset your password right now. Please try again later.",
    });
  }
};

// ==========================================
// ACCESS TOKEN
// ==========================================
const createAccessToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured.");
  }

  return jwt.sign(
    {
      id: user._id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "15m",
    }
  );
};

// ==========================================
// REFRESH TOKEN HELPERS
// ==========================================
const hashRefreshToken = (token) => {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
};

const createRefreshToken = async (user) => {
  if (!process.env.JWT_REFRESH_SECRET) {
    throw new Error(
      "JWT_REFRESH_SECRET is not configured."
    );
  }

  const token = jwt.sign(
    {
      id: user._id.toString(),
      type: "refresh",
    },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: "30d",
    }
  );

  const decoded = jwt.decode(token);

  await RefreshToken.create({
    user: user._id,
    tokenHash: hashRefreshToken(token),
    expiresAt: new Date(decoded.exp * 1000),
  });

  return token;
};

// ==========================================
// REFRESH SESSION
// POST /api/auth/refresh
// ==========================================
const refreshSession = async (req, res) => {
  try {
    const token = req.body.refreshToken;

    if (
      typeof token !== "string" ||
      !token ||
      !process.env.JWT_REFRESH_SECRET
    ) {
      return res.status(401).json({
        message: "A valid refresh token is required.",
      });
    }

    let decoded;

    try {
      decoded = jwt.verify(
        token,
        process.env.JWT_REFRESH_SECRET
      );
    } catch (_error) {
      return res.status(401).json({
        message:
          "Your session has expired. Please log in again.",
      });
    }

    if (decoded.type !== "refresh") {
      return res.status(401).json({
        message: "Invalid refresh token.",
      });
    }

    const tokenHash = hashRefreshToken(token);
    const now = new Date();

    // Revoke the old token so it cannot be reused.
    const storedToken =
      await RefreshToken.findOneAndUpdate(
        {
          user: decoded.id,
          tokenHash,
          revokedAt: null,
          expiresAt: { $gt: now },
        },
        {
          $set: {
            revokedAt: now,
          },
        },
        {
          new: true,
        }
      );

    if (!storedToken) {
      return res.status(401).json({
        message:
          "Session is invalid or has already been used.",
      });
    }

    const user = await User.findById(decoded.id);

    if (!user || user.accountStatus === "inactive") {
      return res.status(401).json({
        message:
          "Your account is unavailable. Please log in again.",
      });
    }

    const accessToken = createAccessToken(user);
    const refreshToken = await createRefreshToken(user);

    const {
      password: removedPassword,
      ...userWithoutPassword
    } = user.toObject();

    return res.json({
      token: accessToken,
      refreshToken,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error(
      "REFRESH SESSION ERROR:",
      error.message
    );

    return res.status(500).json({
      message: "Unable to refresh your session.",
    });
  }
};

// ==========================================
// LOGOUT
// POST /api/auth/logout
// ==========================================
const logout = async (req, res) => {
  try {
    const token = req.body.refreshToken;

    if (typeof token === "string" && token) {
      await RefreshToken.updateOne(
        {
          tokenHash: hashRefreshToken(token),
          revokedAt: null,
        },
        {
          $set: {
            revokedAt: new Date(),
          },
        }
      );
    }

    return res.json({
      success: true,
      message: "Logged out successfully.",
    });
  } catch (error) {
    console.error("LOGOUT ERROR:", error.message);

    return res.status(500).json({
      message: "Unable to log out securely.",
    });
  }
};

// ==========================================
// EXPORTS
// ==========================================
module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
  refreshSession,
  logout,
};
