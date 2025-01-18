const mongoose = require("mongoose");
const PrivateContest = require("../model/privatecontest"); 
const UserPrivateContestDetails=require("../model/userprivatecontest");
const userModel=require("../model/user/user")
const privateContestSetting=require("../model/admin/pcontestseetingModel")
const { users } = require('../sockethelper/socketUsers');
const TransactionHistory=require("../model/transactionhistory");
const Wallet=require("../model/walletSchema");
const calculatePrivatePlayerRanking = require("../function/calculatePrivatePlayerRanking");
const calculatePlayerRankingTest = require("../function/calculatePlayerRankingTest");

const { ObjectId } = mongoose.Types;

const getPrivateContestData = async () => {
  const currentDateTime = new Date();
  try {
    const contests = await PrivateContest.aggregate([
      {
        $match: { isApproved: true },
      },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "categoryDetails",
        },
      },
      {
        $unwind: "$categoryDetails",
      },
      {
        $facet: {
          liveContests: [
            {
              $match: {
                startDateTime: { $lte: currentDateTime },
                endDateTime: { $gte: currentDateTime },
              },
            },
            {
              $group: {
                _id: "$categoryDetails._id",
                categoryTitle: { $first: "$categoryDetails.title" },
                contests: { $push: "$$ROOT" },
              },
            },
          ],
          upcomingContests: [
            {
              $match: {
                startDateTime: { $gt: currentDateTime },
              },
            },
            {
              $group: {
                _id: "$categoryDetails._id",
                categoryTitle: { $first: "$categoryDetails.title" },
                contests: { $push: "$$ROOT" },
              },
            },
          ],
          expiredContests: [
            {
              $match: {
                endDateTime: { $lt: currentDateTime },
              },
            },
            {
              $group: {
                _id: "$categoryDetails._id",
                categoryTitle: { $first: "$categoryDetails.title" },
                contests: { $push: "$$ROOT" },
              },
            },
          ],
        },
      },
    ]);

    return contests;
  } catch (error) {
    console.error("Error fetching contests:", error);
    throw error;
  }
};

