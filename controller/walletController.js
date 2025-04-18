const { Types } = require("mongoose");

const TransactionHistory = require("../model/transactionhistory");
const Wallet = require("../model/walletSchema");
const cashBonus = require("../model/admin/cashBonus");
const rechargeInfo = require("../model/Transaction");
const referalSchema =  require("../model/user/referal")


// note :-Bonas Cash Have Expire Date

//use bonas amount while bidding it will deduct 9+1 
// earn bonus amount will get after placing  10+1 

// Rferal Amount and Deposite  percentgae amount 
// both will come to admin panel 

//Example 

// refral 
// Condition 
// amount 100

// When Ever My Shared User Deposite I get 10% untill will 
// referal amoun 100 === to all 10% taken amount to user 
// 10% percent must be below 100 


const walletObj = {
  totalDepositeBalance: 0,
  walletBalance: 0, // direct schema 
  totalWinningBalance: 0,
  referalAmount: 0,
  Tax: 0,//                  tax = totalDepositeBalance -  totalWiningBalance  - referalAmount
  withDrwalBalance: 0,  // tax*0.3 if in posiitive there would be deduction other wise no deduction 
  totalGstDeductAmount: 0, //  totalGstDeduct
  withDrwalBalanceAfterTax:0,     // Winning balance - Tax.
  tdsDeduct: 0, //  totalTdsDeduct
  BonashCashCredit: 0, // bonash cash credit 
  BonashCashExpired: 0,  // bonash cash expre   
  BonushCashRemaining: 0, // remining bonash cash 
  totalExpiredBonus: 0, // total bonash cash use
  totalExpiredBonusAmount:0,
  totalNonExpiredBonusAmount:0,
  totalCreditBonusCash:0,
  totalBonusAmountUsed:0,
}



