const User = require("../models/user");
const EmployerProfile = require("../models/EmployerProfile");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const PasswordReset = require("../models/PasswordReset");
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
    // Candidate Profile
    // ==========================================
    // IMPORTANT:
    // Candidate profiles are NOT created during
    // registration because surname and profilePhoto
    // are required by CandidateProfile.
    //
    // The candidate creates/completes the profile
    // later through Profile Builder.

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

  const startTime = Date.now();

  try {

    const {
      email,
      password,
    } = req.body;

    if (!email || !password) {

      return res.status(400).json({
        message:
          "Email and password are required.",
      });

    }

    const normalizedEmail =
      email
        .trim()
        .toLowerCase();

    // ===================================================
    // FIND USER
    // ===================================================

    const user =
      await User.findOne({
        email: normalizedEmail,
      });

    if (!user) {

      return res.status(400).json({
        message:
          "Invalid credentials",
      });

    }

    // ===================================================
    // PASSWORD
    // ===================================================

    const validPassword =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!validPassword) {

      return res.status(400).json({
        message:
          "Invalid credentials",
      });

    }

    // ===================================================
    // UPDATE LAST LOGIN
    // ===================================================
    // Do NOT make the user wait for this write.
    // It is not required to complete authentication.

    User.updateOne(
      {
        _id: user._id,
      },
      {
        $set: {
          lastLogin: new Date(),
        },
      }
    ).catch(
      (error) => {
        console.error(
          "LAST LOGIN UPDATE ERROR:",
          error.message
        );
      }
    );

    // ===================================================
    // JWT
    // ===================================================

    const token =
      jwt.sign(
        {
          id: user._id,
          role: user.role,
        },

        process.env.JWT_SECRET,

        {
          expiresIn: "7d",
        }
      );

    // ===================================================
    // RESPONSE USER
    // ===================================================

    const {
      password:
        removedPassword,
      ...userWithoutPassword
    } = user.toObject();

    console.log(
      `[LOGIN] ${Date.now() - startTime}ms`
    );

    return res.json({

      token,

      user:
        userWithoutPassword,

    });

  } catch (error) {

    console.error(
      "LOGIN ERROR:",
      error
    );

    return res.status(500).json({
      message:
        "Login failed. Please try again.",
    });

  }

};

// =====================================================
// PASSWORD RESET EMAIL CONFIGURATION
// =====================================================

const passwordResetTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE).toLowerCase() === "true",
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});


// =====================================================
// FORGOT PASSWORD
// POST /api/auth/forgot-password
// =====================================================

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

        // Invalidate previous reset tokens for this user.
        await PasswordReset.deleteMany({ user: user._id });

        // Generate a secure, one-time token.
        const rawToken = crypto.randomBytes(32).toString("hex");

        // Store only the hash, never the raw token.
        const tokenHash = crypto
            .createHash("sha256")
            .update(rawToken)
            .digest("hex");

        const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

        await PasswordReset.create({
            user: user._id,
            tokenHash,
            expiresAt,
        });

        const resetBaseUrl = process.env.PASSWORD_RESET_URL;

        if (!resetBaseUrl) {
            await PasswordReset.deleteMany({ user: user._id });

            console.error("PASSWORD_RESET_URL is not configured.");

            return res.status(500).json({
                success: false,
                message: "Password reset is temporarily unavailable.",
            });
        }

        const separator = resetBaseUrl.includes("?") ? "&" : "?";

        const resetUrl =
            `${resetBaseUrl}${separator}token=${encodeURIComponent(rawToken)}`;

        try {
            await passwordResetTransporter.sendMail({
                from: process.env.SMTP_FROM || process.env.SMTP_USER,
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
                        <p>Hello ${String(user.name || "there")
                            .replace(/&/g, "&amp;")
                            .replace(/</g, "&lt;")
                            .replace(/>/g, "&gt;")},</p>
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
            await PasswordReset.deleteMany({ user: user._id });

            console.error(
                "Password reset email failed:",
                emailError.message
            );

            return res.status(503).json({
                success: false,
                message: "Unable to send the reset email right now. Please try again later.",
            });
        }

        return res.status(200).json({
            success: true,
            message: genericMessage,
        });
    } catch (error) {
        console.error("Forgot password error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to process the password reset request.",
        });
    }
};


// =====================================================
// RESET PASSWORD
// POST /api/auth/reset-password
// =====================================================

const resetPassword = async (req, res) => {
    try {
        const token = String(req.body.token || "").trim();
        const newPassword = req.body.newPassword;

        if (!token || typeof newPassword !== "string") {
            return res.status(400).json({
                success: false,
                message: "A reset token and new password are required.",
            });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Your new password must be at least 8 characters long.",
            });
        }

        // Hash the submitted token to match the stored hash.
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
                message: "This password reset link is invalid or has expired. Please request a new one.",
            });
        }

        const user = await User.findById(resetRecord.user);

        if (!user) {
            await PasswordReset.deleteMany({ user: resetRecord.user });

            return res.status(400).json({
                success: false,
                message: "This password reset link is invalid or has expired. Please request a new one.",
            });
        }

        // Hash the new password using the same library as login/register.
        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        // Make the reset token unusable and remove any other reset tokens.
        await PasswordReset.deleteMany({ user: user._id });

        return res.status(200).json({
            success: true,
            message: "Your password has been reset successfully. You can now log in.",
        });
    } catch (error) {
        console.error("Reset password error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to reset your password right now. Please try again later.",
        });
    }
};

module.exports = {
    register,
    login,
    forgotPassword,
    resetPassword,
};
