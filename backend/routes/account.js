const express = require("express");
const authMiddleware = require("../middleware");
const { Account } = require("../db");
const mongoose = require("mongoose");
const zod = require("zod");

const accountRouter = express.Router();

module.exports = accountRouter;

accountRouter.get("/balance", authMiddleware, async (req, res) => {
  try {
    const account = await Account.findOne({
      userId: req.userId,
    });
    return res.status(200).json({
      balance: account.balance,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({
      error: "An unexpected error occurred. Please try again later.",
    });
  }
});

const transferSchema = zod.object({
  receiverId: zod.string(),
  amount: zod.number(),
});

accountRouter.post("/transfer", authMiddleware, async (req, res) => {
  try {
    const session = await mongoose.startSession();
    session.startTransaction();
    const { receiverId, amount } = req.body;
    const { success, error } = transferSchema.safeParse(req.body);
    if (!success) {
      return res.status(400).json({ error: error.message });
    }
    const receiverAccount = await Account.findOne({ userId: receiverId });
    if (!receiverAccount) {
      return res.status(400).json({
        error: "Invalid account",
      });
    }
    const senderAccount = await Account.findOne({ userId: req.userId });
    if (!senderAccount || senderAccount.balance < amount) {
      return res.status(400).json({
        error: "Insufficient balance",
      });
    }
    try {
      // transaction logic
      await Account.updateOne(
        { userId: req.userId },
        { $inc: { balance: -amount } }
      );
      await Account.updateOne(
        { userId: receiverId },
        { $inc: { balance: amount } }
      );
      await session.commitTransaction();
      return res.status(200).json({
        message: "Transfer successful",
      });
    } catch (e) {
      await session.abortTransaction();
      console.error(e);
      res.status(500).json({
        error: "An unexpected error occurred. Please try again later.",
      });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({
      error: "An unexpected error occurred. Please try again later.",
    });
  }
});
