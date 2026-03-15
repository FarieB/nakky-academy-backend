const User = require("../models/user");

const adminOnly = async (req, res, next) => {
  try {

    const user = await User.findById(req.user.id);

    if (!user || user.role !== "admin") {
      return res.status(403).json({
        message: "Admin access required"
      });
    }

    next();

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = adminOnly;