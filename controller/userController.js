const User = require("../model/user/user");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const sendOTP = require("../function/sendOtpMail");
const Wallet = require("../model/walletSchema");
const TransactionHistory = require("../model/transactionhistory");
const TDSGSTtransaction = require("../model/tdsgstTransaction")
const userBidDetails = require("../model/admin/userContestDetailSchema");
const contesthistory = require("../model/contesthistory");

const Register = async (req, res) => {
  const data = req.body;
  const session = await mongoose.startSession();

  try {
    session.startTransaction();
    const existingUser = await User.findOne({ email: data.email }).session(
      session
    );

    if (existingUser) {
      const loginResult = await Login(req, res);
      if (loginResult) {
        await session.abortTransaction();
        session.endSession();
        return;
      }
    } else {
      const OTP = Math.floor(Math.random() * 900000) + 100000;



      const newUser = new User({
        ...data,
        otp: OTP,
      });
      sendOTP(data.email, OTP);

      await newUser.save({ session });

      const wallet = new Wallet({
        user: newUser._id,
        winningbalance: 0,
        balance: 0,
        bonusAmount: 0,
      });

      await wallet.save({ session });

      await session.commitTransaction();
      session.endSession();

      return res.status(201).json({
        success: true,
        message: "User created successfully",
        data: newUser,
      });
    }
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


const Login = async (req, res) => {
  const { email,name } = req.body;

  try {
    const min = 100000;
    const max = 999999;
    const OTP = Math.floor(Math.random() * (max - min + 1)) + min;
    const user = await User.findOne({ email: email });

    if (name) {
      try {
        // Check if the new username already exists (excluding the current user)
        const existingUser = await User.findOne({ username: name});
  
        if (existingUser) {
          return res.status(400).send({ success: false, message: "Username already taken" });
        }
      } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
      }
    }

    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid Email credentials" });
    }
    await User.findByIdAndUpdate(user._id, { otp: OTP }, { new: true });
    sendOTP(email, OTP);

    const data = {
      _id: user._id,
      email: user.email,
      otp: OTP,
    };
    return res.status(200).json({
      success: true,
      message: "OTP has been sent on you email ",
      data: data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const LoginVerify = async (req, res) => {
  const { email, otp, fcmToken } = req.body;
  try {
    const user = await User.findOne({ email, otp: Number(otp), }).select("-password");
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid OTP" });
    }

    user.fcmToken = fcmToken;
    await user.save();

    const token = jwt.sign({ _id: user._id, email: user?.email, role: user?.type }, process.env.SECRET_KEY,);
    const data = { _id: user._id, email: user?.email, name: user?.name, mobileNumber: user?.mobileNumber, profile: user?.profile }

    return res.status(200).json({ success: true, message: "Login successful", data, token, });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message, });
  }
};

const updateUser = async (req, res) => {
  const id = req.user._id;
  const data = req.body;
  console.log(data)

  // Check if the username is being updated
  if (data.name) {
    try {
      // Check if the new username already exists (excluding the current user)
      const existingUser = await User.findOne({ name: data.name});

      if (existingUser&&id!==existingUser._id?.toString()) {
        return res.status(400).send({ success: false, message: "Username already taken" });
      }
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  try {
    const updatedUser = await User.findByIdAndUpdate(id, { $set: data }, { new: true }).select("-password");

    if (!updatedUser) {
      return res.status(404).send({ message: "User not found" });
    }

    res.status(202).send({ success: true, message: "User updated", data: updatedUser });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


const getUserProfile = async (req, res) => {
  const id = req.user._id;

  try {
    const user = await User.findById(id).select("-password");

    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }

    res.status(202).send({ success: true, message: "User Data get Succefull", data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, });
  }
};

const getallUser = async (req, res) => {
  try {
    const {
      totalRecharge,
      totalSpent,
      totalWithdraw,
      profitOrLossPercentageToCompany,
      amountProfitToCompany,
      balance,
      winningBalance,
      performanceWinningPercentage,
      activePercentage,
    } = req.query;
    const Query = [
      {
        $match: {
          ...(totalRecharge && { totalRecharge: Number(totalRecharge) }),
          ...(totalSpent && { totalSpent: Number(totalSpent) }),
          ...(totalWithdraw && { totalWithdraw: Number(totalWithdraw) }),
          ...(profitOrLossPercentageToCompany && {
            profitOrLossPercentageToCompany,
          }),
          ...(amountProfitToCompany && { amountProfitToCompany }),
          ...(balance && { balance: Number(balance) }),
          ...(winningBalance && { winningBalance: Number(winningBalance) }),
          ...(performanceWinningPercentage && {
            performanceWinningPercentage,
          }),
          ...(activePercentage && {
            activePercentage: Number(activePercentage),
          }),
        },
      },
      {
        $project: {
          password: 0,
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
    ];

    const users = await User.aggregate(Query);
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(400).json({ error: error.message });
  }
};

const updateUserByAdmin = async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  try {
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).send({ message: "User not found" });
    }

    res
      .status(202)
      .send({ success: true, message: "user Updated", data: updatedUser });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
const Delete_user_Id = async (req, res) => {
  const { id } = req.params;
  try {
    const response = await User.findByIdAndDelete(id);
    if (!response) {
      return res
        .status(403)
        .json({ success: false, message: "User Not Found" });
    }
    res.status(203).json({ success: true, message: "User Delete" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error,
    });
  }
};
const getSingleUserBYADmin = async (req, res) => {
  try {
    const { id } = req.params;
    const response = await User.findById(id);
    if (!response) {
      return res
        .status(400)
        .json({ success: false, message: "User not Found" });
    }

    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(400).json({ error: error.message });
  }
};

const getUserPagination = async (req, res) => {
  try {
    const {
      totalRecharge,
      totalSpent,
      totalWithdraw,
      profitOrLossPercentageToCompany,
      amountProfitToCompany,
      balance,
      winningBalance,
      performanceWinningPercentage,
      activePercentage,
    } = req.query;
    const Query = [
      {
        $match: {
          ...(totalRecharge && { totalRecharge: Number(totalRecharge) }),
          ...(totalSpent && { totalSpent: Number(totalSpent) }),
          ...(totalWithdraw && { totalWithdraw: Number(totalWithdraw) }),
          ...(profitOrLossPercentageToCompany && {
            profitOrLossPercentageToCompany,
          }),
          ...(amountProfitToCompany && { amountProfitToCompany }),
          ...(balance && { balance: Number(balance) }),
          ...(winningBalance && { winningBalance: Number(winningBalance) }),
          ...(performanceWinningPercentage && {
            performanceWinningPercentage,
          }),
          ...(activePercentage && {
            activePercentage: Number(activePercentage),
          }),
        },
      },
      {
        $project: {
          password: 0,
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
    ];

    const page = parseInt(req.query.page) || 1; // Default to page 1 if not provided
    const limit = parseInt(req.query.limit) || 10; // Default to 10 contests per page if not provided

    const skip = (page - 1) * limit; // Calculate the number of items to skip

    // Get contests with pagination
    const users = await User.aggregate(Query).skip(skip).limit(limit);

    // Get the total number of Users for pagination info
    const totalUsers = await User.countDocuments();
    // res.json(users);

    const data = {
      success: true,
      data: users,
    };

    res.status(200).json({
      page,
      totalPages: Math.ceil(totalUsers / limit),
      totalUsers,
      data,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(400).json({ error: error.message });
  }
};

const walletAdd = async (req, res) => {
  console.log(" ================================= Add wallet ===============================");
  console.log("req.body: ", req.body);

  const { amount, bounusAmount } = req.body;

  console.log("amount: ", amount);
  console.log("bounusAmount: ", bounusAmount);



  try {

    const userId = req.user._id;
    const session = await mongoose.startSession();

    const gstRate = 0.22; // GST rate 22%

    // return res.status(400).json({ message: "Error adding wallet", success: false })
    session.startTransaction();
    const wallet = await Wallet.findOne({ user: userId }).session(session);
    const AfterGST = amount - (amount * gstRate)
    if (!wallet) {
      wallet = new Wallet({ user: userId, balance: AfterGST });
    } else {
      wallet.balance += AfterGST;
    }

    if (bounusAmount) {
      wallet.bonusAmount += bounusAmount;
    }

    // GST 
    const response = new TDSGSTtransaction({
      user: userId,
      type: "GST",
      amount: amount * gstRate,
    });



    const transaction = new TransactionHistory({
      user: userId,
      type: "credit",
      amountType: "realAmount",
      amount,
      description: `Added ${amount} to your wallet`,
    });

    // bonus
    const transactionBounus = new TransactionHistory({
      user: userId,
      type: "credit",
      amountType: "bonusAmount",
      amount: bounusAmount,
      description: `Added ${bounusAmount} to your wallet as a bonus`,
    });

    // gst
    const transactionGST = new TransactionHistory({
      user: userId,
      type: "credit",
      amountType: "gstDeduct",
      amount: amount * gstRate,
      description: `Deducted GST ${amount * gstRate} to your wallet`,
    });

    // console.log("transactionBounus history: ", transactionBounus);
    // console.log("transactionGST history: ", transactionGST);
    // console.log("transaction history: ", transaction);
    // console.log("response history: ", response);
    // console.log("wallet history: ", wallet);


    await transactionBounus.save({ session });
    await transactionGST.save({ session });
    await transaction.save({ session });
    await response.save({ session });
    await wallet.save({ session });


    const result = await session.commitTransaction();
    session.endSession();

    // console.log("result: ", result);


    return res.status(200).json({
      success: true,
      message: "Funds added successfully",
      newBalance: wallet.balance,
    });
  } catch (error) {
    console.log("error on adding amount to wallet: ", error);

    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({ error: "Error adding funds", success: false });
  }
};

const walletWithdraw = async (req, res) => {
  const { amount } = req.body;
  const userId = req.user._id;
  const session = await mongoose.startSession();

  try {
    session.startTransaction();
    const wallet = await Wallet.findOne({ user: userId }).session(session);
    if (!wallet || wallet.winningbalance < amount) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Insufficient balance" });
    }
    // actual amount should receive user in account after tds deduction
    const AfterTDS = amount - (amount * 0.30);
    wallet.winningbalance -= amount;
    await wallet.save({ session });

    const response = new TDSGSTtransaction({
      user: userId,
      type: "TDS",
      amount: amount * 0.30,
    });
    await response.save({ session });
    const transaction = new TransactionHistory({
      user: userId,
      type: "withdraw",
      amount,
      description: `Withdrawn ${amount} from your wallet`,
    });
    await transaction.save({ session });
    await session.commitTransaction();
    session.endSession();
    return res.status(200).json({
      success: true,
      newBalance: wallet.balance,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({ error: "Error withdrawing funds" });
  }
};


/* const getTransactionHistory = async (req, res) => {
  const userId = req.user._id;
  try {
    const response = await TransactionHistory.find({ user: userId }).select("-user");

    return res.status(200).json(response);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({ error: "Error withdrawing funds" });
  }
}; */

const getTransactionHistory = async (req, res) => {
  // console.log("req.query: ", req.query);

  const userId = req.user._id;
  const { page = 1, limit = 10, type } = req.query; // Default to page 1 and 10 items per page
  // console.log("page: ", page, "limit: ", limit);

  try {

    let searchType = type == 'All' ? '' : type

    const query = {
      user: userId,
      ...(searchType && { type: searchType }) // Add `type` to the query only if `searchType` is defined.
    };

    const transactions = await TransactionHistory.find(query).select("-user").skip((page - 1) * limit).limit(Number(limit));

    const totalCount = await TransactionHistory.countDocuments({ user: userId });

    return res.status(200).json({ data: transactions, totalCount, currentPage: Number(page), totalPages: Math.ceil(totalCount / limit), });
  } catch (error) {
    return res.status(500).json({ error: "Error fetching transaction history" });
  }
};


const getUserWallet = async (req, res) => {
  const userId = req.user._id;
  try {
    let wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
      return res.status(400).json({ message: "wallet not found" });
    }
    res.status(200).json({
      success: true,
      newBalance: wallet,
    });
  } catch (error) {
    res.status(500).json({ error: "Error withdrawing funds" });
  }
};

const TdsGstHistory = async (req, res) => {
  const { date } = req.query;
  const { _id } = req.user;

  try {
    if (date) {
      const [day, month, year] = date.split('-').map(Number);

      const response = await TDSGSTtransaction.aggregate([
        {
          $match: {
            user: new mongoose.Types.ObjectId(_id)
          }
        },
        {
          $project: {
            day: { $dayOfMonth: "$createdAt" },
            month: { $month: "$createdAt" },
            year: { $year: "$createdAt" },
            type: 1,
            amount: 1,
            createdAt: 1
          }
        },
        {
          $match: {
            day,
            month,
            year
          }
        }
      ]);

      return res.status(200).json({ success: true, data: response });
    }

    const response = await TDSGSTtransaction.find({ user: new mongoose.Types.ObjectId(_id) }).lean();
    return res.status(200).json({ success: true, data: response });

  } catch (err) {
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const HandleFollowing = async (req, res) => {
  const userId = req.params.userId
  try {
    const response = await User.findByIdAndUpdate(userId, { $addToSet: { following: userId } }, { new: true, useFindAndModify: false })
    return res.status(200).json({ success: true, data: response });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}


const getUserDashbordDetailToApp = async (req, res) => {

  const categoryId = req.params.categoryId || "all"

  const response = await userBidDetails.aggregate([
    {
      $match: { userId: new mongoose.Types.ObjectId(req.params.id || req.user._id) },
    },
    {
      $lookup: {
        from: "categorycontests",
        localField: "contestId",
        foreignField: "_id",
        as: "categorycontestsDetail"
      }
    },
    {
      $unwind: "$categorycontestsDetail"
    },
    {
      $lookup: {
        from: "sub-categories",
        localField: "categorycontestsDetail.subcategoryId",
        foreignField: "_id",
        as: "subcategoryDetail"
      }
    },
    { $unwind: "$subcategoryDetail" },
    {
      $group: {
        _id: "$subcategoryDetail.auctioncategory",
        contestCount: { $sum: 1 }
      }
    },
    {
      $lookup: {
        from: "categories",
        localField: "_id",
        foreignField: "_id",
        as: "auctioncategory"
      }
    },
    { $unwind: "$auctioncategory" },
    {
      $group: {
        _id: null,
        contestCount: { $sum: "$$ROOT.contestCount" },
        ctegory: { $push: "$$ROOT.auctioncategory" }
      }
    },
    {
      $project: {
        contestCount: 1,
        ctegory: 1,
        _id: 0
      }
    },
  ]);

  // const winingHistroy = await contesthistory.aggregate([

  //   { $unwind: "$userranks" },
  //   {
  //     $match:{
  //       "userranks.userId":new mongoose.Types.ObjectId(req.user._id)
  //     }
  //   },
  //   {
  //     $addFields: {
  //       isWinner: {
  //         $cond: { if: "$userranks.isInWiningRange", then: 1, else: 0 },
  //       },
  //     },
  //   },
  //   {
  //     $project:{
  //       _id:1,
  //       contestId:1,
  //       userranks:1
  //     }
  //   },
  //   {
  //     $lookup:{
  //       from:"categorycontests",
  //       localField:"contestId",
  //       foreignField:"_id",
  //       as:"contest"
  //     }

  //   }


  //   // Group by userId
  //   {
  //     $group: {
  //       _id: "$userranks.userId",
  //       totalWins: { $sum: "$isWinner" },
  //       totalParticipations: { $sum: 1 },
  //       contest:{
  //         $push:"$$ROOT"
  //       }
  //     },
  //   },

  //   // Calculate winning percentage
  //   {
  //     $addFields: {
  //       winningPercentage: {
  //         $cond: {
  //           if: { $gt: ["$totalParticipations", 0] },
  //           then: {
  //             $multiply: [
  //               { $divide: ["$totalWins", "$totalParticipations"] },
  //               100,
  //             ],
  //           },
  //           else: 0,
  //         },
  //       },
  //     },
  //   },

  //   // // Optionally, sort by winning percentage
  //   { $sort: { winningPercentage: -1 } },
  // ])

  const response2 = await User.findById(req.params.id || req.user._id).select('name _id')
  try {
    return res.status(200).json({
      success: true, data: {
        name: response2.name, _id: response2._id, ...(response[0] || { contestCount: 0, ctegory: [] }),
        winingPersentage: 0, earnAmount: 0, followrs: 0, following: 0
      }
    })
  } catch (error) {
    return res.status(500).json({ success: false, data: error })
  }
};

//entry amount   10 rs

// bonas 10%

//use bonas amount while bidding it will deduct 9+1 
// earn bonus amount will get after placing  10+1 


// const withdrawAmount = (req,res)=>{
//     const { username, amount } = req.body;

//     // Check if the username is provided and exists
//     if (!username || !users[username]) {
//         return res.status(404).json({ error: "User not found" });
//     }

//     // Check if the withdrawal amount is valid
//     if (amount <= 0) {
//         return res.status(400).json({ error: "Amount must be greater than zero" });
//     }

//     // Get the user data
//     const user = users[username];

//     // Check if the user has enough balance
//     if (user.balance < amount) {
//         return res.status(400).json({ error: "Insufficient balance" });
//     }

//     // Deduct the amount from the user's balance
//     user.balance -= amount;

//     // Respond with success and the updated balance
//     return res.json({
//         message: `Withdrawal successful. ${amount} has been withdrawn.`,
//         new_balance: user.balance,
// });
// }


module.exports = {
  Register,
  updateUser,
  Login,
  LoginVerify,
  getallUser,
  updateUserByAdmin,
  Delete_user_Id,
  getSingleUserBYADmin,
  getUserPagination,
  getUserProfile,
  walletAdd,
  walletWithdraw,
  getUserWallet,
  getTransactionHistory,
  TdsGstHistory,
  getUserDashbordDetailToApp,
  HandleFollowing
};
