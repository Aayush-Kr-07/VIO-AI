const mongoose = require("mongoose");

const connectDB = async () => {
  const mongoUrl = process.env.MONGO_URL?.trim();
  if (!mongoUrl) {
    if (process.env.NODE_ENV === "production") throw new Error("MONGO_URL is required in production.");
    console.warn("MONGO_URL not set; skipping MongoDB connection (development).");
    return false;
  }

  if (mongoUrl.includes("<db_password>") || mongoUrl.includes("your_password") || mongoUrl.includes("<password>")) {
    const error = new Error("MONGO_URL contains a placeholder password.");
    if (process.env.NODE_ENV === "production") throw error;
    console.warn(`${error.message} Please update server/.env with a real MongoDB password.`);
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

    if (process.env.NODE_ENV === "production") throw err;
    return false;
  }
};

module.exports = connectDB;
