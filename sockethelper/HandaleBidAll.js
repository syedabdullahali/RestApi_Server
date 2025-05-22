const contestModel = require("../model/contestModel");
const {Types } = require("mongoose");

const getAllAppData =  async (userId)=>{
  try{

  const userIdConverted = new Types.ObjectId('67dd0c1a62cf626588da27c9'); // Convert userId to ObjectId

  const today = new Date();

  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 1); // 1 day before today (18th)

  const endDate = new Date(today);
  endDate.setDate(today.getDate() + 1); // 1 day after today (20th)

  
    const currentTime = new Date();
    const response = contestModel.aggregate([
      {
        $lookup: {
          from: "sub-categories",
          localField: "subcategoryId",
          foreignField: "_id",
          as: "subcategoryDetails",
        },
      }, // lookup into sub-categories schema is there collection that hold id of current doc
      {
        $unwind: {
          path: "$subcategoryDetails",
        },
      }, // unwind accrodengly to group them in futcher
      {
        $addFields: {
          currentTime: currentTime,
        },
      },
      {
        $lookup: {
          from: "timesheduleschemas",
          let: { contestId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$contestId", "$$contestId"] }, // Matching contestId
                    { $gte: ["$startTime", startDate] }, // Start time >= 18th
                    { $lte: ["$startTime", endDate] }, // Start time <= 20th
                  ],
                },
              },
            },
          ],
          as: "timeSlots2",
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
                  input: "$timeSlots2", // Iterate over each timeSlot
                  as: "slot",
                  in: {
                    $cond: {
                      if: {
                        $and: [
                          { $lte: ["$$slot.startTime", "$currentTime"] }, // Check if the start time is before or equal to current time
                          { $gte: ["$$slot.endTime", "$currentTime"] }, // Check if the end time is after or equal to current time
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
      { $unwind: "$contestStatus" },
      {
        $match: {
          subcategoryId: {
            $ne: null,
            $ne: false,
            $ne: "",
            $ne: 0,
            $ne: undefined,
          },
        },
      },
      {
        $project: {
          isUserBookMarked: 1,
          isNotificationActive: 1,
          _id: 1,
          entryAmount: 1,
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
          favorite: 1,
          contestStatus:1,
          timeSlots: {
            $let: {
              vars: {
                currentSlot: {
                  $filter: {
                    input: "$timeSlots2",
                    as: "slot",
                    cond: {
                      $and: [
                        { $lte: ["$$slot.startTime", new Date()] },
                        { $gt: ["$$slot.endTime", new Date()] },
                      ],
                    },
                  },
                },
                expiredSlots: {
                  $filter: {
                    input: "$timeSlots2",
                    as: "slot",
                    cond: { $lt: ["$$slot.endTime", new Date()] },
                  },
                },
                upcomingSlots: {
                  $filter: {
                    input: "$timeSlots2",
                    as: "slot",
                    cond: { $gt: ["$$slot.startTime", new Date()] },
                  },
                },
              },
              in: {
                $switch: {
                  branches: [
                    {
                      case: { $eq: ["$contestStatus", "wining"] },
                      then: "$$expiredSlots", // All expired slots (completed contests)
                    },
                    {
                      case: { $eq: ["$contestStatus", "live"] },
                      then: {
                        $cond: {
                          if: { $gt: [{ $size: "$$currentSlot" }, 0] }, // If there is a live slot
                          then: [{ $arrayElemAt: ["$$currentSlot", 0] }], // Return only one live slot
                          else: [], // No live slot found
                        },
                      },
                    },
                    {
                      case: { $eq: ["$contestStatus", "upcoming"] },
                      then: "$$upcomingSlots", // All upcoming slots
                    },
                  ],
                  default: [], // If contestStatus doesn't match, return an empty array
                },
              },
            },
          },
        },
      },
      { $unwind: "$timeSlots" },
      // {$limit:15},
      {
        $lookup: {
          from: "contesthistories",
          localField: "_id",
          foreignField: "contestId",
          as: "contestCount",
        },
      },
      {
        $lookup: {
          from: "users", // Collection name for UserModel
          let: { contestId: "$_id" }, // Pass the contest ID to the sub-pipeline
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $in: [
                        "$$contestId",
                        {
                          $map: {
                            input: "$contestnotify", // Iterate through the contestnotify array
                            as: "notify",
                            in: "$$notify.contestId", // Extract contestId from each notify object
                          },
                        },
                      ],
                    },
                    // Uncomment the below line to filter by userId if required
                    { $eq: ["$_id", new Types.ObjectId(userId)] },
                  ],
                },
              },
            },
          ],
          as: "userData", // Store the result of the lookup in this field
        },
      },
    
      {
        $lookup: {
          from: "users", // Collection name for UserModel
          let: { contestId: "$_id" }, // Pass the contest ID to the sub-pipeline
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $in: [
                        "$$contestId",
                        {
                          $map: {
                            input: "$contestNotification", // Iterate through the contestnotify array
                            as: "notify",
                            in: "$$notify.contestId", // Extract contestId from each notify object
                          },
                        },
                      ],
                    },
                    // Uncomment the below line to filter by userId if required
                    { $eq: ["$_id", new Types.ObjectId(userId)] },
                  ],
                },
              },
            },
          ],
          as: "userData2", // Store the result of the lookup in this field
        },
      },
      {
        $addFields: {
          isNotificationActive: {
            $in: [
              {
                contestId: "$_id",
                subcategoryId: "$subcategoryId",
                timeSlotId: "$timeSlots._id",
              },
              {
                $map: {
                  input: {
                    $ifNull: [
                      { $arrayElemAt: ["$userData2.contestNotification", 0] },
                      [],
                    ],
                  },
                  as: "notify",
                  in: {
                    contestId: "$$notify.contestId",
                    subcategoryId: "$$notify.subcategoryId",
                    timeSlotId: "$$notify.timeSlotId",
                  },
                },
              },
            ],
          },
        },
      },
      
      {
        $project: {
          _id: 1,
          entryAmount: 1,
          isUserBookMarked: 1,
          isNotificationActive: 1,
          isBotActive: 1,
          contestStatus:1,
          state: 1,
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
          timeSlots: 1,
          subcategoryDetails: 1,
          startDateTime: 1,
          endDateTime: 1,
          favorite: 1,
          contestCount: {
            $filter: {
              input: "$contestCount",
              as: "contest",
              cond: { $eq: ["$$contest.timeslotId", "$timeSlots._id"] }, // Filter based on timeSlots ID
            },
          },
        },
      },
      {
        $addFields: {
          slotsContestFillInfo: {
            $map: {
              input: {
                $filter: {
                  input: "$contestCount",
                  as: "contest",
                  cond: { $eq: ["$$contest.timeslotId", "$timeSlots._id"] },
                },
              },
              as: "contest",
              in: {
                slotsFillCount: { $size: "$$contest.userranks" }, // Count of slotsFill array
                // bids will count in slot fill
              },
            },
          },
        },
      },

   
      {
        $addFields: {
          currentFillInfo: {
            $map: {
              input: {
                $filter: {
                  input: "$contestCount",
                  as: "contest",
                  cond: { $eq: ["$$contest.timeslotId", "$timeSlots._id"] },
                },
              },
              as: "contest",
              in: "$$contest.currentFill",
            },
          },
        },
      },
      {
        $addFields: {
          favoriteCount: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: "$contestCount",
                    as: "contest",
                    cond: {
                      $and: [
                        { $eq: ["$$contest.timeslotId", "$timeSlots._id"] },
                        { $eq: ["$$contest.contestId", "$_id"] }
                      ],
                    },
                  },
                },
                as: "contest",
                in: { $size: { $ifNull: ["$$contest.favorite", []] } },
              },
            },
          },
        },
      },

      {
        "$addFields": {
          "isFavorite": {
            "$gt": [
              {
                "$size": {
                  "$filter": {
                    "input": {
                      "$map": {
                        "input": {
                          "$filter": {
                            "input": "$contestCount",
                            "as": "contest",
                            "cond": {
                              "$and": [
                                { "$eq": ["$$contest.timeslotId", "$timeSlots._id"] },
                                { "$eq": ["$$contest.contestId", "$_id"] }
                              ]
                            }
                          }
                        },
                        "as": "contest",
                        "in": {
                          "$filter": {
                            "input": { "$ifNull": ["$$contest.favorite", []] },
                            "as": "favUser",
                            "cond": { "$eq": ["$$favUser",userIdConverted] }
                          }
                        }
                      }
                    },
                    "as": "favList",
                    "cond": { "$gt": [{ "$size": "$$favList" }, 0] }
                  }
                }
              },
              0
            ]
          }
        }
      },   
    //   "contestStatus": "wining",
    {
        $addFields: {
          sortTime: {
            $cond: [
              { $eq: ["$contestStatus", "Upcoming"] },
              { $toLong: "$timeSlots.endTime" },
              { $multiply: [{ $toLong: "$timeSlots.endTime" }, -1] }
            ]
          }
        }
      },
      {
        $sort: {
          sortTime: 1
        }
      },
      {
        $lookup: {
          from: "categories",
          localField: "subcategoryDetails.auctioncategory",
          foreignField: "_id",
          as: "auctioncategory",
        },
      },
      { $unwind: "$auctioncategory" },
      {
        $group: {
              _id: {
                subcategoryId: "$subcategoryDetails._id",
                contestStatus: "$contestStatus",
                auctioncategory:"$auctioncategory._id"
              },
              category: { $first: "$auctioncategory" },
              subcategoryDetails: { $first: "$subcategoryDetails" },
              contests: {
                $push: {
                  _id: "$_id",  // Contest ID
                  entryAmount: "$entryAmount",
                  contestStatus:"$contestStatus",
                  state: "$state",
                  isBotActive: "$isBotActive",
                  slots: "$slots",
                  isFavorite: "$isFavorite",
                  isNotificationActive: "$isNotificationActive",
                  upto: "$upto",
                  totalAmount: "$totalAmount",
                  type: "$type",
                  typeCashBonus: "$typeCashBonus",
                  bonusCashPercentage: "$bonusCashPercentage",
                  bonusCashAmount: "$bonusCashAmount",
                  favoriteCount: "$favoriteCount",
                  platformFeePercentage: "$platformFeePercentage",
                  platformFeeAmount: "$platformFeeAmount",
                  prizeDistributionPercentage: "$prizeDistributionPercentage",
                  prizeDistributionAmount: "$prizeDistributionAmount",
                  rankDistribution: "$rankDistribution",
                  prizeDistribution: "$prizeDistribution",
                  rankCount: "$rankCount",
                  rankPercentage: "$rankPercentage",
                  startDateTime: "$startDateTime",
                  endDateTime: "$endDateTime",
                  slotsContestFillInfo: { $arrayElemAt: ["$slotsContestFillInfo", 0] },
                  timeSlots: "$timeSlots",
                  isUserJoinContest: "$isUserJoinContest",
                  currentFillInfo: { $arrayElemAt: ["$currentFillInfo", 0] },
                },
              },
        },
     },
    {
      $set: {
        contests: {
                $slice: ["$contests", 5], // Limit to 5 contests per unique `_id`
          },
        },
    },
    ]);

    return response;
  } catch (error) {
    console.error(error);
    throw error;
  }
};
  

module.exports = {getAllAppData}