const Contest = require("../model/contestModel");
const contestModel = require("../model/contestModel");
const mongoose = require("mongoose");
const timesheduleschemas = require('../model/contestTimeSheduleList');
const contesthistory = require("../model/contesthistory");

const createContest = async (req, res, next) => {
  // console.log(req.body)
  try {
    const response = new Contest({...req.body,
    });
    await response.save();
    res.status(201).json({
      success: true,
      data: response,
      message: "CategoryContest created",
    });
  } catch (error) {
    next(error);
  }
};

const getContests = async (req, res, next) => {
  try {
    const contests = await Contest.find();
    res.status(200).json(contests);
  } catch (error) {
    next(error);
  }
};

const getContestsByPagination = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1; // Default to page 1 if not provided
    const limit = parseInt(req.query.limit) || 10; // Default to 10 contests per page if not provided

    const skip = (page - 1) * limit; // Calculate the number of items to skip

    // Get contests with pagination
    const contests = await Contest.find().skip(skip).limit(limit);

    // Get the total number of contests for pagination info
    const totalContests = await Contest.countDocuments();

    const data = {
      success: true,
      data: contests,
    };

    res.status(200).json({
      page,
      totalPages: Math.ceil(totalContests / limit),
      totalContests,
      data,
    });
  } catch (error) {
    next(error);
  }
};

