const express = require("express");

const userRouter = express.Router();
const zod = require("zod");
const bcrypt = require("bcrypt");
const User = require("../db");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config");

const signupSchema = zod.object({
  email: zod.string().email("Invalid email format"),
  firstName: zod.string(),
  lastName: zod.string(),
  password: zod.string().min(8, "Password must contain at least 8 characters"),
});

const signInSchema = zod.object({
  email: zod.string().email("Invalid email format"),
  password: zod.string().min(8, "Password must contain at least 8 characters"),
});

userRouter.post("/signup", async (req, res) => {
  if (!req.body) {
    return res.status(411).json({
      msg: "Request body is missing or null",
    });
  }

  const { signupValidationSuccess } = signupSchema.safeParse(req.body);

  if (!signupValidationSuccess) {
    return res.status(411).json({
      msg: signupValidationSuccess.error.message,
    });
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email: req.body.email });
  if (existingUser) {
    return res.status(411).json({
      msg: "User already exists",
    });
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(req.body.password, 10);

  // Create user
  const user = await User.create({
    email: req.body.email,
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    password: hashedPassword,
  });

  // JWT token on userId
  const token = jwt.sign({ id: user._id }, JWT_SECRET);
  return res.status(200).json({
    message: "User created successfully",
    token: token,
  });
});

userRouter.post("/signin", async (req, res) => {
  if (!req.body) {
    return res.status(411).json({
      msg: "Request body is missing or null",
    });
  }

  const { signInValidationSuccess } = signInSchema.safeParse(req.body);

  if (!signInValidationSuccess) {
    return res.status(411).json({
      msg: signInValidationSuccess.error.message,
    });
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

  const token = jwt.sign({ id: existingUser._id }, JWT_SECRET);

  return res.status(200).json({
    token: token,
  });
});

module.exports = userRouter;
