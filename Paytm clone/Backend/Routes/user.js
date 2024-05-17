const express = require("express");
const userRouter = express.Router();
const zod = require("zod");
const { User, Account } = require("../db");
const jwt = require("jsonwebtoken");
const JWT_SECRET = require("../config");
const authMiddleware = require("../middleware");

const userSchema = zod.object({
  username: zod.string(),
  password: zod.string(),
  firstName: zod.string(),
  lastName: zod.string(),
});

userRouter.post("/signup", async (req, res) => {
  const body = req.body;
  const { success } = userSchema.safeParse(body);
  if (!success) {
    res.status(411).json({
      msg: "Invalid inputs",
    });
  }
  const user = await User.findOne({ username: body.username });
  if (user) {
    res.json({
      msg: "User already exists",
    });
  }

  const newUser = await User.create(body);
  const userId = newUser._id;

  await Account.create({
    userId,
    balance: 1 + Math.random() * 10000,
  });

  const token = jwt.sign(
    {
      userId: newUser._id,
    },
    JWT_SECRET
  );
  res.json({
    msg: "User added succesfully",
    token: token,
  });
});

userRouter.put("/update", async (req, res) => {
  const parser = userSchema.safeParse(req.body);
  if (!parser.success()) {
    res.status(411).json({
      msg: "Invalid inputs",
    });
  }
  await User.updateOne(req.body, {
    id: req.userId,
  });
  res.json({
    msg: "Updated successfully",
  });
});

userRouter.get("/bulk", async (req, res) => {
  const filter = req.query.filter || "";
  const users = await User.find({
    $or: [
      {
        firstName: {
          $regex: filter,
        },
      },
      {
        lastName: {
          $regex: filter,
        },
      },
    ],
  });
  res.json({
    user: users.map((user) => ({
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
    })),
  });
});

userRouter.get("/balance", authMiddleware, async (req, res) => {
  const account = await Account.findOne({
    userId: req.userId,
  });
  res.json({
    balance: account.balance,
  });
});

userRouter.post("/transfer", authMiddleware, async (req, res) => {
  const session = await mongoose.startSession();

  session.startTransaction();
  const { amount, to } = req.body;

  const account = await Account.findOne({ userId: req.userId }).session(
    session
  );

  if (!account || account.balance < amount) {
    await session.abortTransaction();
    return res.status(400).json({
      msg: "Insufficient balance",
    });
  }

  const toAccount = await Account.findOne({ userId: to }).session(session);

  if (!toAccount) {
    await session.abortTransaction();
    return res.status(400).json({
      msg: "Invalid account",
    });
  }

  await Account.updateOne(
    { userId: req.userId },
    { $inc: { balance: -amount } }
  ).session(session);
  await Account.updateOne(
    { userId: to },
    { $inc: { balance: balance + amount } }
  ).session(session);

  await session.commitTransaction();
  res.json({
    msg: "Transfer Succesful",
  });
});

module.exports = {
  userRouter,
};
