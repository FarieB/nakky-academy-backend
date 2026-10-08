const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    console.log("Connecting to MongoDB...");

    const conn = await mongoose.connect(
      process.env.MONGO_URI,
      {
        maxPoolSize: 20,
        minPoolSize: 5,

        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,

        family: 4,
      }
    );

    console.log("========================================");
    console.log("✅ MongoDB Connected");
    console.log("Host:", conn.connection.host);
    console.log("Database:", conn.connection.name);
    console.log("Pool:", "5–20 connections");
    console.log("========================================");

    mongoose.connection.on(
      "connected",
      () => {
        console.log("MongoDB connection established.");
      }
    );

    mongoose.connection.on(
      "error",
      (err) => {
        console.error(
          "MongoDB connection error:",
          err.message
        );
      }
    );

    mongoose.connection.on(
      "disconnected",
      () => {
        console.warn(
          "MongoDB disconnected."
        );
      }
    );

    return conn;

  } catch (err) {

    console.error(
      "❌ MongoDB connection failed:",
      err.message
    );

    process.exit(1);
  }
};

module.exports = connectDB;
