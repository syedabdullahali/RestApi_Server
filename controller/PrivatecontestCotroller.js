const PrivateContest = require("../model/privatecontest");
const PContestsetting = require("../model/admin/pcontestseetingModel");
const User = require("../model/user/user");
const { resolveHostname } = require("nodemailer/lib/shared");
const UserPrivateContestDetails=require("../model/userprivatecontest");
const { Types } = require("mongoose");

const createPcontets = async (req, res) => {

  const userId=req.user._id

  try {
    const settings = await PContestsetting.findOne({});

    if (!settings) {
      return res.status(404).json({
        success: false,
        message: "Contest settings not found",
      });
    }

    const contestData = req.body;
    // console.log("contestData",contestData)
    const createdPrizePool = contestData.createdPrizePool;

    const [timeValue, timeUnit] = (contestData.categoryName ?? "").split(" ");

    let timeMultiplier;
    let currentStartTime = new Date(contestData.startDateTime);

  
    // Determine the time multiplier based on the unit (minutes, hours)
    if (timeUnit === "minutes" || timeUnit === "minute") {
      timeMultiplier = 60 * 1000; // 1 minute = 60,000 ms
    } else if (timeUnit === "hours" || timeUnit === "hour") {
      timeMultiplier = 60 * 60 * 1000; // 1 hour = 3,600,000 ms
    }
    

      const privateContestData = {
        ...contestData,
        influencer:userId,
        endDateTime:new Date(
          currentStartTime.getTime() + timeValue * timeMultiplier
        ),
        activeStatus: createdPrizePool >= settings.max_limit_pricepool?"pending":"approved",
        isApproved: createdPrizePool >= settings.max_limit_pricepool?false:true,
      };

      const privateResponse = await PrivateContest.create(privateContestData);

      if (!privateResponse) {
        return res.status(400).json({
          success: false,
          message: "Private Contest not created",
        });
      }

      return res.status(201).json({
        success: true,
        message: "Contest saved for review and pending approval",
        privateData: privateResponse,
      });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


const updatePContest = async (req, res) => {
  const { id } = req.params;
  try {
    const response = await PrivateContest.findByIdAndUpdate(id, req.body, {
      new: true,
    });

    if (!response) {
      return res
        .status(400)
        .json({ success: false, message: "Contest Not Updated" });
    }
    res
      .status(201)
      .json({ success: true, message: "update successfully", data: response });
  } catch (err) {
    console.error(err);
  }
};


const Delete_PContest_Id = async (req, res) => {
  const { id } = req.params;
  try {
    const response = await PrivateContest.findByIdAndDelete(id);
    if (!response) {
      return res
        .status(403)
        .json({ success: false, message: "Contest Not Found" });
    }
    res.status(203).json({ success: true, message: "Contest Delete" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error,
    });
  }
};

const getallPContest = async (req, res) => {
  try {
    const { count, influencerProfit, companyProfit, average } = req.query;

    const pipeline = [
      {
        $match: {
          ...(count && { count: Number(count) }),
          ...(influencerProfit && {
            influencerProfit: Number(influencerProfit),
          }),
          ...(companyProfit && { companyProfit: Number(companyProfit) }),
          ...(average && {
            average,
          }),
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
    ];

    const respo = await PrivateContest.aggregate(pipeline);
    res.status(200).json(respo);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(400).json({ error: error.message });
  }
};
const getPContestpagination = async (req, res) => {
  try {
    const { count, influencerProfit, companyProfit, average } = req.query;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const pipeline = [
      {
        $match: {
          ...(count && { count: Number(count) }),
          ...(influencerProfit && {
            influencerProfit: Number(influencerProfit),
          }),
          ...(companyProfit && { companyProfit: Number(companyProfit) }),
          ...(average && {
            average,
          }),
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "influencer",
          foreignField: "_id",
          as: "influencerInfo"
        }
      },
      {
        $unwind: "$influencerInfo"
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
    ];

    // Get Private Contest with pagination
    const respo = await PrivateContest.aggregate(pipeline)
      .skip(skip)
      .limit(limit);

    // Get the total number of contests for pagination info
    const totalContests = await PrivateContest.countDocuments();
    // res.status(200).json(respo);
    const data = {
      success: true,
      data: respo,
    };

    res.status(200).json({
      page,
      totalPages: Math.ceil(totalContests / limit),
      totalContests,
      data,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(400).json({ error: error.message });
  }
};
const getsinglePContest = async (req, res) => {
  try {
    const { id } = req.params;
    const response = await PrivateContest.findById(id);
    if (!response) {
      return res
        .status(400)
        .json({ success: false, message: "contest not Found" });
    }

    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(400).json({ error: error.message });
  }
};

const createSetting = async (req, res) => {
  try {
    try {
      const response = await PContestsetting.create(req.body);

      

      if (!response) {
        return res.status(400).json({
          success: false,
          message: "Private Contest Setting not created",
        });
      }
      res.status(201).json({
        success: true,
        message: "Private Contest setting created successfully",
        data: response,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  } catch (err) {
    console.error(err);
  }
};

const updatesetting = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ success: false, message: "ID parameter is required" });
  }

  try {
    let response;
    const isAdd = id.trim().toLowerCase() === "add";

    if (isAdd) {
      if (Object.keys(req.body).length === 0) {
        return res.status(400).json({ success: false, message: "Request body cannot be empty" });
      }
      delete req.body._id
      const tempDoc = new PContestsetting(req.body);
      response = await tempDoc.save();
    } else {
      if (!Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: "Invalid contest setting ID" });
      }

      response = await PContestsetting.findByIdAndUpdate(id, req.body, { new: true }).lean();
    }

    if (!response) {
      return res.status(404).json({ success: false, message: "Contest setting Not Found or Not Updated" });
    }

    res.status(200).json({
      success: true,
      message: isAdd ? "Contest setting created successfully" : "Contest setting updated successfully",
      data: response,
    });
  } catch (err) {
    console.error("Error updating contest setting:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};


const getSetting = async (req, res) => {
  try {
    const respo = await PContestsetting.findOne();
    res.status(200).json(respo);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(400).json({ error: error.message });
  }
};

const getSettingToApp = async (req, res) => {
  try {
    const respo = await PContestsetting.findOne();
    res.status(200).json({
      success: true,
      message: "Fetched successfully",
      data: respo,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(400).json({ error: error.message });
  }
};


//approve a  private contest
const approvePrivateContest = async (req, res) => {
  try {
    const { contestId } = req.params;

    // Update the contest status in the PrivateContest collection to "approved"
    const updatedPrivateContest = await PrivateContest.findByIdAndUpdate(
      contestId,
      { activeStatus: "approved", isAprovable: false },
      { new: true }
    );

    if (!updatedPrivateContest) {
      return res.status(400).json({
        success: false,
        message: "Contest approval failed",
      });
    }

    res.status(200).json({
      success: true,
      message:
        "Contest approved successfully and status updated in private contests",
      data: updatedPrivateContest,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const rejectPrivateContest = async (req, res) => {
  try {
    const { contestId } = req.params;

    const privateContest = await PrivateContest.findByIdAndUpdate(
      contestId,
      { activeStatus: "rejected", isAprovable: false },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Contest rejected successfully",
      data: privateContest,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getPrivateContestByStatus=async(req,res)=>{
  try{
const response = await PrivateContest.find({isAprovable:true});

  }catch(err){
    req.status(500).json({seccess:false,})
  }
}

const  joinPrivateContest =async (req,res)=>{
  try {
    const userId=req.user._id
    const responsePrivateContest  = await  PrivateContest.findOne({contestCode:req.params.joiningCode})
  

    if(!responsePrivateContest){
      return res.status(204).json({ seccess: false, data: {message:"Contest Not Found"} });
    }

    const response = await User.findByIdAndUpdate(
      userId,
      {
        $addToSet: { joinPrivateContest: responsePrivateContest._id },
      },
      { new: true }
    );

    return res.status(200).json({ seccess: false, data: response });
  } catch (err) {
    return res.status(500).json({ seccess: false, data: err });
  }
}

const sendPrivateContestCalculation = async (req,res)=>{
     const {winingPercentage,entryFees,spots,prizedistribution} = req.body

     const totalWinnerSlot = spots * (winingPercentage /100)
     const totalAmount = spots *entryFees

     const distributedAmount = (totalAmount *(prizedistribution/100))
     const perUserDistributionAmount = distributedAmount / totalWinnerSlot; // Divide equally
      
   try {
    return res.status(200).json({ seccess: false, data: new Array(Math.floor(totalWinnerSlot)).fill(Number(perUserDistributionAmount.toFixed(2)))  })
  }catch (err) {   
    return res.status(500).json({ seccess: false, data: err });
  }
}


const MyBids = async (req, res) => {
  const { contestId } = req.params;
  const userId = req.user._id;
  if (!userId) return;
  if (!contestId) {
    return res
      .status(400)
      .json({ message: "contestId  are required" });
  }

  try {
    const response = await PrivateContest.findById(contestId);



    function assignRankLabel(bid) {
      const lastRank  = Math.floor(response.createdSlots*(response.createdwiningPercentage/100))
      // console.log(bid)

      if (bid.rank === 1 && bid.duplicateCount === 1) {
        return "Highest and Unique";
      } else if (bid.rank === 1 && bid.duplicateCount !== 1) {
        return "Highest but not Unique";
      } else if (bid.rank <= lastRank && bid.duplicateCount === 1) {
        return "Higher and Unique";
      } else if (bid.rank <= lastRank && bid.duplicateCount !== 1) {
        return "Higher but not Unique";
      } else if (bid.rank > lastRank && bid.duplicateCount === 1) {
        return "Not Highest but  Unique";
      } else {
        return "Neither Highest nor Unique"
      }

    }

    if (!response)
      return res
        .status(404)
        .json({ success: false, message: "Bids Not Found" });
    return res.status(200).json({
      success: true, data:
        response.ranks.filter((el) => el.userId.toString() === userId).map((el) => {
          return {
            bidStatus: assignRankLabel(el, response.createdSlots),
            bid: el.bid,
            biddingTime: el.biddingTime
          }
        })

    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "An error occurred", error });
  }
};

// const MyBidder = async ()=>{

  const MyBidder = async (req, res) => {
    const { contestId } = req.params;
    const userBidds = await UserPrivateContestDetails.aggregate([
      {
        $match:{
          contestId:new Types.ObjectId(contestId)
        }
      },
      {
        $lookup:{
          from:"users",
          localField:"userId",
          foreignField:"_id",
          as:"userInfo"
        }
      },
      {
        $unwind:"$userInfo"
      },
      {
        $project:{
          name:"$userInfo.name",
          _id:"$userInfo._id",
          bids:{$size:"$bids"}

        }
      }
    ])

  try{
    return res.status(200).json({ seccess: false, data: userBidds });
  }catch (error){
    return res.status(500).json({ message: "An error occurred", error });

  }
}


const getPriveiteContestByStatus = async (req, res) => {
  try {
    const { page = 1, limit = 10, status,search=''} = req.query;

    // Validate `status`
    const validStatuses = ['upcoming', 'live', 'winning'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value.' });
    }



    const now = new Date();

    // Determine filter based on status
    let filter = {};
    if (status === 'upcoming') {
      filter = { startDateTime: { $gt: now } };
    } else if (status === 'live') {
      filter = { startDateTime: { $lte: now }, endDateTime: { $gt: now } };
    } else if (status === 'winning') {
      filter = { endDateTime: { $lte: now } };
    }

    const regexPattern = new RegExp(search||"", "i");


    // Pagination options
    const skip = (page - 1) * limit;
    const options = {
      skip: parseInt(skip, 10),
      limit: parseInt(limit, 10),
      sort: { startDateTime: 1 }, // Sort by startDateTime ascending
    };


    const pipeline = [
      // Match on the parent collection fields
      // Lookup to populate influencer
      {
        $match: filter,
      },
      {
        $lookup: {
          from: 'users', // Replace with the actual collection name for influencers
          localField: 'influencer', // The field in PrivateContest referencing influencer
          foreignField: '_id', // The field in influencer documents matching the reference
          as: 'influencer',
        },
      },
      // Unwind the influencer array
      {
        $unwind: {
          path: '$influencer',
          preserveNullAndEmptyArrays: false, // Remove documents with no influencer match
        },
      },
      // Match documents where influencer fields also match the search
      {
        $match: {
          $or: [
            { 'influencer.name': { $regex: regexPattern } },
            { 'influencer.email': { $regex: regexPattern } }, // Example: bio field in influencer
            {
              $expr: {
                $regexMatch: { 
                  input: { $toString: '$influencer.mobileNumber' },  // Convert mobile number to string for matching
                  regex: search,  // Match with the search term
                  options: 'i',  // Case-insensitive matching
                },
              },
            },
          ],
        },
      },
      // Pagination
      {
        $skip: options.skip || 0,
      },
      {
        $limit: options.limit || 10,
      },
      {
        $sort: options.sort || { createdAt: -1 },
      },
    ];
    

    // Fetch contests from the database
    const contests = await PrivateContest.aggregate(pipeline);

    // Get total count for pagination metadata
    const totalCount = await PrivateContest.countDocuments(filter);

    res.status(200).json({
      message: 'Contests fetched successfully.',
      data: contests,
      pagination: {
        currentPage: parseInt(page, 10),
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
};

module.exports = {
  createPcontets,
  updatePContest,
  Delete_PContest_Id,
  getallPContest,
  getsinglePContest,
  createSetting,
  updatesetting,
  getSetting,
  getPContestpagination,
  approvePrivateContest,
  rejectPrivateContest,
  joinPrivateContest,
  getSettingToApp,
  sendPrivateContestCalculation,
  MyBids,
  MyBidder,
  getPriveiteContestByStatus,
};
