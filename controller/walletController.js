const { Types } = require("mongoose");
const TransactionHistory = require("../model/transactionhistory");
const Wallet = require("../model/walletSchema");

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
  totalWiningBalance: 0,
  referalAmount: 0,
  Tax: 0,//                  tax = totalDepositeBalance -  totalWiningBalance  - referalAmount
  withDrwalBalance: 0,  // tax*0.3 if in posiitive there would be deduction other wise no deduction 
  totalgstDeduct: 0, //  totalGstDeduct
  tdsDeduct: 0, //  totalTdsDeduct
  BonashCashCredit: 0, // bonash cash credit 
  BonashCashExpired: 0,  // bonash cash expre   
  BonushCashRemaining: 0, // remining bonash cash 
  BonushCashUse: 0 // total bonash cash use
}


const hndaleTransitionCalculation = async (req, res) => {
  try {

    const responseWallet = await Wallet.findOne({ user: req.user._id })
    const totalWaletAmount = responseWallet.balance
    const response = await TransactionHistory.aggregate([
      {
        $match: {
          user: new Types.ObjectId(req.user._id), // Match the specific user
        },
      },
      {
        $group: {
          _id: null, // Or group by another field if needed
          totalUseBonusAmount: {
            $sum: {
              $cond: [
                {
                  $and: [ // Combine multiple conditions
                    { $eq: ["$amountType", 'bonusAmount'] }, // Condition 1: 'sent' is true
                    { $eq: ["$type", "debit"] } // Condition 2: 'amount' is greater than 100
                  ],
                },
                "$amount", // Add the 'amount' if both conditions are true
                0, // Otherwise, add 0
              ],
            },
          },
          totalReceivedBonusAmount: {
            $sum: {
              $cond: [
                {
                  $and: [ // Combine multiple conditions
                    { $eq: ["$amountType", 'bonusAmount'] }, // Condition 1: 'sent' is true
                    { $eq: ["$type", "credit"] } // Condition 2: 'amount' is greater than 100
                  ],
                },
                "$amount", // Add the 'amount' if both conditions are true
                0, // Otherwise, add 0
              ],
            },
          },
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
        },

      },
    ]);

    return res.status(200).json({ data: { ...response[0], totalWaletAmount, _id: req.user._id }, success: true })
  } catch (error) {
    return res.status(500).json({ data: error, success: true })
  }

}

const handleWithdrawal = async (req, res) => {
  
    const {amount } = req.body;
    
    if (!amount) {
      return res.status(400).json({ success: false, message: "amount are required." });
    }

        // Start a session for transaction management
        const session = await Wallet.startSession();
        session.startTransaction();
    
        try {
          // Find user's wallet
          const wallet = await Wallet.findOne({ user: req.user._id }).session(session);
          if (!wallet) {
            throw new Error("User wallet not found.");
          }
    
          // Check if the user has sufficient balance
          if (wallet.winningbalance < amount) {
            throw new Error("Insufficient balance.");
          }  
          // Deduct the amount from the user's wallet
          wallet.winningbalance -= amount;
          await wallet.save({ session });
    
          // Add a transaction record for the withdrawal
          const transaction = new TransactionHistory({
            user: req.user._id,
            amountType:"realAmount",
            type: "withdraw",
            amount,
            description: `An amount of ${amount} has been withdrawn from your wallet.`,
          });
  
          await transaction.save({ session });
    
          // Commit the transaction
          await session.commitTransaction();
          session.endSession();
    
          res.status(200).json({ success: true, message: "Withdrawal successful." });
        } catch (error) {
          // Rollback the transaction in case of any error
          await session.abortTransaction();
          session.endSession();
    
          res.status(500).json({ success: false, message: error.message });
  
        }
  
  
};


module.exports = { hndaleTransitionCalculation, handleWithdrawal }
