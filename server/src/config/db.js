const mongoose = require("mongoose");

const connectDB = async () => {
  const mongoUrl = process.env.MONGO_URL?.trim();
  if (!mongoUrl) {
    console.warn("MONGO_URL not set; skipping MongoDB connection (development).");
    return false;
  }

  if (mongoUrl.includes("<db_password>") || mongoUrl.includes("your_password") || mongoUrl.includes("<password>")) {
    console.warn("MONGO_URL contains a placeholder password. Please update server/.env with a real MongoDB password.");
    return false;
  }

  try {
    await mongoose.connect(mongoUrl, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log("MongoDB connected successfully");
    return true;
  } catch (err) {
    console.error("MongoDB connection failed:", err);

    if (err.code === "ENOTFOUND" || err.name === "MongoParseError") {
      console.warn(
        "MongoDB could not resolve the Atlas host. Check server/.env and verify your cluster host name and network access."
      );
    }

    return false;
  }
};

module.exports = connectDB;
