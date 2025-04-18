const User = require("../model/user/user");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const sendOTP = require("../function/sendOtpMail");
const Wallet = require("../model/walletSchema");
const TransactionHistory = require("../model/transactionhistory");
const TDSGSTtransaction = require("../model/tdsgstTransaction")
const cashBonus =  require("../model/admin/cashBonus")
const userBidDetails = require("../model/admin/userContestDetailSchema");
const contesthistory = require("../model/contesthistory");
const oferRechargeSetting = require("../model/admin/oferRechargeSetting");
const rankSetting = require("../model/user/userRankController")
const referalSchema =  require("../model/user/referal")
const Razorpay = require("razorpay");
const Transaction = require("../model/Transaction");
const { verifySignature } = require("../function/razorPay");
const referalCounter = require("../model/user/referalCount")
const referalController = require("../model/referalController"); 

require("dotenv").config()

const razorPyaSecret = process.env.RAZOR_SECRET_KEY

const instance = new Razorpay({
  key_id: process.env.RAZOR_KEY_ID,
  key_secret: razorPyaSecret
});

const generateReferralCode = () => {
  return Array.from({ length: 4 }, () =>
    String.fromCharCode(Math.floor(Math.random() * 26) + 65) // A-Z (ASCII 65-90)
  ).join('');
};



