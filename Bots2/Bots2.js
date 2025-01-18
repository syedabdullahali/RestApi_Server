const contestModel = require("../model/contestModel");
const { handaleBotBidRangeCalc } = require("./botLogic");
const handaleBotsBiddingRange = async () => {
  try {
    const currentDate = new Date();
    const response = await contestModel.aggregate([
      {
        $match: {
            bot2isActive:true,
        },
      },
      {
        $project: {
          _id: 1,
          entryAmount: 1,
          state: 1,
          slots: 1,
          upto: 1,
          bidRange:1,
          totalAmount: 1,
          type: 1,
          bonusCashPercentage: 1,
          bonusCashAmount: 1,
          platformFeePercentage: 1,
          platformFeeAmount: 1,
          prizeDistributionPercentage: 1,
          prizeDistributionAmount: 1,
          rankDistribution: 1,
          prizeDistribution: 1,
          rankCount: 1,
          subcategoryDetails: 1,
          startDateTime: 1,
          endDateTime: 1,
          rankPercentage: 1,
          timeSlots:1
        }
      },
      {$unwind:"$timeSlots"},
      {
        $lookup: {
            from: "contesthistories",
            let: { contestId: "$_id", timeSlotId: "$timeSlotId" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$contestId", "$$contestId"] },
                      { $eq: ["$timeSlotId", "$$timeSlotId"] },
                      { $eq: ["$bot2isActive", true] }
                    ]
                  }
                }
              }
            ],
            as: "contesthistory",
          }
      },
      {$unwind:"$contesthistory"},
        {
          $project: {
            _id: 1,
            slots: 1,
            upto: 1,
            bidRange:1,
            typeCashBonus: 1,
            bonusCashPercentage: 1,
            bonusCashAmount: 1,
            platformFeePercentage: 1,
            platformFeeAmount: 1,
            prizeDistributionPercentage: 1,
            prizeDistributionAmount: 1,
            rankDistribution: 1,
            prizeDistribution: 1,
            rankPercentage: 1,
            contesthistory:"$contesthistory._id",
            timeSlots:1,
            entryAmount:1
          },
        },
        {
            $addFields: {
              state: {
                $cond: [
                  { $lt: ["$timeSlots.endTime", currentDate] }, // Check if endDateTime < current date
                  "wining",
                  {
                    $cond: [
                      {
                        $and: [
                          { $lte: ["$timeSlots.startTime", currentDate] },
                          { $gte: ["$timeSlots.endTime", currentDate] },
                        ],
                      },
                      "live", // If current date is between startDateTime and endDateTime
                      "upcoming", // Otherwise, it's upcoming
                    ],
                  },
                ],
              },
            },
          },
          {
            $match:{state:"wining"}
          }
    ]);

    const handalebalanceBid = async (response)=>{
    for (const el of response) {
        try {
          await handaleBotBidRangeCalc(
            el._id,
            el.timeSlots?._id,
            el?.prizeDistribution,
            el?.rankDistribution,
            {
              rankPercentage: el.rankPercentage,
              platformFeePercentage: el.platformFeePercentage,
              entryAmount: el.entryAmount,
              prizeDistributionAmount: el.prizeDistributionAmount,
            },
            el.contesthistory,
            el.upto,
            el.bidRange
          );
        } catch (error) {
          console.error(`Error handling bot bid range for contestId ${el._id}:`, error);
        }
      }
    }

    return handalebalanceBid(response)

  } catch (error) {
    console.error(error);
    
    throw error;
  }
};

module.exports = { handaleBotsBiddingRange };


// With User  after contest
// First we fill  the gap of top winnings range 
// On particular range we arrange 60 to 100% 
// (only for sequence bid ) equal to 30% or greater then  of bids limit. Duplicate with bids.

// Without User after contest
// On particular range we arrange 60 to 100% upper limit   is fix 
// And other can be 1-20  60-70  80-90   