const hndaleTransitionCalculation = async (req, res) => {
  try {

    const responseWallet = await Wallet.findOne({ user: req.user._id })
    const totalWaletAmount = responseWallet.balance


    const responseCashBonus = await cashBonus.aggregate([
      {
        $match: {
          user: new Types.ObjectId(req.user._id), // Match the specific user
        },
      },
      {
        $group: {
          _id: null, // Group all records for the user
          totalCreditBonusCash: {
            $sum: "$bonusAmount",
          },
          totalExpiredBonusAmount: {
            $sum: {
              $cond: [
                {
                  $lt: [
                    "$expireBonusAmountDate", // Check expiration date
                    new Date(),
                  ],
                },
                "$remainingBonusAmount", // Add amount if expired
                0, // Otherwise, add 0
              ],
            },
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
          totalBonusAmountUsed: {
            $sum: "$usedBonusAmount",
          },
        },
      },
    ]);

    const totaRecharge = await rechargeInfo.aggregate([
      {
        $match: {
          user: new Types.ObjectId(req.user._id), // Match the specific user
        },
      },
      {
        $group: {
          _id: null,
          rechargeTotal: { $sum: "$pay_amount" }, // Sum up the pay_amount field
        },
      },
    ]);

    const rechargeTotal = totaRecharge.length > 0 ? totaRecharge[0].rechargeTotal : 0;


    const response = await TransactionHistory.aggregate([
      {
        $match: {
          user: new Types.ObjectId(req.user._id), // Match the specific user
        },
      },
      {
        $group: {
          _id: null, // Or group by another field if needed
          totalDepositeBalance: {
            $sum: {
              $cond: [
                {
                  $and: [ // Combine multiple conditions
                    {
                      $or: [
                        { $eq: ["$amountType", "realAmount"] }, // Condition 2a: amountType is "realAmount"
                        { $not: ["$amountType"] }, // Condition 2b: amountType does not exist
                      ],
                    },
                    { $eq: ["$type", "credit"] } // Condition 2: 'amount' is greater than 100
                  ],
                },
                "$amount", // Add the 'amount' if both conditions are true
                0, // Otherwise, add 0
              ],
            },
          },
          totalwithdrawBalance: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$type", "withdraw"] } // Condition 2: 'amount' is greater than 100
                  ],
                },
                "$amount", // Add the 'amount' if both conditions are true
                0, // Otherwise, add 0
              ],
            },
          },
          totalWinningBalance: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$type", "winning"] } // Condition 2: 'amount' is greater than 100
                  ],
                },
                "$amount", // Add the 'amount' if both conditions are true
                0, // Otherwise, add 0
              ],
            },
          },
          totalGstDeductAmount: {
            $sum: {
              $cond: [
                {
                  $and: [ // Combine multiple conditions
                    { $eq: ["$amountType", 'gstDeduct'] }, // Condition 1: 'sent' is true
                    { $eq: ["$type", "debit"] } // Condition 2: 'amount' is greater than 100
                  ],
                },
                "$amount", // Add the 'amount' if both conditions are true
                0, // Otherwise, add 0
              ],
            },
          },
          totalTdsDeductAmount: {
            $sum: {
              $cond: [
                {
                  $and: [ // Combine multiple conditions
                    { $eq: ["$amountType", 'tdsDeduct'] }, // Condition 1: 'sent' is true
                    { $eq: ["$type", "debit"] } // Condition 2: 'amount' is greater than 100
                  ],
                },
                "$amount", // Add the 'amount' if both conditions are true
                0, // Otherwise, add 0
              ],
            },
          },
          totalGstDeductAmount: {
            $sum: {
              $cond: [
                {
                  $and: [ // Combine multiple conditions
                    { $eq: ["$amountType", 'gstDeduct'] }, // Condition 1: 'sent' is true
                    { $eq: ["$type", "debit"] } // Condition 2: 'amount' is greater than 100
                  ],
                },
                "$amount", // Add the 'amount' if both conditions are true
                0, // Otherwise, add 0
              ],
            },
          },
          referalAmount: {
            $sum: {
              $cond: [
                {
                  $and: [ // Combine multiple conditions
                    { $eq: ["$amountType", 'referral'] }, // Condition 1: 'sent' is true
                    { $eq: ["$type", "credit"] } // Condition 2: 'amount' is greater than 100
                  ],
                },
                "$amount", // Add the 'amount' if both conditions are true
                0, // Otherwise, add 0
              ],
            },
          },
          taxAmount: {
            $sum: {
              $cond: [
                {
                  $and: [ // Combine multiple conditions
                    { $eq: ["$amountType", 'tax'] }, // Condition 1: 'sent' is true
                    { $eq: ["$type", "withdraw"] } // Condition 2: 'amount' is greater than 100
                  ],
                },
                "$amount", // Add the 'amount' if both conditions are true
                0, // Otherwise, add 0
              ],
            },
          },
          withdrawAmount: {
            $sum: {
              $cond: [
                {
                  $and: [ // Combine multiple conditions
                    { $eq: ["$amountType", 'realAmount'] }, // Condition 1: 'sent' is true
                    { $eq: ["$type", "withdraw"] } // Condition 2: 'amount' is greater than 100
                  ],
                },
                "$amount", // Add the 'amount' if both conditions are true
                0, // Otherwise, add 0
              ],
            },
          },
        },

      },
    ]);



    const amountCalculationObj = response[0]
    const amountCalculationObjCashBonus = responseCashBonus[0]

    walletObj.totalDepositeBalance = rechargeTotal
    walletObj.totalExpiredBonus =  amountCalculationObj.totalExpiredBonus
    walletObj.totalWinningBalance =  amountCalculationObj.totalWinningBalance
    walletObj.totalGstDeductAmount =  amountCalculationObj.totalGstDeductAmount
    walletObj.Tax = amountCalculationObj?.taxAmount 
    walletObj.withDrwalBalance = amountCalculationObj?.withdrawAmount



    walletObj.totalExpiredBonusAmount =  amountCalculationObjCashBonus?.totalExpiredBonusAmount
    walletObj.totalNonExpiredBonusAmount =  amountCalculationObjCashBonus?.totalNonExpiredBonusAmount
    walletObj.totalCreditBonusCash = amountCalculationObjCashBonus?.totalCreditBonusCash
    walletObj.totalBonusAmountUsed = amountCalculationObjCashBonus?.totalBonusAmountUsed   
    walletObj.withDrwalBalanceAfterTax = 

     res.status(200).json({ data: { ...walletObj, totalWaletAmount, _id: req.user._id }, success: true })
    
  } catch (error) {
    console.log(error)
    return res.status(500).json({ data: error, success: true })
  }

}

