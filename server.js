const http = require("http");
const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const cors = require("cors");
const { Server } = require("socket.io");

// Import the main socket initializer from instructions
const initializeSocket = require("./socket");

dotenv.config();
connectDB();

const app = express();

// ==============================
// Middleware
// ==============================
app.use(cors());

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

// ==============================
// Create HTTP Server
// ==============================
const server = http.createServer(app);

// ==============================
// Socket.IO
// ==============================
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});

// Initialize Socket Handlers
initializeSocket(io);
require("./socket/chatSocket")(io);

// ==============================
// Routes
// ==============================

const adminRoutes = require("./routes/adminRoutes");
const authRoutes = require("./routes/authRoutes");
const courseRoutes = require("./routes/courseRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const messageRoutes = require("./routes/messageRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const profileRoutes = require("./routes/profileRoutes");
const recommendationRoutes = require("./routes/recommendationRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const searchRoutes = require("./routes/searchRoutes");
const subscriptionRoutes = require("./routes/subscriptionRoutes");



// ==============================
// API Routes
// ==============================

app.use("/api/auth", authRoutes);

app.use("/api/payments", paymentRoutes);

app.use("/api/courses", courseRoutes);

app.use("/api/dashboard", dashboardRoutes);

app.use("/api/admin", adminRoutes);

app.use("/api/subscriptions", subscriptionRoutes);

app.use("/api/recommendations", recommendationRoutes);

app.use("/api/reviews", reviewRoutes);

app.use("/api/profiles", profileRoutes);

app.use("/api/search", searchRoutes);

app.use("/api/messages", messageRoutes);

app.use("/api/notifications", notificationRoutes);


// ==============================
// Health Check
// ==============================

app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Nakky Academy API Running 🚀"
    });
});

// ==============================
// Global Error Handler
// ==============================

app.use((err, req, res, _next) => {
    console.error(err.stack);

    res.status(err.status || 500).json({
        success: false,
        message: err.message || "Internal Server Error"
    });
});

// ==============================
// Start Server
// ==============================

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

