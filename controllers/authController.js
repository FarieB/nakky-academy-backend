const User = require("../models/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Register
const register = async (req, res) => {
  try {
    const { name, email, password, role, phone, workerType } = req.body;

    const existingUser = await User.findOne({ email: { $eq: email } });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      password: hashedPassword,
      role,
      phone,
      workerType, // include this for employees
    });

    await user.save();

    // 🔐 Remove password before sending response
    const { password: pwd, ...userWithoutPassword } = user._doc;

    res.status(201).json({
      message: "User registered successfully",
      user: userWithoutPassword,
    });
    return null;

  } catch (err) {
    res.status(500).json({ error: err.message });
    return null;
  }
};

// Login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: { $eq: email } });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // 🔐 Remove password before sending response
    const { password: pwd, ...userWithoutPassword } = user._doc;

    res.json({
      token,
      user: userWithoutPassword,
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
  return null;
};

module.exports = {
  register,
  login,
};
