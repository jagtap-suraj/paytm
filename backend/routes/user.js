const express = require("express");

const userRouter = express.Router();
const zod = require("zod");
const bcrypt = require("bcryptjs");
const { User, Account } = require("../db");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config");
const authMiddleware = require("../middleware");

const signupSchema = zod.object({
  email: zod.string().email("Invalid email format"),
  firstName: zod.string(),
  lastName: zod.string(),
  password: zod.string().min(8, "Password must contain at least 8 characters"),
});

userRouter.post("/signup", async (req, res) => {
  try {
    if (!req.body) {
      return res.status(400).json({ msg: "Request body is missing or null" });
    }

    const { success, error } = signupSchema.safeParse(req.body);

    if (!success) {
      return res.status(400).json({ error: error.message });
    }

    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser) {
      return res.status(409).json({ msg: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(req.body.password, 10);

    const user = await User.create({
      email: req.body.email,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      password: hashedPassword,
    });

    await Account.create({
      userId: user._id,
      balance: 1 + Math.random() * 10000,
    });

    const token = jwt.sign({ userId: user._id }, JWT_SECRET);
    return res.status(201).json({
      message: "User created successfully",
      token,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

const signInSchema = zod.object({
  email: zod.string().email("Invalid email format"),
  password: zod.string().min(8, "Password must contain at least 8 characters"),
});

userRouter.post("/signin", async (req, res) => {
  try {
    if (!req.body) {
      return res.status(411).json({
        msg: "Request body is missing or null",
      });
    }

    const { success, error } = signInSchema.safeParse(req.body);

    if (!success) {
      return res.status(400).json({ error: error.message });
    }

    const existingUser = await User.findOne({ email: req.body.email });
    if (!existingUser) {
      return res.status(411).json({
        msg: "User doesn't exist",
      });
    }

    const isMatched = await bcrypt.compare(
      req.body.password,
      existingUser.password
    );
    if (!isMatched) {
      return res.status(411).json({ msg: "Incorrect Password" });
    }

    const token = jwt.sign({ userId: existingUser._id }, JWT_SECRET);

    return res.status(200).json({
      token: token,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

const updateSchema = zod.object({
  password: zod.string().optional(),
  firstName: zod.string().optional(),
  lastName: zod.string().optional(),
});

userRouter.put("/", authMiddleware, async (req, res) => {
  try {
    const { success, error } = updateSchema.safeParse(req.body);
    if (!success) {
      return res.status(400).json({ error: error.message });
    }
    await User.updateOne({ _id: req.userId }, req.body);
    return res.status(200).json({
      message: "Updated successfully",
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({
      error: "An unexpected error occurred. Please try again later.",
    });
  }
});

userRouter.get("/bulk", authMiddleware, async (req, res) => {
  try {
    const filter = req.query.filter || "";
    const users = await User.find({
      $or: [
        { firstName: { $regex: filter, $options: "i" } }, // 'i' for case-insensitive search
        { lastName: { $regex: filter, $options: "i" } },
      ],
    });
    if (!users || users.length == 0) {
      return res.status(400).json({
        message: "User not found",
      });
    }
    return res.status(200).json({
      user: users.map((user) => ({
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        _id: user._id,
      })),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({
      error: "An unexpected error occurred. Please try again later.",
    });
  }
});

module.exports = userRouter;