const getSingleUserPrivateContestDetails = async (req, res) => {
  const { contestId } = req.params;
  const userId = req.user._id;
  try {
    const response = await UserPrivateContestDetails.findOne({
      contestId,
      userId,
    });
    if (!response) {
      return res
        .status(200)
        .json({ success: false, message: "not joined yet in contest" });
    }
    return res.status(200).json({ success: true, data: response });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};
const joinContest = async (req, res) => {

  const { contestId } = req.params;

  const userId = req.user._id;
  const userSocketId = users[userId]?.toString();
  const currentTime = new Date();

  if (!userSocketId) {
    console.error("User socket not found");
    return res.status(200).json({success:false, message: "User socket not found" });
  }
  const session = await mongoose.startSession();
  session.startTransaction();
  try {

    const response=await UserPrivateContestDetails.findOne({contestId,userId});

    if(response){
      await session.abortTransaction();
      session.endSession();
      req.io.to(userSocketId).emit("error", { message: "you have Already join Contest" });
      return res.status(200).json({success:false, message: "already joind contest" });
    }

    const contest = await PrivateContest.findById(contestId).session(session);

    if (!contest) {
      await session.abortTransaction();
      session.endSession();
      req.io.to(userSocketId).emit("error", { message: "Contest not found" });
      return res.status(200).json({success:false, message: "Contest not found" });
    }

    if (currentTime < contest.startDateTime) {
      await session.abortTransaction();
      session.endSession();
      req.io.to(userSocketId).emit("error",{message: "Contest has not started yet"});
      return res.status(200).json({success:false, message: "Contest has not started yet" });
    }

    if (currentTime > contest.endDateTime) {
      await session.abortTransaction();
      session.endSession();
      req.io.to(userSocketId).emit("error", {message:"Contest is already over"});
      return res.status(200).json({success:false, message: "Contest is already over" });
    }

    if (contest.actualSlots >= contest.createdSlots) {
      await session.abortTransaction();
      session.endSession();
      req.io
        .to(userSocketId)
        .emit("noSlotsAvailable", { message: "No slots available" });
      return res.status(200).json({success:false, message: "No slots available" });
    }

    const wallet = await Wallet.findOne({ user: userId }).session(session);
    if (!wallet) {
      await session.abortTransaction();
      session.endSession();
      req.io.to(userSocketId).emit("error", { message: "Wallet not found" });
      return res.status(200).json({success:false, message: "Wallet not found" });
    }
    const entryFee = contest.createdEntryFee;
    if (wallet.balance < entryFee && wallet.winningbalance < entryFee) {
      await session.abortTransaction();
      session.endSession();
      req.io
        .to(userSocketId)
        .emit("walletError", {
          message: "Insufficient balance to join the contest",
        });
      return res.status(200).json({success:false, message: "Insufficient balance" });
    }

    if (wallet.balance >= entryFee) {
      wallet.balance -= entryFee;
    } else {
      wallet.winningbalance -= entryFee;
    }

    contest.actualSlots.push(userId);
    await contest.save({ session });

    const userContestDetail = new UserPrivateContestDetails({
      contestId,
      userId,
      totalAmount: 0,
    });
    await userContestDetail.save({ session });
    await wallet.save({ session });

    const transaction = new TransactionHistory({
      user: userId,
      type: "debit",
      amount: entryFee,
      description: `Joining contest fee of ₹${entryFee} deducted from your wallet`,
    });
    await transaction.save({ session });
    await session.commitTransaction();

    req.io.to(userSocketId).emit("joinedContest", {
      message: "Successfully joined the contest",
      contest,
    });

    req.io.emit(`singlePrivateContest-${contest._id}`, { contest });

    return res.status(201).json({ success: true, data: userContestDetail });
    
  } catch (error) {
    await session.abortTransaction();
    
    req.io
      .to(userSocketId)
      .emit("error", {
        message: "An error occurred while joining the contest"
       
      });
    res.status(500).json({success:false, message: "Error joining contest", error });
  } finally {
    session.endSession();
  }
};



const bidding = async (req, res) => {

  const { contestId } = req.params;
  const userId = req.user._id;
  const { bidAmount } = req.body; 
  const session = await mongoose.startSession();
  const currentTime = new Date();

  try {

    session.startTransaction();
    
    const userContestDetail = await UserPrivateContestDetails.findOne({
      userId,
      contestId,
    }).session(session);

    if (userContestDetail?.bids?.map((el) => el.Amount)?.includes(bidAmount)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(200).json({ success: false, message: "Duplicate bids found. Enter a unique bid." });
    }

    if (bidAmount < 1) {
      return res.status(200).json({ success: false, message: `Bid too low! Minimum bid is ${1}.` });
    }
    if (bidAmount > 100) {
      return res.status(200).json({ success: false, message: `Bid too high! Maximum bid is ${100}.` });
    }


    const contest = await PrivateContest.findById(contestId).session(session);

    const wallet = await Wallet.findOne({ user: userId }).session(session);
    if (!contest) {
      await session.abortTransaction();
      session.endSession();
      return res.status(200).json({ success: false, message: "Contest not found" });
    }

    if (currentTime > contest.endDateTime) {
      await session.abortTransaction();
      session.endSession();
      return res.status(200).json({success:false, message: "Contest is already over" });
    }
    if (!wallet) {
      await session.abortTransaction();
      session.endSession();
      return res.status(200).json({ success: false, message: "Wallet not found" });
    }



    if (!contest) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: "Private contest not found" });
    }
    
    if (wallet.balance < bidAmount && wallet.winningbalance < bidAmount) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: "Insufficient balance" });
    }

    if (wallet.balance >= contest.createdEntryFee) {
      wallet.balance -= contest.createdEntryFee;
    } else {
      wallet.winningbalance -= contest.createdEntryFee;
    }


    if (!userContestDetail) {
      const temp = new UserPrivateContestDetails({
        userId,
        contestId,
        bids: [{ Amount: bidAmount, bidTimeDate: new Date() }], // Assuming `bids` is an array
        totalAmount: contest.createdEntryFee,
      }); 
      // Save the new document with session if provided
      await temp.save({ session });
    } 
    else {
      userContestDetail.bids.push({ Amount: bidAmount, bidTimeDate: new Date() });
      userContestDetail.totalAmount += contest.createdEntryFee;
      await userContestDetail.save({ session });
    }

    
   if (userContestDetail?.bids?.length >= contest.createdUpto) {
    await session.abortTransaction();
    session.endSession();
    return res.status(400).json({ success: false, message: "Maximum bids reached" });
  }
  


    await contest.save({ session });
    await wallet.save({ session });
   
    const transaction = new TransactionHistory({
      user: userId,
      type: "debit",
      amount: contest.createdEntryFee,
      description: `Bid ₹${bidAmount} in Private Contest`,
      amountType:"realAmount"
    });
    
    await transaction.save({ session });

    await session.commitTransaction();
    session.endSession();

    const data = await calculatePrivatePlayerRanking(contestId,{
      "winingPercentage":(contest.createdwiningPercentage||0),
      "entryFees":contest.createdEntryFee,
      "spots":contest.ranks.length ,
      "prizedistribution":contest.prizeDistributionPercentage
  })

  await PrivateContest.findByIdAndUpdate(
    contest._id,  // Ensure contest._id is the correct ID for UserPrivateContestDetails
    { ranks: data },
    { new: true }
  );



     return res.status(200).json({ success: true,message: "Bid successfully placed",data });

  } catch (error) {
    console.log(error)
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};


