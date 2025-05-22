const express = require("express");
const router = express.Router();
const fillBotSlots = require("./botLogic");
const contestModel = require("../model/contestModel");
const userModel = require("../model/user/user");

const userContestDetailSchema = require("../model/admin/userContestDetailSchema");
const contesthistory = require("../model/contesthistory");
const calculatePlayerRanking = require('../function/calculatePlayerRanking')


const handaleBots = async () => {
  try{
  const currentDate = new Date();
  const response = await contestModel.aggregate([
    {
      $match:{
        isBotActive:true
      }
    },
      {
        $addFields: {
          state: {
            $cond: [
              { $lt: ["$endDateTime", currentDate] }, // Check if endDateTime < current date
              "wining",
              {
                $cond: [
                  { $and: [{ $lte: ["$startDateTime", currentDate] }, { $gte: ["$endDateTime", currentDate] }] },
                  "live", // If current date is between startDateTime and endDateTime
                  "upcoming" // Otherwise, it's upcoming
                ]
              }
            ]
          }
        }
      },
      {
        $match: {
            "state":"live"
        },
      }, 
      {
        $match:{
            subcategoryId: { $ne: null, $ne: false, $ne: "", $ne: 0, $ne: undefined }
        }
      },
      {
        $addFields:{
          currentTimeSlot: {
            $let: {
              vars: {
                currentSlot: {
                  $filter: {
                    input: "$timeSlots",
                    as: "slot",
                    cond: {
                      $and: [
                        { $lte: ["$$slot.startTime", new Date()] },
                        { $gt: ["$$slot.endTime", new Date()] }
                      ]
                    }
                  }
                }
              },
              in: {
                $cond: {
                  if: { $gt: [{ $size: "$$currentSlot" }, 0] },
                  then: { $arrayElemAt: ["$$currentSlot", 0] }, // Return first current slot as an object
                  else: { $arrayElemAt: ["$timeSlots", -1] } // Last slot if no current slot
                }
              }
            }
          }   
        }
      }
   
    ,{
      $project: {
        _id: 1,
        state: 1,
        slots: 1,
        upto: 1,
        totalAmount: 1,
        type: 1,
        isBotActive: 1,
        typeCashBonus: 1,
        bonusCashPercentage: 1,
        bonusCashAmount: 1,
        subcategoryId: 1,
        platformFeeAmount: 1,
        prizeDistributionPercentage: 1,
        prizeDistributionAmount: 1,
        rankDistribution: 1,
        prizeDistribution: 1,
        rankCount: 1,
        subcategoryDetails: 1,
        rankPercentage: 1,
        currentTimeSlot: 1,
        platformFeePercentage:1,
        entryAmount:1,
        bidRange:1,
        contestCount: {
          $filter: {
            input: "$contestCount",
            as: "contest",
            cond: { $eq: ["$$contest.timeslotId", "$currentTimeSlot._id"] }, // Filter based on timeSlots ID
          },
        },
      },
    },
    {
      $lookup: {
        from: "contesthistories",
        let: {
          contestId: "$_id",
          timeslotId: "$currentTimeSlot._id",
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$contestId", "$$contestId"] },
                  { $eq: ["$timeslotId", "$$timeslotId"] },
                ],
              },
            },
          },
        ],
        as: "contesthistories",
      },
    },
    { $unwind: "$contesthistories" },

       {
      $lookup: {
        from: "users", // The collection where user details are stored
        localField: "contesthistories.slotsFill", // Field containing the array of user IDs
        foreignField: "_id", // The field in the users collection that matches the IDs
        as: "joinUserDetails", // Output array with populated user details
      },
    },
    {
      $addFields: {
        userTypeCounts: {
          $reduce: {
            input: "$joinUserDetails",
            initialValue: { userCount: 0, botCount: 0 },
            in: {
              userCount: {
                $cond: [
                  {
                    $or: [
                      { $eq: ["$$this.type", "user"] },
                      { $not: ["$$this.type"] },
                    ],
                  },
                  { $add: ["$$value.userCount", 1] },
                  "$$value.userCount",
                ],
              },
              botCount: {
                $cond: [
                  { $eq: ["$$this.type", "bot"] },
                  { $add: ["$$value.botCount", 1] },
                  "$$value.botCount",
                ],
              },
            },
          },
        },
      },
    },
    {
      $addFields: {
        minutesBetween: {
          $let: {
            vars: {
              startTime: "$currentTimeSlot.startTime",
              endTime: "$currentTimeSlot.endTime",
            },
            in: {
              $divide: [
                { $subtract: ["$$endTime", "$$startTime"] }, // Difference in milliseconds
                1000 * 60, // Convert milliseconds to minutes
              ],
            },
          },
        },
      },
    },
  ]);

  const generateUniqueBidsSync = (bidRange, bidCount, startDate) => {
    const bids = new Set();
    const bidData = [];
    const dateObj = new Date(startDate);

     bidCount = Math.round(Math.random() * (bidCount * 0.3)) + Math.round(bidCount * 0.7)
  
    while (bids.size < bidCount) {
      const bid = Math.round(Math.random() * (bidRange * 0.4)) + Math.round(bidRange * 0.6); // Generate bid inside the loop
      if (!bids.has(bid)) {
        bids.add(bid);
        dateObj.setSeconds(dateObj.getSeconds() + 25); // Increment time
        bidData.push({
          Amount: bid,
          bidTimeDate: new Date(dateObj),
        });
      }
    }
  
    return bidData;
  };
  

  const arr = await Promise.all(
    response.map(async (el) => {
      try {
        const result = await fillBotSlots(el);  // Call to your async function
        return result;
      } catch (error) {
        console.error("Error processing element:", el, error);  // Handle errors for each element
        throw error;  // Optionally throw the error to be handled outside
      }
    })
  );


  const consolidatedResults = arr.reduce((acc, el) => {
    const dateObj = new Date();
  
    el.bots.forEach((el2) => {
      const key = `${el.contestId}-${el2.userInfo._id}-${el.timeSlotId}`;
  
      if (!acc[key]) {
        acc[key] = {
          contestId: el.contestId,
          contestHsitoryId: el.contestHsitoryId,
          userId: el2.userInfo._id,
          timeslotId: el.timeSlotId,
          botSession: el.botSession,
          rankDistribution: el.rankDistribution,
          prizeDistribution: el.prizeDistribution,
          slotsFill: el.slotsFill,
          rankPercentage: el.rankPercentage,
          platformFeePercentage: el.platformFeePercentage,
          prizeDistributionAmount: el.prizeDistributionAmount,
          entryAmount: el.entryAmount,
          winningAmount: 0,
          bids: [],
          totalAmount: 0,
        };
      }
  
      dateObj.setSeconds(dateObj.getSeconds() + 25);
  
      // Add the current bot's bid
      acc[key].bids.push({
        Amount: el2.bidinfo.bid || 0,
        bidTimeDate: new Date(dateObj),
      });
  
      // Generate unique bids synchronously
      const bidList = generateUniqueBidsSync(el.bidRange, el.upToBids - 1, new Date(dateObj));
      acc[key].bids.push(...bidList.slice(0,el.upToBids-1));
  
      // Update total amount
      acc[key].totalAmount += el2.bidinfo.bid || 0;
      bidList.slice(0,el.upToBids-1).forEach((bid) => {
        acc[key].totalAmount += bid.Amount;
      });
    });
  
    return acc;
  }, {});
  
  const finalResults = Object.values(consolidatedResults);


  let groupedData = finalResults.reduce((acc, item) => {
    // Create a unique key based on `contestId` and `timeslotId`
    const key = `${item.contestId}-${item.timeslotId}-${item.contestHsitoryId}`;

    // Check if the group already exists
    if (!acc[key]) {
      // Initialize if not present
      acc[key] = {
        botBidList: [{
          contestId: item.contestId,
          contestHsitoryId: item.contestHsitoryId,
          userId: item.userId,
          timeslotId: item.timeslotId,
          botSession: item.botSession,
          winningAmount: 0,
          bids: item.bids,
          totalAmount: 0,
        }],
        prizeDistribution: item.prizeDistribution,
        rankDistribution:item.rankDistribution,
        botSession:item.botSession,
        slotsFill:item.slotsFill,
        rankPercentage:item.rankPercentage,
        platformFeePercentage:item.platformFeePercentage,
        entryAmount:item.entryAmount,
        prizeDistributionAmount:item.prizeDistributionAmount
      };
    }

    // Accumulate bids and totalAmount
    // console.log(item)
    acc[key].botBidList.push(
      {
        contestId: item.contestId,
        contestHsitoryId: item.contestHsitoryId,
        userId: item.userId,
        timeslotId: item.timeslotId,
        botSession: item.botSession,
        winningAmount: 0,
        bids: item.bids,
        totalAmount: 0,
      }
    );
    return acc;
  }, {});

  const handleBotsRank = async () => {
    const entries = Object.entries(groupedData);
  
    // Process all entries in parallel
    const actions = entries.map(async ([key, value]) => {
      const [contestId, timeSlotId, contestHistoryId] = key.split("-");
      const botBiddingList = value.botBidList || [];
  
      if (botBiddingList.length > 0) {
        // Insert all bot bids at once
        await userContestDetailSchema.insertMany(botBiddingList);
      }
  
      // Extract required data in a single iteration
      const userIds = botBiddingList.map((el) => el.userId);
      const totalAmount = botBiddingList.reduce(
        (sum, bid) => sum + (bid.totalAmount || 0),
        0
      );
  
      // Calculate user rankings
      const [rankings, currentFill] = await calculatePlayerRanking(
        contestId,
        timeSlotId,
        value?.prizeDistribution,
        value?.rankDistribution,
        {
          slotsFill:(value.slotsFill + userIds.length)-1,
          rankPercentage:value.rankPercentage,
          platformFeePercentage:value.platformFeePercentage,
          entryAmount:value.entryAmount,
          prizeDistributionAmount:value.prizeDistributionAmount
        }
      );
  
      // Prepare the update data
      const updateData = {
        $set: {
          ranks: rankings,
          botSession: value.botSession,
          currentFill,
        },
        $addToSet: { slotsFill: { $each: userIds } }, 
        $inc: { totalbidsAmount: totalAmount },
      };
  
      // Update contest history
      return contesthistory.findByIdAndUpdate(contestHistoryId, updateData, {
        new: true,
      });
    });
  
    // Execute all actions concurrently
    await Promise.all(actions);
  
    // Clear groupedData after processing
    groupedData = [];
  };
  
  const botResponse = await handleBotsRank();
  return botResponse

}catch(error){
throw{error:error}
}
};
module.exports = { handaleBots };