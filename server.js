const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const cors = require("cors");

dotenv.config();
connectDB();

const app = express();   // ✅ MUST come before app.use()

app.use(cors());
app.use(express.json());

// Import routes
const authRoutes = require("./routes/authRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const employeeRoutes = require("./routes/employeeRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/employee", employeeRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} ✅`);
});