const GetById = async (req, res, next) => {
  try {
    const response = await Contest.findById(req.params.id);
    if (!response)
      return res
        .status(404)
        .json({ success: false, message: "Contest not found" });
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

const updateContest = async (req, res, next) => {
  try {
    const response = await Contest.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!response)
      return res
        .status(404)
        .json({ success: false, message: "Contest not found" });
    res
      .status(200)
      .json({ success: true, data: response, message: "Contest Updated" });
  } catch (error) {
    next(error);
  }
};

const Delete = async (req, res, next) => {
  try {
    const response = await Contest.findByIdAndDelete(req.params.id);
    if (!response)
      return res
        .status(404)
        .json({ success: false, message: "Contest not found" });
    res
      .status(200)
      .json({ success: true, message: "Contest deleted successfully" });
  } catch (error) {
    next(error);
  }
};

const getContestByType = async (req, res) => {
  try {
    try {
      const { type, subcategoryId } = req.query;

      const pipeline = [
        {
          $match: {
            ...(type && { type: type }),
            ...(subcategoryId && {
              subcategoryId: subcategoryId,
            }),
          },
        },
        {
          $sort: {
            createdAt: -1,
          },
        },
      ];

      const response = await Contest.aggregate(pipeline);
      res.status(200).json(response);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  } catch (err) {
    console.error(err);
  }
};
const getContestByTypePagination = async (req, res) => {
  try {

    const currentDate = new Date();
    
    const { type, subcategoryId, page, limit, date,state,startDate,endDate} = req.query;
    

    

    const matchStage = {
      ...(type && { type }),
      ...(subcategoryId
        ? { $expr: { $eq: [{ $toString: "$subcategoryId" }, subcategoryId] } }
        : {}),
    };

    // // Default values for pagination if not provided
    const pageNumber = parseInt(page) || 1;
    const pageSize = parseInt(limit) || 10;
    const skip = (pageNumber - 1) * pageSize;

    const currentTime = new Date();

    const pipeline = [
      {
        $addFields: {
          currentTime: currentTime,
        },
      },
      {
        $lookup:{
         from:"timesheduleschemas",
         localField:"_id",
         foreignField:"contestId",
         as:"timeSlots2"
        }
      },
      ...(state?.trim() !== "all" ?[{
  $addFields: {
    currentTime: {
      $dateToString: {
        format: "%Y-%m-%d %H:%M:%S", // Define the date format
        date: new Date(), // Current date and time
        timezone: "Asia/Kolkata", // Set timezone to IST (Indian Standard Time)
      },
    },
    state: {
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
  }
}]:[]),
...(state?.trim() !== "all" ? [{ $unwind: "$state" }] : []), 
     {
        $match:{
         
              ...(state?.trim() !== "all" && { state: state.trim() }),
              subcategoryId: { $ne: null, $ne: false, $ne: "", $ne: 0, $ne: undefined }       
        }
      },
      {
        $lookup: {
          from: "sub-categories", // The name of the SubCategory collection
          localField: "subcategoryId", // Field in the Contest collection (string)
          foreignField: "_id", // Field in SubCategory schema that matches subcategoryId (should be a string)
          as: "subcategory", // The name of the array containing the populated data
          pipeline: [
            {
              $lookup: {
                from: "categories", // Category collection
                localField: "auctioncategory", // Field in SubCategory
                foreignField: "_id", // Field in Category
                as: "auctioncategory", // Populated category field in subcategory
              },
            },
            {
              $unwind: {
                path: "$auctioncategory", // Unwind the category array
                preserveNullAndEmptyArrays: true,
              },
            },
          ],
        },
      },
      {
        $match: {
          ...(startDate?.trim() && endDate?.trim() && {
            startDateTime: {      $gte: new Date(new Date(startDate).setDate(new Date(startDate).getDate() - 1))            },
            endDateTime: { $lte: new Date(new Date(endDate).setDate(new Date(endDate).getDate() )) }
          })
        }
      },
      {
        $unwind: {
          path: "$subcategory",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
            $match: matchStage,
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
      {
        $project:{
          bidRange:1,
          bonusCashAmount: 1,
          bonusCashPercentage:1,
          bot2isActive:1,
          createdAt:1,
          endDateTime:1,
          entryAmount:1,
          isBidRangeActive:1,
          isBotActive:1,
          isBotSessionIsActive:1,
          platformFeeAmount:1,
          platformFeePercentage:1,
          prizeDistribution:1,
          prizeDistributionAmount:1,
          prizeDistributionPercentage:1,
          rankCount:1,
          rankDistribution:1, 
          rankPercentage:1,
          slots: 1,
          startDateTime: 1,
          state:1,
          subcategory:1,
          subcategoryId:1,
          totalAmount:1,
          type:1,
          typeCashBonus:1,
          updatedAt:1,
          upto:1,
          _id:1
        }
      },
      { $skip: skip },
      { $limit: pageSize },
    ]

    // Execute the aggregation pipeline
    const contests = await contestModel.aggregate(pipeline);

    // console.log(
    //   `Page: ${pageNumber}, Limit: ${pageSize}, SubcategoryId: ${subcategoryId} , contests:${contests}`
    // );

    const totalContests = await Contest.aggregate([
      {
        $addFields: {
          currentTime: currentTime,
        },
      },
      {
        $lookup:{
         from:"timesheduleschemas",
         localField:"_id",
         foreignField:"contestId",
         as:"timeSlots2"
        }
      },
      ...(state?.trim() !== "all" ?[{
        $addFields: {
          currentTime: {
            $dateToString: {
              format: "%Y-%m-%d %H:%M:%S", // Define the date format
              date: new Date(), // Current date and time
              timezone: "Asia/Kolkata", // Set timezone to IST (Indian Standard Time)
            },
          },
          state: {
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
        }
      }]:[]),
{$unwind:"$state"},
      {
        $match: {
          ...(startDate?.trim() && endDate?.trim() && {
            startDateTime: { $lte: new Date(startDate) },
            endDateTime: { $gte: new Date(endDate) }
          })
        }
      },
      {
        $match:{
              ...(state?.trim() !== "all" && { state: state.trim() }),
              subcategoryId: { $ne: null, $ne: false, $ne: "", $ne: 0, $ne: undefined }       
        }
      },
      { $count: "count" }
    ]);

    console.log("totalContests[0]?.count", totalContests[0]?.count)

    const totalCount = totalContests[0]?.count || 0;

    return res.status(200).json({
      success: true,
      data: contests,
      page: pageNumber,
      totalPages: Math.ceil(totalCount / pageSize),
      totalContests:totalCount,
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
};

const getAllTimeSlotList = async (req,res)=>{
try{
  const response =await  contestModel.findById(req.params.id).select('timeSlots')
  res.status(200).json({success:true,data:response});
}catch{
  res.status(400).json({success:false,data: error});
}}


const getAllTimeSlotFirstRankWinner = async (req, res) => {
  try {
    const response = await contesthistory.aggregate([
      {
        $match: {
          $expr: {
            $and: [
              { $eq: [{ $type: "$userranks" }, "array"] }, // Check if 'rank' is an array
              { $gt: [{ $size: "$userranks" }, 0] }, // Ensure array length is greater than 0
            ],
          },
        },
      },
      {
        $match: {
          $and: [
            { "userranks.rank": { $exists: true } }, // Ensure the `rank` field exists and is an array
            { "userranks.rank": { $not: { $gte: 2 } } } // Ensure there is no `rank` greater than 1
          ]
        },
      },
      {
        $project: {
          rank: {
            $filter: {
              input: "$userranks",
              as: "rankEntry",
              cond: { $eq: ["$$rankEntry.rank", 1] }, // Include only rank 1 in the `rank` array
            },
          },
        },
      },
    ]);
    res.status(200).json({ success: true, data: response });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  createContest,
  getContests,
  GetById,
  updateContest,
  Delete,
  getContestByType,
  getContestsByPagination,
  getContestByTypePagination,
  getAllTimeSlotList,
  getAllTimeSlotFirstRankWinner
};
