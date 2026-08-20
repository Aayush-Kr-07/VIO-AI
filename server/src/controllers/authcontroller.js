const User = require("../user");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || "your_jwt_secret_key", {
    expiresIn: "7d",
  });
};

const register = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        message: "Database is unavailable. Please check MongoDB connection and restart the server.",
      });
    }

    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All feilds are required" });
    }
    const existingUser = await User.findOne({ email: email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already in use" });
    }
    const user = new User({ name, email, password });
    await user.save();
    const token = generateToken(user._id);
    res.status(201).json({
      message: "User registered successfully",
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

const login = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        message: "Database is unavailable. Please check MongoDB connection and restart the server.",
      });
    }

    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }
    const user = await User.findOne({ email: email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
    const token = generateToken(user._id);
    res
      .status(200)
      .json({
        message: "Login Successful",
        token,
        user: { id: user._id, name: user.name, email: user.email },
      });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

const getMe = async (req, res) => {
    try{
        const userId = req.user?.id || req.user?.userId || req.userId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const user = await User.findById(userId).select("-password");
        if(!user){
            return res.status(404).json({ message: "User not found"});
        }
        res.status(200).json({ user });
    }catch(err){
        console.error(err);
        res.status(500).json({ message: "Server Error" });
    }
};
module.exports = { register, login, getMe};