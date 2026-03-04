const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const cors = require("cors");

dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json());

// ==============================
// Import routes
// ==============================
const authRoutes = require("./routes/authRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const jobRoutes = require("./routes/jobRoutes");
const courseRoutes = require("./routes/courseRoutes"); // ✅ Added course routes

// ==============================
// Use routes
// ==============================
app.use("/api/auth", authRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/employee", employeeRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/courses", courseRoutes); // ✅ Added course endpoint

// ==============================
// Root route
// ==============================
app.get("/", (req, res) => {
  res.send("Nakky Academy API Running 🚀");
});

// ==============================
// Start server
// ==============================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} ✅`);
});