const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    // This log confirms successful MongoDB connection in production monitoring
    console.log("MongoDB connected ✅"); // skipcq: JS-0002
  } catch (err) {
    // This error log reports connection failures for alerting systems
    console.error("MongoDB connection error:", err.message); // skipcq: JS-0002
    process.exit(1);
  }
};

module.exports = connectDB;
