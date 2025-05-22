const contestHistory = require("../model/contesthistory");
const walletSchema = require("../model/walletSchema");
const TransactionHistory =require("../model/transactionhistory");
const { sendSingleNotification } = require("./sendNotification");

const handlaeAllContestPrizeDistribution  = async (contest, session) => {
    try{
    const winningUsers = contest?.userranks
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
    const response =  await walletSchema.bulkWrite(bulkOperations);
    const response1 = await contestHistory.findByIdAndUpdate(contest._id,{isPrizeDistributed: true},{new:true});


   const transactions = winningUsers.map(user => ({
        user: user.userId,
        type: "winning",
        amount: user.WinningAmount,
        description: `${user.WinningAmount} credited to your wallet as a prize for winning the contest`
   }));

   winningUsers.filter((el)=>el.WinningAmount).map((user)=>{
    sendSingleNotification(user.userId,
        `Congratulations! You've won ${user.WinningAmount}`,
        `A prize of ${user.WinningAmount} has been credited to your wallet. Enjoy!`,
        {
          linkPath:"ViewHomeContest",
          notficationParamObj:{
            flexible:true,
            cardFrom:"wining",
            contestId:response1.contestId, 
            slotId:response1.timeslotId, 
            isUserJoinContest:true
          }
        }
    )    
})

   const response3 = await TransactionHistory.insertMany(transactions);
   return Promise.all([response,response1,response3])

} catch (error){
    console.log('error',error)
    throw error
}
};

async function handalePrizeDistribution(req, res) {
    // const session = await userDetail.startSession(); // Start a new session
    // session.startTransaction(); // Begin the transaction

    try {
        const currentTime = new Date(); // Add 5.5 hours to UTC time

        const contest = await contestHistory.aggregate([
            {
              $lookup: {
                from: "timesheduleschemas",
                localField: "timeslotId",
                foreignField: "_id",
                as: "timeSlots",
              },
            },
            {
              $addFields: {
                status: {
                  $cond: [
                    {
                      $and: [
                        { $lte: ["$timeslotId.startTime", currentTime] }, // Current time is after start time
                        { $gte: ["$timeslotId.endTime", currentTime] },   // Current time is before end time
                      ],
                    },
                    "active", // Status is active if current time is between start and end time
                    "stopped", // Otherwise, it's stopped
                  ],
                },
              },
            },
            {
                $addFields: {
                  currentTime: currentTime,
                },
              },
              {
                $addFields: {
                  currentTime: {
                    $dateToString: {
                      format: "%Y-%m-%d %H:%M:%S", // Define the date format
                      date: new Date(), // Current date and time
                      timezone: "Asia/Kolkata", // Set timezone to IST (Indian Standard Time)
                    },
                  },
                  contestStatus: {
                    $reduce: {
                      input: {
                        $map: {
                          input: "$timeSlots", // Iterate over each timeSlot
                          as: "slot",
                          in: {
                            $cond: {
                              if: {
                                $and: [
                                  { $lte: ["$$slot.startTime", "$currentTime"] }, // Check if the start time is before or equal to current time
                                  { $gte: ["$$slot.endTime", "$currentTime"] },   // Check if the end time is after or equal to current time
                                ],
                              },
                              then: "live", // If the time slot is live
                              else: {
                                $cond: {
                                  if: { $gte: ["$currentTime", "$$slot.endTime"] }, // If the current time is after the slot's end time
                                  then: "wining", // If the contest has ended
                                  else: "upcoming", // If the contest is upcoming
                                },
                              },
                            },
                          },
                        },
                      },
                      initialValue: [], // Start with an empty array
                      in: {
                        $cond: {
                          if: { $in: ["$$this", "$$value"] }, // Check if the current status is already in the accumulated array
                          then: "$$value", // If it already exists, keep the array as it is
                          else: { $concatArrays: ["$$value", ["$$this"]] }, // Otherwise, add the current status to the array
                        },
                      },
                    },
                  },
                },
              },
              { $unwind: "$timeSlots" },
              { $unwind: "$contestStatus" },
            {
              $match: {
                contestStatus: "wining", // Only match contests where status is stopped
                isPrizeDistributed: false, // Check if the prize is not yet distributed
              },
            },
            {
              $limit:10
            }
          ]);
          
        

        // Execute all prize distribution operations in parallel, passing the session
       const bulkResponse =   await Promise.all(contest.map(async (el) => await handlaeAllContestPrizeDistribution(el, 'session')));
        // Commit the transaction if all operations succeed
        // await session.commitTransaction();

        // res.status(200).json({ success: true, message: "Winnings distributed successfully!", data: bulkResponse[0][0] });
        return bulkResponse
    } catch (error) {
        // If any error occurs, abort the transaction
        // await session.abortTransaction();
        // res.status(500).json({ success: false, message: "Failed to distribute winnings", data: error });
    } finally {
        // End the session
        // session.endSession();
    }
}

module.exports = { handalePrizeDistribution };