const handleWithdrawal = async (req, res) => {
  
    const {amount,type } = req.body;
    
    if (!amount) {
      return res.status(400).json({ success: false, message: "amount are required." });
    }

        //     // Start a session for transaction management
        const session = await Wallet.startSession();
        session.startTransaction();
    
        try {
       // Find user's wallet
          // console.log(req.user._id)
       
          const wallet = await Wallet.findOne({ user: req.user._id }).session(session);

          const response2 =  await referalSchema.aggregate([
            {$match:{referrerId:new Types.ObjectId(req.user._id)}},
            {$group:{_id:null,totalEarningAmount:{ $sum:"$creditRewardAmount"}}},
            {$sort:{totalEarningAmount:-1}}
          ]) 

          const transactionAmount = await TransactionHistory.aggregate([
            {
              $match: {
                user: new Types.ObjectId(req.user._id), // Match the specific user
              },
            },
            {
              $group: {
                _id: null, // Or group by another field if needed
                totalDebitReferral: {
                  $sum: {
                    $cond: [
                      {
                        $and: [ // Combine multiple conditions
                          {
                            $or: [
                              { $eq: ["$amountType", "referral"] }, // Condition 2a: amountType is "realAmount"
                              { $not: ["$amountType"] }, // Condition 2b: amountType does not exist
                            ],
                          },
                          { $eq: ["$type", "debit"] } // Condition 2: 'amount' is greater than 100
                        ],
                      },
                      "$amount", // Add the 'amount' if both conditions are true
                      0, // Otherwise, add 0
                    ],
                  },
                },
                totalWithdraw: {
                  $sum: {
                    $cond: [
                      {
                        $and: [ // Combine multiple conditions
                          {
                            $or: [
                              { $eq: ["$amountType", "realAmount"] }, // Condition 2a: amountType is "realAmount"
                              { $not: ["$amountType"] }, // Condition 2b: amountType does not exist
                            ],
                          },
                          { $eq: ["$type", "withdraw"] } // Condition 2: 'amount' is greater than 100
                        ],
                      },
                      "$amount", // Add the 'amount' if both conditions are true
                      0, // Otherwise, add 0
                    ],
                  },
                },
              },
            },
          ]);

          const totaRecharge = await rechargeInfo.aggregate([
            {
              $match: {
                user: new Types.ObjectId(req.user._id), // Match the specific user
              },
            },
            {
              $group: {
                _id: null,
                rechargeTotal: { $sum: "$pay_amount" }, // Sum up the pay_amount field
              },
            },
          ]);
          
          const rechargeTotal = totaRecharge.length > 0 ? totaRecharge[0].rechargeTotal : 0;
          const totalEarningAmount = response2[0]?.totalEarningAmount

          const totalDebitReferral = transactionAmount[0]?.totalDebitReferral
          const totalWithdraw = transactionAmount[0]?.totalWithdraw

          const tdsTax = ((totalWithdraw  +wallet.winningbalance)  - rechargeTotal) *0.3


  

          if (!wallet) {
            res.status(404).json({ success: false, message: "User wallet not found." });
            session.endSession();
          }
            
          if (wallet.privateContestAmount < amount &&type=="private" ) {
            // throw new Error("Insufficient balance.");
            res.status(402).json({ success: false, message: "Insufficient balance" });
            session.endSession();
          }  
          totalDebitReferral
          if (wallet.winningbalance < amount &&type=="withdrawable" ) {
            // throw new Error("Insufficient balance.");
            res.status(402).json({ success: false, message: "Insufficient balance" });
            session.endSession();
          } 

          if ((totalEarningAmount -totalDebitReferral ) < amount &&type=="referral" ) {
            // throw new Error("Insufficient balance.");
            res.status(402).json({ success: false, message: "Insufficient balance" });
            session.endSession();
          } 
          // wallet.privateContestAmount = 500

          // console.log((tdsTax))

          // Deduct the amount from the user's wallet
           if(type=="withdrawable"){
            if(tdsTax>0 &&  wallet.winningbalance > (tdsTax + amount)){
              wallet.winningbalance -= (tdsTax + amount);

              const transactions = [
                {
                  user: req.user._id,
                  amountType: "realAmount",
                  type: "withdraw",
                  amount,
                  description: `An amount  of ${amount} has been withdrawn from your wallet.`,
                },
                {
                  user: req.user._id,
                  amountType: "tax",
                  type: "withdraw",
                  amount: tdsTax,
                  description: `TDS of ${tdsTax} has been deducted from your wallet.`,
                },
              ];
              
              await TransactionHistory.insertMany(transactions, { session });
              await wallet.save({ session });
            }else{
              wallet.winningbalance -= amount;
              const transaction = new TransactionHistory({
                user: req.user._id,
                amountType: "realAmount",
                type: "withdraw",
                amount,
                description: `An amount of ${amount} has been Withdraw from your wallet.`,
              });
              await transaction.save({ session });
              await wallet.save({ session });
            }

           }else if(type=="private"){
            wallet.privateContestAmount-= amount
            const transaction = new TransactionHistory({
              user: req.user._id,
              amountType:"realAmount",
              type: "privateContestWithdraw",
              amount,
              description: `An amount of ${amount} has been Withdraw from your Referral wallet.`,
            });
            await transaction.save({ session });
            await wallet.save({ session });
          }else{
            const transaction = new TransactionHistory({
              user: req.user._id,
              amountType:"referral",
              type: "debit",
              amount,
              description: `An amount of ${amount} has been Withdraw from your Referral wallet.`,
            });
            await transaction.save({ session });
            await wallet.save({ session });
          }
          

          await session.commitTransaction();
          session.endSession();
    
          res.status(200).json({ success: true, message: "Withdrawal successful.",withDrwalBalance:amount });
          
        } catch (error) {
          // Rollback the transaction in case of any error
          await session.abortTransaction();
          session.endSession();
    
          res.status(500).json({ success: false, message: error.message });
  
        }
  
  
};

