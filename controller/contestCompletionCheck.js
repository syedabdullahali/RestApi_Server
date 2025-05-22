const Contest = require("../model/contestModel");
const Category = require("../model/admin/category");
const { users } = require("../sockethelper/socketUsers");
const mongoose = require("mongoose");
const UserModel=require("../model/user/user")
const {
  categorizeContestsForLive,
  categorizeContestsForWinning,
  categorizeContestsForUpcoming,
} = require("../function/categoriesContest");
const userMainContestDetail=require("../model/admin/userContestDetailSchema");
const mainContestHistory=require("../model/contesthistory");
const Wallet=require("../model/walletSchema");
const TransactionHistory=require("../model/transactionhistory");
const SubCategory = require("../model/admin/subCategory");
const calculatePlayerRankingTest = require("../function/calculatePlayerRankingTest");

// const { createContestPipline } = require("../function/contestHelper");
// const contesthistory = require("../model/contesthistory");
// const calculatePlayerRanking = require("../function/calculatePlayerRanking");
// const calculatePlayerRankingTest = require("../function/calculatePlayerRankingTest");
// const contestModel = require("../model/contestModel");
// const timeSheduleSchema = require("../model/contestTimeSheduleList");
// const userContestDetailSchema = require("../model/admin/userContestDetailSchema");
// const privateContest = require("../model/privatecontest");
// const { sendSingleNotification } = require("../function/sendNotification");

