const { Types } = require("mongoose");
const privatecontest = require("../model/privatecontest");
const walletSchema = require("../model/walletSchema");
const TransactionHistory =require("../model/transactionhistory");
const { sendSingleNotification } = require("./sendNotification");

const handlaeAllContestPrizeDistribution  = async (contest, session) => {
    try{
      const influncerId =  contest.influencer
      const influencerfee = contest.influencerfee

    const winningUsers = contest?.ranks
        .filter((rank) => rank.isInWiningRange && rank.WinningAmount > 0)
        .map((rank) => ({
            userId: rank.userId,
            WinningAmount: rank.WinningAmount,
        }));



    const bulkOperations = winningUsers.map((user) => ({
        updateOne: {
            filter: { user: user.userId },
            update: { $inc: { winningbalance: user.WinningAmount } },
            maxTimeMS: 60000,  // Set a max time (in ms) for the operation to run
        },
    }));


    // // Perform both bulk updates within the same session
    const amountToAdd = (contest?.ranks.length * contest.createdEntryFee) * ((influencerfee||10) / 100);

    const response =  await walletSchema.bulkWrite(bulkOperations);
    const response1 = await privatecontest.findByIdAndUpdate(contest._id,{isPrizeDistributed: true,earnAmount:amountToAdd},{new:true});


   const transactions = winningUsers.map(user => ({
        user: user.userId,
        type: "winning",
        amount: user.WinningAmount,
        description: `${user.WinningAmount} credited to your wallet as a prize for winning the Private contest`
   }));

   winningUsers.filter((el)=>el.WinningAmount).map((user)=>{
    sendSingleNotification(user.userId,
        `Congratulations! You've won ${user.WinningAmount}`,
        `A prize of ${user.WinningAmount} has been credited to your wallet. Enjoy!`,
        {
          linkPath:"PrivateViewContest",
          notficationParamObj:{
             flexible:"yes",
             cardFrom:"winnings",
             contestId:response1._id
            }
        }
    )    
})
   transactions.push({
    user: influncerId,
    type: "winning",
    amount: amountToAdd,
    description: `${amountToAdd} credited to your wallet as a prize for winning the Private contest`
  })

  const response4 = await walletSchema.findOneAndUpdate(
    { user: influncerId },  // Make sure influncerId is a valid ObjectId
    { $inc: { privateContestAmount: amountToAdd } }, // Increment the amount
    { new: true, upsert: false } // Return updated document, do not create new one if missing
  );
  

  const response3 = await TransactionHistory.insertMany(transactions);


   sendSingleNotification(influncerId,
    `Congratulations! Your Private Contest Earning ${amountToAdd}`,
    `A prize of ${amountToAdd} has been credited to your wallet. Enjoy!`,
    {
      linkPath:"PrivateViewContest",
      notficationParamObj:{
         flexible:"yes",
         cardFrom:"winnings",
         contestId:response1._id
        }
    }
)    
   
   return Promise.all([response,response1,response3,response4])

   

} catch (error){
    console.log('error',error)
    throw error
}
};


async function handalePrivatePrizeDistribution(req, res) {
    // const session = await userDetail.startSession(); // Start a new session
    // session.startTransaction(); // Begin the transaction

    try {

        const pipeline = [
            {
              $addFields: {
                currentTime: {
                  $dateToString: {
                    format: "%Y-%m-%d %H:%M:%S", // Define the date format
                    date: "$$NOW", // MongoDB's system variable for current date/time
                    timezone: "Asia/Kolkata", // Set timezone to IST
                  },
                },
              },
            },
            {
              $addFields: {
                status: {
                  $switch: {
                    branches: [
                      {
                        case: { $gt: ["$startDateTime", "$$NOW"] },
                        then: "Upcoming",
                      },
                      {
                        case: {
                          $and: [
                            { $lte: ["$startDateTime", "$$NOW"] },
                            { $gte: ["$endDateTime", "$$NOW"] },
                          ],
                        },
                        then: "Live",
                      },
                      {
                        case: { $lt: ["$endDateTime", "$$NOW"] },
                        then: "Winning",
                      },
                    ],
                    default: "Unknown",
                  },
                },
              },
            },
            {
                $match: {
                  status: "Winning",
                  $or: [
                    { isPrizeDistributed: false }, // Explicitly false
                    { isPrizeDistributed: { $exists: false } }, // Field does not exist
                    
                  ],
                  ranks: { $exists: true, $ne: [], $type: "array" }, // Ensure ranks is a non-empty array
                },
              }
            
          ];
          
          

        const contest = await privatecontest.aggregate(pipeline);
        await Promise.all(contest.map(async (el) => await handlaeAllContestPrizeDistribution(el, 'session')));

    } catch (error) {
        // If any error occurs, abort the transaction
        // await session.abortTransaction();
        // res.status(500).json({ success: false, message: "Failed to distribute winnings", data: error });
    } finally {
        // End the session
        // session.endSession();
    }
}






module.exports = { handalePrivatePrizeDistribution };
