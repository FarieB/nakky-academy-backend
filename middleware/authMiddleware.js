const jwt = require("jsonwebtoken");
const User = require("../models/user");

const protect = async (req, res, next) => {
  let token = "";

  if (!req.headers.authorization?.startsWith("Bearer")) {
    return res.status(401).json({
      message: "Not authorized, no token",
    });
  }

  token = req.headers.authorization.split(" ")[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    const user = await User.findById(decoded.id).select(
      "-password"
    );

    if (!user) {
      return res.status(401).json({
        message: "User account not found.",
      });
    }

    // ==========================================
    // ACCOUNT STATUS CHECK
    // ==========================================

    if (user.accountStatus === "inactive") {
      return res.status(403).json({
        message:
          "Your account has been deactivated. Please contact Nakky Academy.",
        accountStatus: "inactive",
      });
    }

    req.user = user;

    next();
  } catch (_err) {
    return res.status(401).json({
      message: "Not authorized, token failed",
    });
  }

  return null;
};

module.exports = protect;