const  handleGetWithdrawalBalance = async (req, res)=>{
  try{

    const responseWallet = await Wallet.findOne({ user: req.user._id })
    
        const response2 =  await referalSchema.aggregate([
          {
            $match:{referrerId:new Types.ObjectId(req.user._id) }
          },
          {
            $group:{
              _id:null,
              totalEarningAmount:{
                $sum:"$creditRewardAmount"
              }
            },
          },
          {$sort:{
            totalEarningAmount:-1
          }}
        ]) 

        const transactionAmount = await TransactionHistory.aggregate([
          {
            $match: {
              user: new Types.ObjectId(req.user._id), // Match the specific user
            },
          },
          {
            $group: {
              _id: null, // Or group by another field if needed
              totalDebitReferral: {
                $sum: {
                  $cond: [
                    {
                      $and: [ // Combine multiple conditions
                        {
                          $or: [
                            { $eq: ["$amountType", "referral"] }, // Condition 2a: amountType is "realAmount"
                            { $not: ["$amountType"] }, // Condition 2b: amountType does not exist
                          ],
                        },
                        { $eq: ["$type", "debit"] } // Condition 2: 'amount' is greater than 100
                      ],
                    },
                    "$amount", // Add the 'amount' if both conditions are true
                    0, // Otherwise, add 0
                  ],
                },
              }
            },
          },
        ]);


    res.status(200).json({
      success:true,
      data:[
        {value: (response2[0]?.totalEarningAmount - transactionAmount[0]?.totalDebitReferral), label: 'Referral Amount',type:"referral"},
        {value: responseWallet.privateContestAmount, label: 'Private Contest Balance',type:"private"},
        {value:responseWallet.winningbalance, label: 'Withdrawable balance',type:"withdrawable"},
      ]

    })
  }catch(error){
    res.status(500).json({ success: false, message: error.message });
  }
}


module.exports = { hndaleTransitionCalculation, handleWithdrawal,handleGetWithdrawalBalance }
