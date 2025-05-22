const UserContest = require("../model/admin/userContestDetailSchema");
const contestSchema = require("../model/contestModel");
const mongoose = require("mongoose");
const contestHistory=require("../model/contesthistory")
const creatContestTimeSlotDetails = async (req, res) => {
  try {
    const response = new UserContest(req.body);
    await response.save();

    res.status(201).json({
      success: true,
      data: response,
      message: "Contest Time Slot Details saved successfully",
    });
    
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateContestTimeSlotDetails = async (req, res) => {
  try {
    const { bidplace } = req.body;
    const currentTime = new Date();

    const timeSlotId = req.params.timeSlotId;
    const userId = req.user._id;

    const response = await UserContest.findOneAndUpdate(
      {
        timeslotId: timeSlotId.toString(), // Convert stored ObjectId to string
        userId: userId.toString(),
      },
      {
        $push: {
          bidplace: bidplace,
          bidTimeDate: currentTime,
        },
      },
      { new: true }
    );

  

    if (!response) {
      return res
        .status(404)
        .json({ success: false, message: "Contest TimeSlot Not Found" });
    }

    //calculating currect rank and winning amount
    const contestId = response.contesId;

    const allContestEntries = await UserContest.find({ contestId });

    const sortedEntries = allContestEntries.sort((a, b) => {
      const aMaxBid = Math.max(...a.bidplace);
      const bMaxBid = Math.max(...b.bidplace);
      return bMaxBid - aMaxBid; // Sort in descending order
    });

    const prizeStructure = contestSchema.findById(contestId).rankDistribution;

    let currentRank = null;
    let potentialWinningAmount = 0;

    sortedEntries.forEach((entry, index) => {
      const rank = index + 1;

      if (entry.userId.equals(currentUser)) {
        currentRank = rank;

        const prizeAmount =
          prizeStructure.find((p) => p.rank === rank)?.prizeAmount || 0;
        potentialWinningAmount = prizeAmount;
      }
    });

    const finalResponse = await UserContest.findByIdAndUpdate(
      response._id,
      { rank: currentRank, winningAmount: potentialWinningAmount },
      { new: true }
    );

    res.status(200).json({
      success: true,
      data: {
        finalResponse,
      },
      message: "Bid updated successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAllTimeSlotContest = async (req, res) => {
  try {
    const timeSlotContest = await UserContest.find();
    res.status(200).json({ success: true, data: timeSlotContest });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const joinContest = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  const { contestId, userId, timeslotId } = req.body;
 
  try {
    
    const contest = await contestSchema.findById(contestId).exec();
 
    const contestHistoryData = await contestHistory.findOne({
      contestId: contestId,
      timeslotId: timeslotId,
    });

    if (contest.slots <= (contestHistoryData?.slotsFill?.length || 0)) {
      req.io.emit("slotfull", { userId, message: "Slots Full" });
      return res.status(400).json({ message: "Slots Full" });
    }

    const response = await UserContest.findOneAndUpdate(
      {
        contesId: contestId,
        userId: userId,
        timeslotId: timeslotId,
      },
      { 
        $set: { contesId:contestId, userId, timeslotId } 
      },
      { new: true, upsert: true, session } 
    ).exec();

    // console.log('ContestId:', response);

    const updatedContestHistory = await contestHistory.findOneAndUpdate(
      { contestId: contestId, timeslotId: timeslotId },
      { $push: { slotsFill: userId } },
      { new: true, upsert: true,session },
    ).exec();

    if (!response) {
      return res.status(400).json({ message: "Failed to join contest" });
    }
    await session.commitTransaction();
    session.endSession();

    req.io.emit("contestJoined", { contestId, userId });

    res.status(200).json({
      success: true,
      message: "Joined contest successfully",
      data: { updatedContestHistory, response },
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: error.message });
  }
};


const placeBid = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  const { contestId, userId, timeslotId, bidAmount } = req.body;
  try {
    
    const contest=await contestSchema.findById(contestId);
    const usercont=await UserContest.findOne({userId: userId, contesId: contestId, timeslotId: timeslotId});

    if (usercont?.bids.length >= contest?.upto) {
      req.io.emit("bidfull", userId, contestId);
    }
    
    if (bidAmount <= 0) {
      throw new Error("Bidding amount must be greater than zero.");
    }
    const updatedParticipation = await UserContest.findOneAndUpdate(
      { userId: userId, contesId: contestId, timeslotId: timeslotId },
      {
        $push: { bids: { bidTimeDate: new Date(), Amont: bidAmount } },
        $inc: { totalBiddingAmount: bidAmount },
      },
      { new: true, session }
    ).exec();
    const contesthistory = await contestHistory.findOneAndUpdate(
      { contestId: contestId, timeslotId: timeslotId },
      {
        $inc: { totalbidsAmount: bidAmount,totalbid:1 },
      },
      { new: true, session }
    ).exec();
    if (!updatedParticipation) {
      throw new Error("User has not joined this contest time slot.");
    }
    await session.commitTransaction();
    session.endSession();
    req.io.emit("bid", {userId, contestId, updatedParticipation,contesthistory });
    res.status(201).json({success:true,message:"updated User bids"})

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: error.message });
  }
};

const getContestHistory = async (req, res) => {
  const { contestId, timeslotId } = req.params;
  try {
    const response = await contestHistory.findOne({
      contestId: contestId,
      timeslotId: timeslotId,
    });
    if (!response) {
     return res.status(403).json({ success: false, message: "Data Not Found" });
    }
    res.status(200).json({ success: true, data: response });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getUserContestDetails = async (req, res) => {
  const { contestId, timeslotId, userId } = req.params;
  try {
    const response = await UserContest.findOne({
      contesId: contestId,
      timeslotId,
      userId,
    });
    if (!response) {
      return req
        .status(403)
        .json({ success: false, message: "Data Not Found" });
    }
    res.status(200).json({ success: true, data: response });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
module.exports = {
  creatContestTimeSlotDetails,
  updateContestTimeSlotDetails,
  getAllTimeSlotContest,
  joinContest,
  placeBid,
  getContestHistory,
  getUserContestDetails
};
