const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    console.log("Connecting to MongoDB...");
    console.log(process.env.MONGO_URI);

    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log("✅ MongoDB Connected");
    console.log(conn.connection.host);
    console.log(conn.connection.name);

  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

module.exports = connectDB;