const calculateUserRankings = async (contestId) => {
  try {
    const userContestDetails = await UserPrivateContestDetails.find({
      contestId: contestId,
    });
    const bidCountMap = new Map();
    userContestDetails.forEach((user) => {
      user.bids.forEach((bid) => {
        const amount = bid.Amount;
        bidCountMap.set(amount, (bidCountMap.get(amount) || 0) + 1);
      });
    });
    const usersData = userContestDetails.map((user) => {
      let totalBidAmount = 0;
      let uniqueBidCount = 0;
      user.bids.forEach((bid) => {
        const amount = bid.Amount;
        totalBidAmount += amount;

        if (bidCountMap.get(amount) === 1) {
          uniqueBidCount++;
        }
      });

      return {
        userId: user.userId,
        totalBidAmount,
        uniqueBidCount,
        winningAmount: 0,
      };
    });

    usersData.sort((a, b) => {
      if (b.totalBidAmount !== a.totalBidAmount) {
        return b.totalBidAmount - a.totalBidAmount;
      }
      return b.uniqueBidCount - a.uniqueBidCount;
    });

    const rankings = [];
    let currentRank = 1;
    let prevUser = null;

    usersData.forEach((user) => {
      if (
        prevUser &&
        (prevUser.totalBidAmount !== user.totalBidAmount ||
          prevUser.uniqueBidCount !== user.uniqueBidCount)
      ) {
        currentRank++;
      }

      let rankEntry = rankings.find((r) => r.rank === currentRank);
      if (!rankEntry) {
        rankEntry = { rank: currentRank, users: [] };
        rankings.push(rankEntry);
      }

      rankEntry.users.push({
        userId: user.userId,
        totalBidAmount: user.totalBidAmount,
        uniqueBidCount: user.uniqueBidCount,
        winningAmount: 0,
      });

      prevUser = user;
    });
    return rankings;
  } catch (error) {
    console.error("Error calculating rankings:", error);
    throw error;
  }
};
  const getTopPercentRanks = (rankings, percentage) => {
    const totalRanks = rankings.length;
    const topRankCount = Math.floor(totalRanks * (percentage / 100));
    // const topRankCount = Math.floor(totalRanks * 1); 
    const topRanks = rankings.slice(0, topRankCount);
    let topUsers = [];
    topRanks.forEach(rank => {
      topUsers = topUsers.concat(rank); 
    });
    return topUsers;
  };

  const distributePrizes = async (contest, uptoRank) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const pcontestSetting = await privateContestSetting.findOne({});
      if (!pcontestSetting) {
        throw new Error('Private contest Setting not found.');
      }
      const totalPrizePool = contest.actualSlots * contest.createdEntryFee;
      const platformFeeAmount = totalPrizePool * (pcontestSetting.platformfee / 100); 
      const influencerFeePercent = pcontestSetting.influencerfee / 100; 
      const remainingPrizePool = totalPrizePool - platformFeeAmount; 

      const topUsersByRank = contest.ranks.filter(rankGroup => rankGroup.rank <= uptoRank);
      const totalRankedUsers = topUsersByRank.reduce((total, rankGroup) => total + rankGroup.users.length, 0);

      const contestDoc = await PrivateContest.findById(contest._id).lean().session(session);
      for (const rankGroup of topUsersByRank) {
        const prizePerUser = remainingPrizePool / totalRankedUsers;
  
        for (const user of rankGroup.users) {
     
          await UserPrivateContestDetails.findOneAndUpdate(
            { userId: user.userId, contestId: contest._id },
            { $inc: { winningAmount: prizePerUser }},
            { new: true }
          ).session(session);

          const wallet = await Wallet.findOne({ user: user.userId }).session(session);
          wallet.winningbalance +=prizePerUser;
          await wallet.save({session});
          const transaction = new TransactionHistory({
            user: user.userId,
            type: "credit",
            amount: prizePerUser,
            description: `credit  ₹${prizePerUser} in your Winning Amount Wallet for winning Contest with rank ${rankGroup.rank}`,
          });
          await transaction.save({ session });

          const rankIndex = contestDoc.ranks.findIndex(r => r.rank === rankGroup.rank);
          const userIndex = contestDoc.ranks[rankIndex].users.findIndex(u => u.userId.toString() === user.userId.toString());
  
          if (rankIndex !== -1 && userIndex !== -1) {
            contestDoc.ranks[rankIndex].users[userIndex].winningAmount = prizePerUser;
          }
        }
      }
  
  

      const influencerProfit = platformFeeAmount * influencerFeePercent; 
      const companyProfit = platformFeeAmount - influencerProfit; 

      await PrivateContest.findOneAndUpdate(
        { _id: contest._id },
        {
          $set: {
            influencerProfit: influencerProfit,
            companyProfit: companyProfit,
            ranks: contestDoc.ranks
          },
        },
        { new: true }
      ).session(session);
      await session.commitTransaction();
      session.endSession();
      
  
    } catch (error) {
      console.error("Error distributing prizes and updating profits:", error);
    }
  };

  