const Register = async (req, res) => {
  const data = req.body;
  const session = await mongoose.startSession();

  try {
    
    session.startTransaction();
    const existingUser = await User.findOne({ email: data.email }).session(
      session
    );

        let latestCounter = 0
        const response = await referalCounter.findOne()
         if(!response){
             const tempDoc = new referalCounter({
              sequence_value:1
             })
            const res =  await tempDoc.save()
            latestCounter=res.sequence_value
         }else {
          response.sequence_value+=1
          const res =  await response.save()
          latestCounter=res.sequence_value
         }

        
         const referralCode = generateReferralCode();

    if (existingUser) {
      const loginResult = await Login(req, res);
      if (loginResult) {
        await session.abortTransaction();
        session.endSession();
        return;
      }
    } else {
      const OTP = Math.floor(Math.random() * 900000) + 100000;

       data.name=""
        // console.log( data)

        console.log("existingUser",existingUser)

      const newUser = new User({
        ...data,
        otp: OTP,
        referralCode:referralCode+""+latestCounter
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
    console.log(error)
    await session.abortTransaction();
    session.endSession();

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


const Login = async (req, res) => {
  const { email, name } = req.body;

  try {
    const min = 100000;
    const max = 999999;
    const OTP = Math.floor(Math.random() * (max - min + 1)) + min;
    const user = await User.findOne({ email: email });

    if (name) {
      try {
        // Check if the new username already exists (excluding the current user)
        const existingUser = await User.findOne({ username: name });

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

    const token = jwt.sign({ _id: user._id, email: user?.email, role: user?.type,referalCode:user?.referralCode||"" }, process.env.SECRET_KEY,);
    const data = { _id: user._id, email: user?.email, name: user?.name, mobileNumber: user?.mobileNumber, profile: user?.profile }

    return res.status(200).json({ success: true, message: "Login successful", data, token, });
  } catch (error) {
    console.log(error)
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
      const existingUser = await User.findOne({ name: data.name });

      if (existingUser && id !== existingUser._id?.toString()) {
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

const placeOrder = async (req, res) => {
  // console.log("=========================== placeOder =============================================");
  // console.log("req.body:", req.body);
  const amount = req.body?.amount
  const name = req.user?.name
  const email = req.user?.email
  const id = req.user._id;
  const type = req.body?.type
  // console.log("req.user: ", req.user);

  try {
    if (!amount) {
      return res.status(400).json({ msg: 'Amount is required!', success: false })
    }
    const options = {
      "amount": amount,
      "currency": "INR",
      "receipt": "receipt#1",
      "partial_payment": false,
      "notes": {
        "username": name,
        "email": email
      },
      "payment_capture": 1, // 1 means auto-capture
    }

    // let genTransaction = genNumberDigit(8)

    instance.orders.create(options, async (err, order) => {
      // console.log("error: ", err);
      // console.log("order: ", order);
      if (err) {
        return res.status(401).json({ message: 'Failed to genarate payment order!', success: false })
      }
      const result = await Transaction.create({ user: id, transactionType: "online", transaction_purpose: type, payment: (order.amount / 100), order_id: order.id })
      if (result) {
        return res.status(200).json({ message: 'Order created successfully.', success: true, result: order })
      }
      return res.status(400).json({ message: 'Failed to initiate payment!', success: false })
    });
    // return res.status(400).json({ msg: 'no ok', success: false })
  } catch (error) {
    console.log("error on placeOrder: ", error);
    return res.status(500).json({ msg: error.message, error })
  }
}


const walletAdd = async (req, res) => {
  const { amount, bounusAmount = 0, date } = req.body;

  const { razorpay_signature, razorpay_order_id, razorpay_payment_id } = req.body.data;

  const userId = req.user._id;
  const gstRate = 0.22; // GST rate 22%
  const session = await mongoose.startSession();

  try {
 

    await session.withTransaction(async () => {
      const transactions = [
    
      ];
      // Verify payment signature
      const isValid = verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature, razorPyaSecret);
      if (!isValid) {
        throw new Error("Failed to verify payment!");
      }

      // Fetch offer settings
      const oferRechargeSettingResponse = await oferRechargeSetting.findOne().session(session);

      // Find existing transaction
      const checkTransaction = await Transaction.findOne({ order_id: razorpay_order_id }).session(session);
      const referal =  await referalSchema.findOne({refereeId:userId})
      const referrerId = referal?.referrerId
      
      if (!checkTransaction) {
        throw new Error("Failed to verify payment! Please repay.");
      }

    
      // Calculate GST and final amount after deduction
      const AfterGST = amount - amount * gstRate;

      if (referrerId && referal?.rewardAmount>referal?.creditRewardAmount) {
        const amountDistributionPercentage=(referal.amountDistributionPercentage/100)
        const amountToAdd = (amount*amountDistributionPercentage)>(referal?.rewardAmount-referal?.creditRewardAmount)
                            ?(referal?.rewardAmount-referal?.creditRewardAmount) : (amount*amountDistributionPercentage)

                            // console.log(amountDistributionPercentage,amount,amountToAdd)


                            await Wallet.findOneAndUpdate(
                              { user: referrerId },
                              { $inc: { balance: amountToAdd } },
                              { session, upsert: true, new: true, returnDocument: "after" }
                            );

                            console.log("Checkpoint 1 - Amount Distribution:", 100);

      referal.creditRewardAmount += Number((amountToAdd).toFixed(2));

      transactions.push( {
        user: referrerId,
        type: "credit",
        amountType: "referral",
        amount: amountToAdd,
        description: `Referral Amount: ${amountToAdd.toFixed(2)} added to your wallet`
      },)
      referal.save({ session })
    }


      // Update or create wallet entry
      const wallet = await Wallet.findOneAndUpdate(
        { user: userId },
        { $inc: { balance: AfterGST, bonusAmount: bounusAmount } },
        { session, upsert: true, new: true }
      );

      // Save GST transaction
      await new TDSGSTtransaction({
        user: userId,
        type: "GST",
        amount: amount * gstRate,
      }).save({ session });

      // Bonus handling
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const startExpireOfDay = new Date();
      startExpireOfDay.setDate(startExpireOfDay.getDate() + oferRechargeSettingResponse?.minimumCashBonusExpireDay);
      startExpireOfDay.setHours(0, 0, 0, 0);

      const endExpireOfDay = new Date();
      endExpireOfDay.setDate(endExpireOfDay.getDate() + oferRechargeSettingResponse?.minimumCashBonusExpireDay);
      endExpireOfDay.setHours(23, 59, 59, 999);

      const expirEDate = new Date();
      expirEDate.setDate(expirEDate.getDate() + oferRechargeSettingResponse?.minimumCashBonusExpireDay);

      const existingBonus = await cashBonus.findOne({
        user: userId,
        bonusAmountDate: { $gte: startOfDay, $lt: endOfDay },
        expireBonusAmountDate: { $gte: startExpireOfDay, $lt: endExpireOfDay },
      }).session(session);

      if (existingBonus) {
        existingBonus.bonusAmount += bounusAmount;
        existingBonus.remainingBonusAmount += bounusAmount;
        await existingBonus.save({ session });
      } else {
        await new cashBonus({
          bonusAmount: bounusAmount,
          usedBonusAmount: 0,
          remainingBonusAmount: bounusAmount,
          bonusAmountDate: new Date(),
          bonusType: "Credit",
          user: userId,
          expireBonusAmountDate: expirEDate,
        }).save({ session });
      }

      // Prepare transaction history
  

      // Update transaction record
      Object.assign(checkTransaction, {
        razorpay_payment_id,
        pay_amount: amount,
        afterGstAmountDeduct: AfterGST,
        gstAmountDeduct: amount * gstRate,
        pay_date: date,
        paymentStatus: "paid",
        type: "credit",
        amountType: "realAmount",
      });
      await checkTransaction.save({ session });
        transactions.unshift(
          {
            user: userId,
            type: "credit",
            amountType: "realAmount",
            amount: AfterGST,
            description: `Added ${AfterGST} to your wallet (After GST)`,
          },
          {
            user: userId,
            type: "credit",
            amountType: "bonusAmount",
            amount: bounusAmount,
            description: `Added ${bounusAmount} to your wallet as a bonus`,
          },
          {
            user: userId,
            type: "debit",
            amountType: "gstDeduct",
            amount: amount * gstRate,
            description: `Deducted GST ${amount * gstRate} from your wallet`,
          },
        )
      // Insert transactions
      await TransactionHistory.insertMany(transactions, { session });
      await session.commitTransaction(); // Ensure transaction is completed

      // Success response
      res.status(200).json({
        success: true,
        message: "Funds added successfully",
        newBalance: wallet.balance,
        bonusCashExpireDate:expirEDate
      });
    });
  } catch (error) {
    console.error("Error on adding amount to wallet:", error);
    res.status(500).json({ error: "Error adding funds", success: false });
  } finally {
    session.endSession();
  }
};


const refundAmount = async (req, res) => {
  const razorpay_payment_id = req.params.id
  try {
    const checkPayment = await Transaction.findOne({ razorpay_payment_id })
    if (!checkPayment) {
      return res.status(400).json({ message: "Payment not found" });
    }
    const result = await instance.payments.refund(razorpay_payment_id, {
      "amount": `${checkPayment?.payment}00`,
      "speed": "normal",
      // "receipt": "Receipt No. 31"
    })
    if (result.error) {
      console.log("error on refund: ", result.error);
      return res.status(400).json({ message: "Failed to refund payment", success: false });
    }
    // console.log("result: ", result);

    checkPayment.paymentStatus = 'refunded'
    checkPayment.refundId = result?.id
    checkPayment.refund_at = new Date()
    await checkPayment.save();
    return res.status(200).json({ message: "Payment refunded successfully. Amount will be credited  within 5-7 working days after the refund has processed", success: true });
  } catch (error) {
    return res.status(500).json({ error: "Error refundAmount funds", success: false });
  }
}

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

    const transactions = await TransactionHistory.find(query)
    .sort({ createdAt: -1 }) // Sorting by `createdAt` in descending order
    .select("-user")
    .skip((page - 1) * limit)
    .limit(Number(limit));

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

       const responseCashBonus = await cashBonus.aggregate([
          {
            $match: {
              user: new mongoose.Types.ObjectId(userId), // Match the specific user
            },
          },
          {
          $group: {
            _id: null, // Or group by another field if needed
            totalCreditBonusCash: {
                $sum: "$remainingBonusAmount"
            },
            totalExpiredBonusAmount: {
              $sum: {
                $cond: [
                  {
                    $lt: [
                      "$bonusAmountDate",
                      new Date(new Date().setDate(new Date().getDate() - 30))
                    ]
                  },
                  "$remainingBonusAmount", // If expired, add the amount
                  0 // Otherwise, add 0
                ]
              }
            },
            totalNonExpiredBonusAmount: {
              $sum: {
                $cond: [
                  {
                    $gte: [
                      "$expireBonusAmountDate", // Check if not expired
                      new Date(),
                    ],
                  },
                  "$remainingBonusAmount", // Add amount if valid
                  0, // Otherwise, add 0
                ],
              },
            },
          }
          }
        ])

        const result = await cashBonus.aggregate([
          {
            $match: {
              user: new mongoose.Types.ObjectId(userId), // Match the specific user
            },
          },
          {
            $match: {
              expireBonusAmountDate: { $gte: new Date() } // Ensure it's a future expiration
            }
          },
          {
            $sort: { expireBonusAmountDate: 1 } // Sort in ascending order (earliest expiring first)
          },
          {
            $limit: 1 // Get only the most recent expiring bonus
          }
        ]);
    


    if (!wallet) {
      return res.status(400).json({ message: "wallet not found" });
    }

    res.status(200).json({
      success: true,
      newBalance: {...wallet.toObject(),
      },
      bonusCashInfo:{
        totalCreditBonusCash:responseCashBonus[0]?.totalCreditBonusCash||0,
        totalExpiredBonusAmount:responseCashBonus[0]?.totalExpiredBonusAmount||0,
        totalNonExpiredBonusAmount:responseCashBonus[0]?.totalNonExpiredBonusAmount||0,
        expiringBonusAmount:result[0]||0
            }
    });
  } catch (error) {
    console.log(error)
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
  const userIdToMatch = new mongoose.Types.ObjectId(req.params.id || req.user._id)

  // console.log("userIdToMatch",userIdToMatch)

  const response = await userBidDetails.aggregate([
    {
      $match: { userId: userIdToMatch },
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
    ...(categoryId !== "all"
      ? [{ $match: { "subcategoryDetail.auctioncategory": new mongoose.Types.ObjectId(categoryId) } }]
      : []),
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

  const playingContestCategory = await userBidDetails.aggregate([
    {
      $match: { userId: userIdToMatch },
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

  const winningRangeResponse = await contesthistory.aggregate([
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
    ...(categoryId !== "all"
      ? [{ $match: { "subcategoryDetail.auctioncategory": new mongoose.Types.ObjectId(categoryId) } }]
      : []),
      {
        $match: {
          "userranks.userId": userIdToMatch,
          "userranks.isInWiningRange": true
        }
      },
      {
        $unwind: "$userranks"
      },
      {
        $match: {
          "userranks.userId": userIdToMatch,
          "userranks.isInWiningRange": true
        }
      },
      {
        $group: {
          _id: {
            contestId: "$contestId",
            timeslotId: "$timeslotId",
          },
          earnAmount:{
            $sum:"$userranks.WinningAmount"
          },
          allAmount: { $push: "$userranks.WinningAmount" }     
           }
      },
  ]);

  const response2 = await User.findById(req.params.id || req.user._id).select('name _id createdAt following followers')

  try {
    return res.status(200).json({
      success: true, data: {
        name: response2.name, _id: response2._id,
        contestCount: response[0]?.contestCount||0, 
        ctegory: playingContestCategory[0]?.ctegory||[], 
        winingPersentage: (winningRangeResponse?.length/(response[0]?.contestCount||0))*100, 
        earnAmount: winningRangeResponse.reduce((acc,el)=>acc+el.earnAmount,0).toFixed(2), 
        followers: response2.followers.length, 
        following: response2.following.length,
        expirEDate:response2.createdAt
      }
    })
  } catch (error) {
    console.log(error)
    return res.status(500).json({ success: false, data: error })
  }
};


const getUsersTopRank = async (req,res)=>{
  try{
    const responseObj = await rankSetting.findOne()

    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - Number(responseObj?.maximumDaysObservation||10));
    
    const response = await contesthistory.aggregate([
      ...(responseObj?.isCollectionLimit === "yes" && !isNaN(Number(responseObj?.maximumCollectionLimit)) 
      ? [{ $limit: Number(responseObj?.maximumCollectionLimit) }] 
      : []),
      {
      $match:{userranks:{$ne:[]}}
      },
      {
        $lookup: {
          from: "timesheduleschemas",
          let: { timeslotId: "$timeslotId" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", "$$timeslotId"] }, // Match related timeslots
                $or: [
                  { startTime: { $gte: tenDaysAgo } },
                  { endTime: { $gte: tenDaysAgo } }
                ],
              },
            },
          ],
          as: "timeSlots",
        },
      },
      {
        $match: { timeSlots: { $ne: [] } }, // Ensure only contests with valid timeSlots remain
      },
      {
        $unwind:"$userranks"
      },
      {
        $group:{
          _id:"$userranks.userId",
          winningCount: {
            $sum: { $cond: [{ $eq: ["$userranks.isInWiningRange", true] }, 1, 0] }
          },
          notWinningCount: {
            $sum: { $cond: [{ $eq: ["$userranks.isInWiningRange", false] }, 1, 0] }
          },
          totalWiningAmount:{
            $sum:"$userranks.WinningAmount"
          }
        },
        
      },
      {
        $lookup: {
          from: "users",
          localField:"_id",
          foreignField:"_id",
          pipeline:[
            {$project:{
              name:1,
              email:1,
            }}
          ],
          as: "userDetail",
        },
      },
      {
        $unwind:"$userDetail"
      },
      {$sort:{totalWiningAmount:-1}},
      {$limit:responseObj?.userLimit||100}
    ]);

    const response2 =  await referalSchema.aggregate([
      {
        $group:{
          _id:"$referrerId",
       
          earnCount: {
            $sum: {
              $cond: [{ $gt: ["$creditRewardAmount", 0] }, 1, 0]
            }
          },
          pendingCount: {
            $sum: { $cond: [{ $eq: ["$creditRewardAmount", 0] }, 1, 0] }
          },
          totalEarningAmount:{
            $sum:"$creditRewardAmount"
          }
        },
      },
      {
        $lookup: {
          from: "users",
          localField:"_id",
          foreignField:"_id",
          pipeline:[
            {$project:{
              name:1,
              email:1,
            }}
          ],
          as: "userDetail",
        },
      }, 
      {
        $unwind:"$userDetail"
      },
      {$sort:{
        totalEarningAmount:-1
      }}
    ]) 
    

    
   return res.status(200).json({
    data:{
    topUserranks:response.map((el,i)=>({...el,rank:i+1})),
    topReferalUserRanks:response2.map((el,i)=>({...el,rank:i+1})),
   },success: true})
  }catch  (error) {
    console.log(error)
    return res.status(500).json({ success: false, data: error })
  }
}

const UpdateUserName = async (req, res) => {
  try{
   const { referalCode, userName } = req.body;

  }catch (error){
    return res.status(500).json({ success: false, data: error })
  }
}

const handleCheckUserAlreadyLogin = async (req, res) => {
  try {
    const user = await User.findById(req?.user?._id);
    if (!user?.name) {
      return res.status(200).json({ success: false, message: "User not logged in" });
    }
    
    return res.status(200).json({ success: true, message: "User is logged in" });
  } catch (error) {
    console.log(error)
    return res.status(500).json({ success: false, message: "Invalid or expired token" });
  }
};

const handleCheckUserNameExist = async (req, res) => {
  try {
    const user = await User.findOne({ name: req.body.name.trim() });
    if (!req.body.name.trim() || req.body.name.trim().length < 6) {
      return res.status(200).json({ 
        success: false, 
        message: "Username must be at least 6 characters long" 
      });
    }
    if (user) {
      return res.status(200).json({ success: false, message: "Username already exists" });
    }
    return res.status(200).json({ success: true, message: "Username is available  " });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

const handleCheckReferralExist = async (req, res) => {
  try {
    const { referralCode } = req.body;
    // If no referral code is provided, allow the user to proceed
    if (!referralCode?.trim()) {
      return res.status(200).json({ success: true, message: "" });
    }

    // Check if the referral code exists
    const referral = await User.findOne({ referralCode: referralCode.trim() });

    if (!referral) {

      return res.status(200).json({ success: false, message: "Referral code does not exist" });

    }
    return res.status(200).json({ success: true, message: "Referral code is valid " });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

const HandleUserNameReferralCode = async (req, res) => {
  try {
    const { name, referalCode } = req.body;

    // Validate inputs
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ success: false, message: "Name is required" });
    }

    const trimmedName = name.trim();

    // Check if username already exists
    const userNameCheck = await User.findOne({ name: trimmedName });
    if (userNameCheck) {
      return res.status(400).json({ success: false, message: "Username already exists" });
    }

    // Check if referral code exists
    if (referalCode && typeof referalCode === "string") {
      const trimmedReferralCode = referalCode.trim();
      const referral = await User.findOne({ referralCode: trimmedReferralCode });
      const refereeExists = await referalSchema.findOne({ refereeId: req.user._id });

      // Fetch referral settings
      const referalResponse = await referalController.findOne({}); // Ensure proper query if needed

      console.log(referral,refereeExists)

      if (referral && !refereeExists) {
        const newReferral = new referalSchema({
          referrerId: referral._id, // Corrected `referrerId`
          refereeId: req.user._id,
          referralCode: trimmedReferralCode,
          status: "Pending",
          creditRewardAmount: 0,
          rewardAmount: referalResponse?.amount || 100, // Fixed logical OR
          amountDistributionPercentage: referalResponse?.amountDistributionPercentage || 50,
          referalType: referalResponse?.referalType || "Real cash", // Ensure fallback
          isLogin: true,
        });

        await newReferral.save();
      }
    }

    // Update username
    const user = await User.findByIdAndUpdate(req.user._id, { name: trimmedName }, { new: true });

    return res.status(200).json({
      success: true,
      message: "Username applied successfully",
      user,
    });
  } catch (error) {
    console.error("Error in HandleUserNameReferralCode:", error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};







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
  HandleFollowing,
  placeOrder,
  refundAmount,
  getUsersTopRank,
  handleCheckUserAlreadyLogin,
  handleCheckUserNameExist,
  HandleUserNameReferralCode,
  handleCheckReferralExist
};