const checkAndCompleteMainContests = async (io) => {

    try {
      const currentTime = new Date();

    //   const expiringContests = await Contest.aggregate([
    //       {
    //         $lookup:{
    //          from:"timesheduleschemas",
    //          localField:"_id",
    //          foreignField:"contestId",
    //          as:"timeSlots2"
    //         }
    //       },
    //     {
    //       $match: {
    //         "timeSlots2.endTime": currentTime, 
    //       },
    //     },
    //     {
    //       $project: {
    //         entryAmount: 1,
    //         slots: 1,
    //         upto: 1,
    //         totalAmount: 1,
    //         type: 1,
    //         typeCashBonus: 1,
    //         bonusCashPercentage: 1,
    //         bonusCashAmount: 1,
    //         subcategoryId: 1,
    //         platformFeePercentage: 1,
    //         platformFeeAmount: 1,
    //         prizeDistributionPercentage: 1,
    //         prizeDistributionAmount: 1,
    //         rankDistribution: 1,
    //         prizeDistribution: 1,
    //         rankCount: 1,
    //         rankPercentage: 1,
    //         startDateTime: 1,
    //         endDateTime: 1,
    //         isBotActive: 1,
    //         timeSlot: {
    //           $arrayElemAt: [
    //             {
    //               $filter: {
    //                 input: "$timeSlots2",
    //                 as: "timeSlot",
    //                 cond: { $lt: ["$$timeSlot.endTime", currentTime] },
    //               },
    //             },
    //             -1, 
    //           ],
    //         },
    //       },
    //     },
    //     {
    //       $lookup: {
    //         from: "sub-categories",
    //         localField: "subcategoryId",
    //         foreignField: "_id",
    //         as: "subcategory",
    //       },
    //     },
    //   ]);
  
    //   io.emit("event",expiringContests);
    const expiringContests = await Contest.aggregate([
        {
          $lookup: {
            from: "timesheduleschemas",
            localField: "_id",
            foreignField: "contestId",
            as: "timeSlots2"
          }
        },
        {
          $project: {
            entryAmount: 1,
            slots: 1,
            upto: 1,
            totalAmount: 1,
            type: 1,
            typeCashBonus: 1,
            bonusCashPercentage: 1,
            bonusCashAmount: 1,
            subcategoryId: 1,
            platformFeePercentage: 1,
            platformFeeAmount: 1,
            prizeDistributionPercentage: 1,
            prizeDistributionAmount: 1,
            rankDistribution: 1,
            prizeDistribution: 1,
            rankCount: 1,
            rankPercentage: 1,
            startDateTime: 1,
            endDateTime: 1,
            isBotActive: 1,
            timeSlot: {
              $arrayElemAt: [
                {
                  $filter: {
                    input: "$timeSlots2",
                    as: "timeSlot",
                    cond: { $lt: ["$$timeSlot.endTime", currentTime] }, // Filter time slots based on expired end time
                  },
                },
                -1, // Get the last time slot
              ],
            },
          },
        },
        {
            $match: {
              timeSlot: { $exists: true, $ne: null },
            },
          },
        {
          $lookup: {
            from: "sub-categories",
            localField: "subcategoryId",
            foreignField: "_id",
            as: "subcategory",
          },
        },
        {
            $lookup: {
              from: "contestHistory",
              localField: "_id",
              localField: "timeSlot._id",
              foreignField: "contestId",
              as: "contestHistory"
            }
          },
      ]);
      
    // console.log("expiringContests",expiringContests)


     expiringContests.forEach(async(contest) => {
      

  
        const contesthistory = await mainContestHistory
        .findOne({ contestId: contest._id, timeslotId: contest.timeSlot._id });


    
        // contesthistory.isComplete = true;

        // contesthistory.currentFill =currentFill
  
        await contesthistory.save();

        console.log(contesthistory.userranks)
        // await distributePrizes(contest);
        // console.log({
        //     contest: contest,
        //     finalRankings: finalRankings,
        //     topPercentUsers: topUsersByRank
        //   })
       
        // io.emit(`final-Contest-${contest._id}`, {
        //   contest: contest,
        //   finalRankings: finalRankings,
        //   topPercentUsers: topUsersByRank
        // });
      });
    } catch (error) {
      conaole.log(err)
      await session.abortTransaction();
      session.endSession();
      console.error("Error checking contests:", error);
    }
  };
  
  const distributePrizes = async (contest) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    // console.log("distribution start")
  
    try {
      const contestDoc = await mainContestHistory
        .findById({ contestId: contest._id, timeslotId: contest?.timeSlot?._id })
        .lean()
        .session(session);

        contestDoc.userranks

    //   const totalPrizePool = contestDoc.userranks.length * contest.entryAmount;
    //   const platformFeeAmount =
    //     totalPrizePool * (contest.platformFeePercentage / 100);
    //   // const resAmount=totalPrizePool-platformFeeAmount;
    //   // const topUsersByRank = contest.ranks.filter(rankGroup => rankGroup.rank <= uptoRank);
    //   // const totalRankedUsers = topUsersByRank.reduce((total, rankGroup) => total + rankGroup.users.length, 0);
    //   const {
    //     prizeDistributionPercentage,
    //     prizeDistributionAmount,
    //     rankDistribution
    //   } = contest;
    //   const { ranks } = contestDoc;
    //   const totalRanks = ranks.length;
    //   const prizeableRanksCount = Math.floor(
    //     (prizeDistributionPercentage / 100) * totalRanks
    //   );
    //   if (prizeableRanksCount === 0) {
    //     return "No ranks are eligible for prizes";
    //   }

    //   const prizeMap = rankDistribution.reduce((map, prize) => {
    //     const { rank, percentage } = prize;
      
    //     if (typeof rank === "number") {
    //       map[rank] = percentage;
    //     } else if (typeof rank === "string" && rank.includes("-")) {
    //       const [start, end] = rank.split("-").map(Number);
    //       for (let r = start; r <= end; r++) {
    //         map[r] = percentage;
    //       }
    //     }
    //     return map;
    //   }, {});
  
    //   const updatedRanks = ranks.map((rank) => {
    //     if (rank.rank <= prizeableRanksCount && prizeMap[rank.rank]) {
    //       const prizeAmountPercentage = prizeMap[rank.rank];
    //       const prizeAmount =
    //         (prizeAmountPercentage / 100) * prizeDistributionAmount;
  
    //       rank.users = rank.users.map(async (user) => {

    //         await userMainContestDetail
    //           .findOneAndUpdate(
    //             {
    //               userId: user.userId,
    //               contestId: contest._id,
    //               timeslotId:contest?.timeSlot?._id,
    //             },
    //             { $inc: { winningAmount: prizeAmount } },
    //             { new: true }
    //           )
    //           .session(session);


  
    //         const wallet = await Wallet.findOne({ user: user.userId }).session(
    //           session
    //         );
    //         wallet.winningbalance += prizeAmount;
    //         console.log("winningbalance ",prizeAmount)
    //         await wallet.save({ session });
    //         // sendSingleNotification(
    //         //   user.userId,
    //         //   `You have won ₹${prizeAmount}`, 
    //         //   `credit  ₹${prizeAmount} in your Winning Amount Wallet for winning Contest with rank ${rank.rank}`,
    //         // )
    //         const transaction = new TransactionHistory({
    //           user: user.userId,
    //           type: "credit",
    //           amount: prizeAmount,
    //           description: `credit  ₹${prizeAmount} in your Winning Amount Wallet for winning Contest with rank ${rank.rank}`,
    //         });
  
    //         await transaction.save({ session });
    //         return {
    //           ...user,
    //           winningAmount: prizeAmount,
    //         };
    //       });
    //     }
    //     return rank;
    //   });
  
      // for (const rankGroup of topUsersByRank) {
      //   const prizePerUser = resAmount / totalRankedUsers;
  
      //   for (const user of rankGroup.users) {
  
      //     await userMainContestDetail.findOneAndUpdate(
      //       { userId: user.userId, contestId: contest._id,timeslotId:contest.timeSlots },
      //       { $inc: { winningAmount: prizePerUser }},
      //       { new: true }
      //     ).session(session);
  
      //     const wallet = await Wallet.findOne({ user: user.userId }).session(session);
      //     wallet.winningbalance +=prizePerUser;
      //     await wallet.save({session});
      //     const transaction = new TransactionHistory({
      //       user: user.userId,
      //       type: "credit",
      //       amount: prizePerUser,
      //       description: `credit  ₹${prizePerUser} in your Winning Amount Wallet for winning Contest with rank ${rankGroup.rank}`,
      //     });
      //     await transaction.save({ session });
  
      //     const rankIndex = contestDoc.ranks.findIndex(r => r.rank === rankGroup.rank);
      //     const userIndex = contestDoc.ranks[rankIndex].users.findIndex(u => u.userId.toString() === user.userId.toString());
  
      //     if (rankIndex !== -1 && userIndex !== -1) {
      //       contestDoc.ranks[rankIndex].users[userIndex].winningAmount = prizePerUser;
      //     }
      //   }
      // }
  
      await mainContestHistory
        .findOne(
          { contestId: contest._id, timeslotId: contest.timeSlots._id },
          {
            $set: {
              companyProfit: platformFeeAmount,
              ranks: updatedRanks,
            },
          },
          { new: true }
        )
        .session(session);
      await session.commitTransaction();
      session.endSession();
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      console.error("Error distributing prizes and updating profits:", error);
    }
  };


  module.exports= {checkAndCompleteMainContests}