const checkAndCompleteContests = async (io) => {
  try {
    const currentTime = new Date();
    const ongoingContests = await PrivateContest.find({ 
      isComplete: false,
      endDateTime: { $lte: currentTime }
    });
    ongoingContests.forEach(async(contest) => {
      
      const finalRankings = await calculateUserRankings(contest._id);
      contest.isComplete = true;
      contest.ranks = finalRankings;
      await contest.save();
      const pcontestsetting = await privateContestSetting.find({});
      const topUsersByRank = getTopPercentRanks(
        finalRankings,
        pcontestsetting.distirbytionpercent
      );
      // console.log({topUsersByRank})
      await distributePrizes(contest, topUsersByRank.length);
      
      io.emit(`final-privateContest-${contest._id}`, {
        contest: contest,
        finalRankings: finalRankings,
        topPercentUsers: topUsersByRank
      });
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error checking contests:", error);
  }
};
  
  
const getSubContestByCatgroyId = async (categoryId,io)=>{
  try{
    const response = await PrivateContest.find({category:categoryId})
    io.emit("get-private-contest-ByID", response);
  } catch (error) {
    io.emit("get-private-contest-ByID-error",{ message: "Internal Server Error" });
  }
}  


const PrivateContestCategory = async (userId) => {
  try {
    const contests = await PrivateContest.find({ influencer: userId })
    .populate("category").select("startDateTime endDateTime category");

    const joinContest = await userModel.findById(userId)
    ?.populate({
      path: 'joinPrivateContest', // Populates contest IDs in `joinPrivateContest`
      populate: {
        path: 'category', // Further populates the `category` field inside each contest
        // select: 'startDateTime endDateTime category', // Select specific fields from the contest
      },
    });
 

      let contestJoined = []
  
      if(joinContest?.joinPrivateContest){
        contestJoined =contests.concat(joinContest?.joinPrivateContest)
      }else{
        contestJoined = contests
      }

    const liveCategories = new Set();
    const upcomingCategories = new Set();
    const expiredCategories = new Set();

    const now = new Date();
console.log(contestJoined)
    contestJoined.forEach((contest) => {

      if (contest.startDateTime > now) {    
        upcomingCategories.add(JSON.stringify(contest.category));
      } else if (contest.startDateTime <= now && contest.endDateTime >= now) {
        liveCategories.add(JSON.stringify(contest.category));
      } else {
        expiredCategories.add(JSON.stringify(contest.category));
      }
    });

    const live = Array.from(liveCategories).map(JSON.parse);
    const upcoming = Array.from(upcomingCategories).map(JSON.parse);
    const expired = Array.from(expiredCategories).map(JSON.parse);

    return {
      live,
      upcoming,
      expired,
    };
  } catch (error) {
    console.error("Error fetching contest categories:", error);
    throw new Error("Failed to retrieve contest categories");
  }
};
const GetPrivateContests = async (categoryId, userId,filterObj) => {

  const {sortByRangeFilterObj,sortfilterObj} = filterObj

  const sortStage = {
    $sort: {createdEntryFee:-1}
  };
  


  if(sortfilterObj?.sortByEntryAmount){
   sortStage.$sort.createdEntryFee=sortfilterObj.sortByEntryAmount==="min"?1:-1
  }

  if(sortfilterObj?.sortBySlotSize){
    sortStage.$sort.createdSlots=sortfilterObj.sortBySlotSize==="min"?1:-1
  }

  if(sortfilterObj?.sortByPrizePoll){
    sortStage.$sort.createdPrizePool = sortfilterObj.sortByPrizePoll==="min"?1:-1
  }


  try {
    const contests = await PrivateContest.aggregate([{
      $match:{
        category: new mongoose.Types.ObjectId(categoryId),
        influencer: new mongoose.Types.ObjectId(userId) ,
      }
    },
    {
      $match: {
        ...(sortByRangeFilterObj?.dateFilter?.startDate?.trim() && sortByRangeFilterObj?.dateFilter?.endDate?.trim() && {
          startDateTime: { $gte: new Date(sortByRangeFilterObj?.dateFilter?.startDate) },
          endDateTime: { $lte: new Date(sortByRangeFilterObj?.dateFilter?.endDate) }
        })
      }
    },
    {
      $match: {
        ...(sortByRangeFilterObj?.slotFilter?.min&& sortByRangeFilterObj?.slotFilter?.max && {
          createdSlots: {
            $gte: Number(sortByRangeFilterObj?.slotFilter?.min), 
            $lte: Number(sortByRangeFilterObj?.slotFilter?.max)
          },
        })
      }
    },
    {
      $match: {
        ...(sortByRangeFilterObj?.prizePoolFilter?.min&& sortByRangeFilterObj?.prizePoolFilter?.max && {
          createdPrizePool: {
            $gte: Number(sortByRangeFilterObj?.prizePoolFilter?.min), 
            $lte: Number(sortByRangeFilterObj?.prizePoolFilter?.max)
          },
        })
      }
    },
    sortStage
  ])

    const now = new Date();
    const liveContests = [];
    const upcomingContests = [];
    const expiredContests = [];

    contests.forEach((contest) => {
      if (contest.startDateTime > now) {
        upcomingContests.push(contest);
      } else if (contest.startDateTime <= now && contest.endDateTime >= now) {
        liveContests.push(contest);
      } else {
        expiredContests.push(contest);
      }
    });

 
    return {
      live: liveContests,
      upcoming: upcomingContests,
      expired: expiredContests,
    };
  } catch (error) {
    console.error("Error fetching contests:", error);
    throw new Error("Failed to retrieve contests by category and influencer.");
  }
};

const ParticipantCategory = async (userId) => {
  try {

    const userContests = await UserPrivateContestDetails.find({ userId })
      .populate({
        path: "contestId",
        select: "category startDateTime endDateTime", 
        populate: { path: "category", select: "title duration" },
      });

    const liveCategories = new Set();
    const upcomingCategories = new Set();
    const expiredCategories = new Set();

    const now = new Date();

    userContests.forEach((userContest) => {
      const contest = userContest.contestId;
      if (!contest) return; 
      const categoryData = JSON.stringify(contest.category); 
      if (contest.startDateTime <= now && contest.endDateTime >= now) {
        liveCategories.add(categoryData);
      } else if (contest.endDateTime < now) {
        expiredCategories.add(categoryData);
      }
    });

    const live = Array.from(liveCategories).map(JSON.parse);
    const upcoming = Array.from(upcomingCategories).map(JSON.parse);
    const expired = Array.from(expiredCategories).map(JSON.parse);

    return {
      live,
      upcoming,
      expired,
    };
  } catch (error) {
    console.error("Error fetching contest categories:", error);
    throw new Error("Failed to retrieve contest categories");
  }
};
const getUserContestsByCategoryAndStatus = async (userId, categoryId) => {
  try {
    const now = new Date();

    const response = await UserPrivateContestDetails   
    .find({ userId })
      .populate({
        path: "contestId",
        match: { category: new mongoose.Types.ObjectId(categoryId) },
      })
      .lean();

    const live = [];
    const upcoming =[];
    const expired = [];

    response.forEach(({ contestId }) => {
      if (contestId && contestId.startDateTime && contestId.endDateTime) {
        if (contestId.startDateTime <= now && contestId.endDateTime >= now) {
          live.push(contestId);
        } else if (contestId.startDateTime > now) {
          upcoming.push(contestId);
        } else {
          expired.push(contestId);
        }
      }
    });


    return {
      live,
      upcoming,
      expired
    };
  } catch (error) {
    console.error("Error fetching contests by category and status:", error);
    throw new Error("Failed to retrieve contest categories by status.");
  }
};

module.exports = {
  joinContest,getPrivateContestData,bidding,checkAndCompleteContests,
  getSingleUserPrivateContestDetails,getUserContestsByCategoryAndStatus,
  getSubContestByCatgroyId,PrivateContestCategory,GetPrivateContests,
  ParticipantCategory};



