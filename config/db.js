const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
  } catch (err) {
    // Logging connection errors for monitoring and alerting in production
    console.error("MongoDB connection error:", err.message); // skipcq: JS-0002
    process.exit(1);
  }
};

module.exports = connectDB;
