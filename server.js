const http = require("http");
const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const cors = require("cors");
const { Server } = require("socket.io");

// Socket
const initializeSocket = require("./socket");

dotenv.config();

const app = express();

// =====================================================
// MIDDLEWARE
// =====================================================

app.use(
  cors({
    origin: "*",
    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],
  })
);

app.use(
  express.json({
    limit: "10mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
  })
);

// =====================================================
// STATIC FILES
// =====================================================

app.use(
  "/uploads",
  express.static("uploads", {
    maxAge: "1d",
  })
);

// =====================================================
// PERFORMANCE LOGGER
// =====================================================

app.use((req, res, next) => {

  const start = process.hrtime.bigint();

  res.on("finish", () => {

    const end = process.hrtime.bigint();

    const durationMs =
      Number(end - start) / 1_000_000;

    // Only log API requests
    if (req.originalUrl.startsWith("/api")) {

      console.log(
        `[API] ${req.method} ${req.originalUrl} → ${res.statusCode} (${durationMs.toFixed(0)}ms)`
      );

    }
  });

  next();
});

// =====================================================
// HTTP SERVER
// =====================================================

const server = http.createServer(app);

// =====================================================
// SOCKET.IO
// =====================================================

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
    ],
  },
});

initializeSocket(io);

require("./socket/chatSocket")(io);

// =====================================================
// ROUTES
// =====================================================

const adminRoutes =
  require("./routes/adminRoutes");

const authRoutes =
  require("./routes/authRoutes");

const courseRoutes =
  require("./routes/courseRoutes");

const dashboardRoutes =
  require("./routes/dashboardRoutes");

const messageRoutes =
  require("./routes/messageRoutes");

const notificationRoutes =
  require("./routes/notificationRoutes");

const paymentRoutes =
  require("./routes/paymentRoutes");

const profileRoutes =
  require("./routes/profileRoutes");

const recommendationRoutes =
  require("./routes/recommendationRoutes");

const reviewRoutes =
  require("./routes/reviewRoutes");

const searchRoutes =
  require("./routes/searchRoutes");

const subscriptionRoutes =
  require("./routes/subscriptionRoutes");

const assessmentRoutes =
  require("./routes/assessmentRoutes");

// =====================================================
// API
// =====================================================

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/payments",
  paymentRoutes
);

app.use(
  "/api/courses",
  courseRoutes
);

app.use(
  "/api/dashboard",
  dashboardRoutes
);

app.use(
  "/api/admin",
  adminRoutes
);

app.use(
  "/api/subscriptions",
  subscriptionRoutes
);

app.use(
  "/api/recommendations",
  recommendationRoutes
);

app.use(
  "/api/reviews",
  reviewRoutes
);

app.use(
  "/api/profiles",
  profileRoutes
);

app.use(
  "/api/search",
  searchRoutes
);

app.use(
  "/api/messages",
  messageRoutes
);

app.use(
  "/api/notifications",
  notificationRoutes
);

app.use(
  "/api",
  assessmentRoutes
);

// =====================================================
// HEALTH CHECK
// =====================================================

app.get("/", (req, res) => {

  res.status(200).json({
    success: true,
    message:
      "Nakky Academy API Running 🚀",
  });

});

// =====================================================
// GLOBAL ERROR HANDLER
// =====================================================

app.use(
  (err, req, res, _next) => {

    console.error(
      "GLOBAL ERROR:",
      err
    );

    res.status(
      err.status || 500
    ).json({
      success: false,
      message:
        err.message ||
        "Internal Server Error",
    });

  }
);

// =====================================================
// START SERVER ONLY AFTER DATABASE CONNECTS
// =====================================================

const PORT =
  process.env.PORT || 5000;

const startServer = async () => {

  try {

    await connectDB();

    server.listen(
      PORT,
      () => {

        console.log(
          `🚀 Nakky Academy API running on port ${PORT}`
        );

        console.log(
          "Database connection ready."
        );

      }
    );

  } catch (error) {

    console.error(
      "Server startup failed:",
      error
    );

    process.exit(1);
  }
};

startServer();

