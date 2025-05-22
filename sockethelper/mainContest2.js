const contestModel = require("../model/contestModel");
const {Types } = require("mongoose");


const getMainCategoryData = async (filterObj,userId) => {
  try {
    const currentTime = new Date();
    
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 1); // 1 day before today (18th)
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 1); // 1 day after today (20th)


    const convertedUserId =  new Types.ObjectId(userId)

    const playerStatusResponse = await contestModel.aggregate([
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
      // {
      //   $lookup: {
      //     from: "timesheduleschemas",
      //     localField: "_id",
      //     foreignField: "contestId",
      //     as: "timeSlots2",
      //   },
      // },
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
          localField: "timeSlots._id",
          foreignField: "timeslotId",
          as: "contestCount",
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
                // slotsFillCount: { $size: "$$contest.slotsFill" }, // Count of slotsFill array
                userExists: {
                  $cond: {
                    if: { $in: [convertedUserId, "$$contest.slotsFill"] },
                    then: 1,
                    else: 0,
                  },
                },
              },
            },
          },
        },
      },
      {
        $addFields: {
          faverateCount: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: "$contestCount",
                    as: "contest",
                    cond: { $eq: ["$$contest.timeslotId", "$timeSlots._id"] }
                  }
                },
                as: "contest",
                in: {
                  $cond: {
                    if: { $in: [convertedUserId, "$$contest.favorite"] },
                    then: 1,
                    else: 0
                  }
                }
              }
            }
          }
        }
      },
      { $unwind: "$contestCount" },
      // {
      //   $addFields: {
      //     totalWinningAmount: {
      //       $reduce: {
      //         input: "$contestCount.userranks",
      //         initialValue: 0,
      //         in: { $add: ["$$value", "$$this.WinningAmount"] }
      //       }
      //     }
      //   }
      // },
      {
        $addFields: {
          totalUserWinningAmount: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: { $ifNull: ["$contestCount.userranks", []] }, // Avoid null errors
                    as: "rank",
                    cond: {
                      $eq: ["$$rank.userId",convertedUserId]
                    }
                  }
                },
                as: "userRank",
                in: "$$userRank.WinningAmount"
              }
            }
          }
        }
      },
      {
        $sort: { startDateTime: -1 } // Sort by latest contests
      },
      
      {
        "$group": {
          "_id": "$subcategoryDetails._id",
          "categoryId": { "$first": "$subcategoryDetails.auctioncategory" },
          "contests": {
            "$push": {
              "slotsContestFillInfo": { "$arrayElemAt": ["$slotsContestFillInfo", 0] },
              "faverateCount": "$faverateCount",
              "totalUserWinningAmount": "$totalUserWinningAmount",
              "timeSlots": "$timeSlots",
              "contestStatus": "$contestStatus",
              "prizeDistributionPercentage":"$prizeDistributionPercentage",
              "prizeDistributionAmount":"$prizeDistributionAmount"
            }
          },
        }
      },
      {
        "$project": {
          "_id": "$_id",
          "category": "$categoryId",
          "upcoming": {
            "$slice": [
              {
                "$sortArray": {
                  "input": {
                    "$filter": {
                      "input": "$contests",
                      "as": "contest",
                      "cond": { "$eq": ["$$contest.contestStatus", "upcoming"] }
                    }
                  },
                  "sortBy": { "timeSlots.endTime": 1 }
                }
              },
              5
            ]
          },
          "live": {
            "$filter": {
              "input": "$contests",
              "as": "contest",
              "cond": { "$eq": ["$$contest.contestStatus", "live"] }
            }
          },
          "winning": {
            // "$slice": [
            //   {
                "$sortArray": {
                  "input": {
                    "$filter": {
                      "input": "$contests",
                      "as": "contest",
                      "cond": { "$eq": ["$$contest.contestStatus", "wining"] }
                    }
                  },
                  "sortBy": { "timeSlots.endTime": -1 }
                }
              // },
              // 5
            // ]
          },
        }
      },
      // prizeDistributionPercentage: 1,
      // prizeDistributionAmount: 1,
      {
        $group: {
          _id: "$category",
          selectedContest: {
            $sum: {
              $reduce: {
                input: "$upcoming",
                initialValue: 0,
                in: { $add: ["$$value", "$$this.faverateCount"] } // Summing specific field inside array
              }
            }
          },
          megaupcomingCount: {
            $sum: {
              $reduce: {
                input: "$upcoming", // array of objects
                initialValue: 0,
                in: { $add: ["$$value", "$$this.prizeDistributionAmount"] }
              }
            }
          },
          megaliveCount: {
            $sum: {
              $reduce: {
                input: "$upcoming", // array of objects
                initialValue: 0,
                in: { $add: ["$$value", "$$this.prizeDistributionAmount"] }
              }
            }
          },
          playingContest: {
            $sum: {
              $reduce: {
                input: "$live",
                initialValue: 0,
                in: { $add: ["$$value", "$$this.slotsContestFillInfo.userExists"] } // Summing specific field inside array
              }
            }
          },
          playedContest: {
            $sum: {
              $reduce: {
                input: "$winning",
                initialValue: 0,
                in: { $add: ["$$value", "$$this.slotsContestFillInfo.userExists"] } // Summing specific field inside array
              }
            }
          },
          contestWinning: {
              $sum: {
                $reduce: {
                  input: "$winning",
                  initialValue: 0,
                  in: { $add: ["$$value", "$$this.totalUserWinningAmount"] } // Summing specific field inside array
                }
            }
          }
        }
      },
       {
        $project:{
          _id:"$_id",
          upcoming:{
            selectedContest:"$selectedContest",  
            megaupcomingCount:"$megaupcomingCount"
          },
          live:{
            playingContest:"$playingContest" ,
            megaliveCount:"$megaliveCount"
          },
          wining:{
            playedContest:"$playedContest",
            contestWinning:"$contestWinning"
          }
        }
       }
    //   {
    //     "slotsContestFillInfo": {
    //         "userExists": 0
    //     },
    //     "faverateCount": 0,
    //     "totalUserWinningAmount": 0,
    //     "timeSlots": {
    //         "_id": "67e3a02d6612ed6534f6ebb4",
    //         "startTime": "2025-03-26T09:44:00.000Z",
    //         "endTime": "2025-03-26T09:46:00.000Z",
    //         "status": "active",
    //         "contestId": "67e39fe46612ed6534f6e416",
    //         "__v": 0,
    //         "createdAt": "2025-03-26T06:35:25.826Z",
    //         "updatedAt": "2025-03-26T06:35:25.826Z"
    //     },
    //     "contestStatus": "upcoming"
    // },
  //     {
  //   $group: {
  //     _id: "$category",
  //     totalUpcoming: { $sum: { $size: "$upcoming" } }, 
  //     totalLive: { $sum: { $size: "$live" } },
  //     totalWinning: { $sum: { $size: "$winning" } },
  //     winningDetails: {
  //       $push: {
  //         totalPrize: { $sum: "$winning.totalPrize" },
  //         totalUsers: { $sum: "$winning.totalUsers" }
  //       }
  //     }
  //   }
  // },
      // {
      //   $group: {
      //     _id: "$subcategoryDetails._id", // Group by subcategory ID
      //     category: { $first: "$subcategoryDetails.auctioncategory" },
      //     contests: {
      //       $push: {
      //         slotsContestFillInfo: { $arrayElemAt: ["$slotsContestFillInfo", 0] },
      //         faverateCount: "$faverateCount",
      //         totalUserWinningAmount: "$totalUserWinningAmount",
      //         timeSlots: "$timeSlots",
      //         auctioncategory: "$subcategoryDetails.auctioncategory",
      //         contestStatus: "$contestStatus"
      //       }
      //     }
      //   }
      // },
      // {
      //   $project: {
      //     _id: 1,
      //     upcoming: {
      //       $slice: [
      //         {
      //           $sortArray: {
      //             input: {
      //               $filter: {
      //                 input: "$contests",
      //                 as: "contest",
      //                 cond: { $eq: ["$$contest.contestStatus", "upcoming"] }
      //               }
      //             },
      //             sortBy: { "timeSlots.endTime": -1 } // Sort latest first based on contestDate
      //           }
      //         },
      //         5
      //       ]
      //     },
      //     live: {
      //       $filter: {
      //         input: "$contests",
      //         as: "contest",
      //         cond: { $eq: ["$$contest.contestStatus", "live"] }
      //       }
      //     },
      //     winning: {
      //       $slice: [
      //         {
      //           $sortArray: {
      //             input: {
      //               $filter: {
      //                 input: "$contests",
      //                 as: "contest",
      //                 cond: { $eq: ["$$contest.contestStatus", "wining"] }
      //               }
      //             },
      //             sortBy: { "timeSlots.endTime": -1 }
      //           }
      //         },
      //        5
      //       ]
      //     }
      //   }
      // }
   
    ])



    const response = await contestModel.aggregate([
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
        $group: {
          _id: "$subcategoryId",
          contests: { $push: "$$ROOT" }, // Collect all fields of each contest into an array
        },
      },
      {
        $lookup: {
          from: "sub-categories",
          localField: "_id",
          foreignField: "_id",
          as: "subCategoryDetails",
        },
      },
      {
        $unwind: {
          path: "$subCategoryDetails",
          preserveNullAndEmptyArrays: true, // Keeps results even if subCategoryDetails not found
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "subCategoryDetails.auctioncategory",
          foreignField: "_id",
          as: "auctionCategoryDetails",
        },
      },
      {
        $unwind: {
          path: "$auctionCategoryDetails",
          preserveNullAndEmptyArrays: true, // Keeps results even if auctionCategoryDetails not found
        },
      },
      {
        $unwind: {
          path: "$contests",
          preserveNullAndEmptyArrays: true, // Keeps results even if contests array is empty
        },
      },
      {
        $project: {
          auctionCategoryDetails: 1,
          contests: 1,
          timeSlots: {
            $let: {
              vars: {
                currentSlot: {
                  $filter: {
                    input: "$contests.timeSlots2",
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
                    input: "$contests.timeSlots2",
                    as: "slot",
                    cond: { $lt: ["$$slot.endTime", new Date()] },
                  },
                },
                upcomingSlots: {
                  $filter: {
                    input: "$contests.timeSlots2",
                    as: "slot",
                    cond: { $gt: ["$$slot.startTime", new Date()] },
                  },
                },
              },
              in: {
                $cond: {
                  if: { $eq: ["$contestStatus", "wining"] }, // Check if contestStatus is "wining"
                  then: {
                    $cond: {
                      if: { $gt: [{ $size: "$$expiredSlots" }, 0] }, // If expired slots exist
                      then: {
                        $arrayElemAt: [
                          "$$expiredSlots",
                          { $subtract: [{ $size: "$$expiredSlots" }, 1] },
                        ],
                      }, // Return the last expired slot
                      else: null, // No expired slots found
                    },
                  },
                  else: {
                    $cond: {
                      if: { $eq: ["$contestStatus", "upcoming"] }, // Check if contestStatus is "upcoming"
                      then: {
                        $cond: {
                          if: { $gt: [{ $size: "$$upcomingSlots" }, 0] }, // If upcoming slots exist
                          then: { $arrayElemAt: ["$$upcomingSlots", 0] }, // Return the first upcoming slot
                          else: null, // No upcoming slots found
                        },
                      },
                      else: {
                        $cond: {
                          if: { $gt: [{ $size: "$$currentSlot" }, 0] }, // If there's a current slot
                          then: { $arrayElemAt: ["$$currentSlot", 0] }, // Return the current slot
                          else: {
                            $cond: {
                              if: {
                                $gt: [{ $size: "$contests.timeSlots2" }, 0],
                              }, // If contests.timeSlots2 is not empty
                              then: {
                                $arrayElemAt: [
                                  "$contests.timeSlots2",
                                  {
                                    $subtract: [
                                      { $size: "$contests.timeSlots2" },
                                      1,
                                    ],
                                  },
                                ],
                              }, // Return the last slot
                              else: null, // No slots exist
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      {
        $lookup: {
          from: "contesthistories",
          localField: "contests._id",
          foreignField: "contestId",
          as: "contestCount",
        },
      },
      {
        $group: {
          _id: "$auctionCategoryDetails._id", // Grouping by auction category ID
          auctionCategory: { $first: "$auctionCategoryDetails" }, // Get the auction category details
          megaCount: {
            $sum: "$contests.prizeDistributionAmount", // Summing up the prizeDistributionAmount for each contest in the group
          },
          contests: {
            $push: {
              state: "$contests.contestStatus", // Include the state field
              endDate: "$contests.endDateTime", // Include the end date field
              startDate: "$contests.startDateTime",
              prizeDistributionAmount: "$contests.prizeDistributionAmount",
              timeSlots: "$timeSlots", // Include the start date field
              firstContest: {
                $arrayElemAt: [
                  {
                    $filter: {
                      input: "$contestCount", // Input array: contestCount
                      as: "contest", // Alias for each item in contestCount
                      cond: {
                        $eq: ["$$contest.timeslotId", "$timeSlots._id"], // Filter by timeslotId
                      },
                    },
                  },
                  0, // Take the first element (index 0) from the filtered result
                ],
              },
              // Include the start date field
            },
          }, // Collect contests related to this auction category
        },
      },

      { $unwind: "$contests" },
      {
        $addFields: {
          playerCount: {
            $size: {
              $ifNull: ["$contests.firstContest.slotsFill", []], // Safely handle the case where firstContest.slotsFill may be null or missing
            },
          },
        },
      },
      {
        $group: {
          _id: {
            auctionCategoryId: "$auctionCategory._id",
            state: "$contests.state",
          },
          auctionCategory: { $first: "$auctionCategory" },
          megaCount: { $first: "$megaCount" },
          contests: {
            $push: {
              _id: "$_id",
              title: "$auctionCategory.title",
              timeSlots: "$contests.timeSlots",
              sortingNumber: "$auctionCategory.sortingNumber",
              duration: "$auctionCategory.duration",
              createdAt: "$auctionCategory.createdAt",
              updatedAt: "$auctionCategory.updatedAt",
              __v: "$auctionCategory.__v",
              maxStartDate: { $max: "$contests.startDate" },
              maxEndDate: { $max: "$contests.endDate" },
              state: "$contests.state",
              megaCount: "$megaCount",
              playerCount: "$playerCount",
            },
          },
        },
      },
      {
        $group: {
          _id: null,
          upcoming: {
            $push: {
              $cond: [
                { $eq: ["$_id.state", "upcoming"] },
                { $arrayElemAt: ["$contests", 0] },
                null,
              ],
            },
          },
          live: {
            $push: {
              $cond: [
                { $eq: ["$_id.state", "live"] },
                { $arrayElemAt: ["$contests", 0] },
                null,
              ],
            },
          },
          wining: {
            $push: {
              $cond: [
                { $eq: ["$_id.state", "wining"] },
                { $arrayElemAt: ["$contests", 0] },
                null,
              ],
            },
          },
        },
      },
      {
        $project: {
          upcoming: {
            $let: {
              vars: {
                filteredUpcoming: {
                  $filter: {
                    input: "$upcoming",
                    as: "contest",
                    cond: { $ne: ["$$contest", null] },
                  },
                },
              },
              in: {
                $sortArray: {
                  input: "$$filteredUpcoming",
                  sortBy: { sortingNumber: -1 }, // Change 'startDate' to your desired sorting field
                },
              },
            },
          },
          live: {
            $let: {
              vars: {
                filteredLive: {
                  $filter: {
                    input: "$live",
                    as: "contest",
                    cond: { $ne: ["$$contest", null] },
                  },
                },
              },
              in: {
                $sortArray: {
                  input: "$$filteredLive",
                  sortBy: { sortingNumber: -1 }, // Change 'startDate' to your desired sorting field
                },
              },
            },
          },
          wining: {
            $let: {
              vars: {
                filteredWining: {
                  $filter: {
                    input: "$wining",
                    as: "contest",
                    cond: { $ne: ["$$contest", null] },
                  },
                },
              },
              in: {
                $sortArray: {
                  input: "$$filteredWining",
                  sortBy: { sortingNumber: -1 }, // Change 'startDate' to your desired sorting field
                },
              },
            },
          },
        },
      },
    ]);

    const responseObj = response[0];


    // Create a map for faster lookups, converting _id to string
    const playerStatusMap = playerStatusResponse.reduce((acc, item) => {
      acc[item?._id?.toString()] = item;
      return acc;
    }, {});
    
    // Map over each category and update the objects
    responseObj.upcoming = responseObj?.upcoming?.map((el) => {
      const matchedCategory = playerStatusMap[el?._id?.toString()];
      return matchedCategory
        ? { ...el, selectedContest: matchedCategory?.upcoming?.selectedContest,megaCountupcoming:(matchedCategory?.upcoming?.megaupcomingCount/5).toFixed(2) }
        : el;
    });
    
    responseObj.live = responseObj?.live?.map((el) => {
      const matchedCategory = playerStatusMap[el?._id?.toString()];
      return matchedCategory
        ? { ...el, playingContest: matchedCategory?.live?.playingContest,megaCountlive:(matchedCategory?.live?.megaliveCount/5).toFixed(2)  }
        : el;
    });
    
    responseObj.wining = responseObj?.wining?.map((el) => {
      const matchedCategory = playerStatusMap[el?._id?.toString()];
      return matchedCategory
        ? { 
            ...el, 
            playedContest: matchedCategory.wining?.playedContest, 
            contestWinning: matchedCategory.wining?.contestWinning 
          }
        : el;
    });
    

    return { contest: response};
    
  } catch (error) {
    console.error(error);
    throw error
  }
};

const getMainCategoryDataContestData = async (joinCategoryId,status,userId,filterObj)=>{
  try{
  const sortfilterObj = filterObj?.sortfilterObj || {};
  const sortByRangeFilterObj = filterObj?.sortByRangeFilterObj || {};
  const userIdConverted = new Types.ObjectId(userId); // Convert userId to ObjectId

  const sortStage = {
    // $sort: {entryAmount:1}
  };

  const sortStage2 = {
    // $sort: {sortByEntryAmount:1}
  };

  if (sortfilterObj?.sortByEntryAmount) {
    (sortStage.$sort.entryAmount =
      sortfilterObj?.sortByEntryAmount === "min" ? 1 : -1),
      (sortStage2.$sort.sortByEntryAmount =
        sortfilterObj?.sortByEntryAmount === "min" ? 1 : -1);
  }

  if (sortfilterObj?.sortBywiningPercentage) {
    sortStage.$sort.rankPercentage =
      sortfilterObj.sortBywiningPercentage === "min" ? 1 : -1;
    sortStage2.$sort.sortBywiningPercentage =
      sortfilterObj.sortBywiningPercentage === "min" ? 1 : -1;
  }

  if (sortfilterObj?.sortBySlotSize) {
    sortStage.$sort.slots = sortfilterObj?.sortBySlotSize === "min" ? 1 : -1;
    sortStage2.$sort.sortBySlotSize =
      sortfilterObj?.sortBySlotSize === "min" ? 1 : -1;
  }

  if (sortfilterObj?.contestType) {
    sortStage.$sort.type = sortfilterObj.contestType;
    sortStage2.$sort.contestType = sortfilterObj.contestType;
  }
  if (sortfilterObj?.sortByPrizePoll) {
    sortStage.$sort.prizeDistributionAmount =
      sortfilterObj.sortByPrizePoll === "min" ? 1 : -1;
    sortStage2.$sort.sortByPrizePoll =
      sortfilterObj.sortByPrizePoll === "min" ? 1 : -1;
  }

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
        $match: {
          "subcategoryDetails.auctioncategory": new Types.ObjectId(
            joinCategoryId
          ), // Match by the subcategory ID in contests
        },
      },
      {
        $addFields: {
          currentTime: currentTime,
        },
      },
      // {
      //   $lookup: {
      //     from: "timesheduleschemas",
      //     localField: "_id",
      //     foreignField: "contestId",
      //     as: "timeSlots2",
      //   },
      // },
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
        $match: {
          contestStatus: status,
        },
      },

      {
        $match: {
          ...(sortByRangeFilterObj?.dateFilter?.startDate?.trim() &&
            sortByRangeFilterObj?.dateFilter?.endDate?.trim() && {
              startDateTime: {
                $gte: new Date(sortByRangeFilterObj?.dateFilter?.startDate),
              },
              endDateTime: {
                $lte: new Date(sortByRangeFilterObj?.dateFilter?.endDate),
              },
            }),
        },
      },
      {
        $match: {
          ...(sortByRangeFilterObj?.slotFilter?.min &&
            sortByRangeFilterObj?.slotFilter?.max && {
              slots: {
                $gte: Number(sortByRangeFilterObj?.slotFilter?.min),
                $lte: Number(sortByRangeFilterObj?.slotFilter?.max),
              },
            }),
        },
      },
      {
        $match: {
          ...(sortByRangeFilterObj?.prizePoolFilter?.min &&
            sortByRangeFilterObj?.prizePoolFilter?.max && {
              prizeDistributionAmount: {
                $gte: Number(sortByRangeFilterObj?.prizePoolFilter?.min),
                $lte: Number(sortByRangeFilterObj?.prizePoolFilter?.max),
              },
            }),
        },
      },
      ...(Object.keys(sortStage.$sort || {}).length ? [sortStage] : []), // Ensures valid syntax

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
      }
      
 
      ,

      
      ...(status === "upcoming"
        ? [
            {
              $sort: {
                "timeSlots.endTime": 1,
              },
            },
          ]
        : [
            {
              $sort: {
                "timeSlots.endTime": -1,
              },
            },
          ]),
          {
            $group: {
              _id: "$subcategoryDetails._id",
              category: { $first: "$subcategoryDetails" },
              sortByEntryAmount: { $first: "$entryAmount" },
              sortByWiningPercentage: { $first: "$rankPercentage" },
              sortBySlotSize: { $first: "$slots" },
              sortByPrizePool: { $first: "$prizeDistributionAmount" },
              contestType: { $first: "$type" },
              contests: {
                $push: {
                  _id: "$_id",  // Contest ID
                  entryAmount: "$entryAmount",
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
          
      ...(Object.keys(sortStage2.$sort || {}).length ? [sortStage2] : []), // Ensures valid syntax
    ]);

    return response;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

module.exports = {getMainCategoryData,getMainCategoryDataContestData}


