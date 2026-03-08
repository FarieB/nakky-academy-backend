const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// ==============================
// Create HTTP server
// ==============================
const server = http.createServer(app);


// ==============================
// Socket.IO
// ==============================
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const chatSocket = require("./socket/chatSocket");
chatSocket(io);


// ==============================
// Import routes
// ==============================
const authRoutes = require("./routes/authRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const jobRoutes = require("./routes/jobRoutes");
const courseRoutes = require("./routes/courseRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const adminRoutes = require("./routes/adminRoutes"); // ✅ NEW


// ==============================
// Use routes
// ==============================
app.use("/api/auth", authRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/employee", employeeRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/admin", adminRoutes); // ✅ NEW


// ==============================
app.get("/", (req, res) => {
  res.send("Nakky Academy API Running 🚀");
});


const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT} ✅`);
});