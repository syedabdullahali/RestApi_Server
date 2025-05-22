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

const { createContestPipline } = require("../function/contestHelper");
const contesthistory = require("../model/contesthistory");
const calculatePlayerRanking = require("../function/calculatePlayerRanking");
const calculatePlayerRankingTest = require("../function/calculatePlayerRankingTest");
const contestModel = require("../model/contestModel");  
const timeSheduleSchema = require("../model/contestTimeSheduleList");
const userContestDetailSchema = require("../model/admin/userContestDetailSchema");
const privateContest = require("../model/privatecontest");
const { sendSingleNotification } = require("../function/sendNotification");

const getUpcomingContest = async (req, res) => {
  try {
    const { subcategoryId, page, limit } = req.query;

    const pageNumber = parseInt(page) || 1;
    const pageSize = parseInt(limit) || 10;

    const skip = (pageNumber - 1) * pageSize;

    const matchStage = {
      ...(subcategoryId && { subcategoryId }),
    };
    const pipeline = createContestPipline(matchStage, skip, pageSize);
    const contests = await Contest.aggregate(pipeline);

    if (!contests) {
      res
        .status(400)
        .json({ success: false, message: "Could not find Contest" });
    }
    const upcomingContest = categorizeContestsForUpcoming(contests);

    const totalContests = upcomingContest.length;
    return res.status(200).json({
      success: true,
      data: upcomingContest,
      page: pageNumber,
      totalPages: Math.ceil(totalContests / pageSize),
      totalContests,
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
};

const getLiveContest = async (req, res) => {
  try {
    const { subcategoryId, page, limit } = req.query;
    const pageNumber = parseInt(page) || 1;
    const pageSize = parseInt(limit) || 10;
    const skip = (pageNumber - 1) * pageSize;

    const matchStage = {
      ...(subcategoryId && { subcategoryId }),
    };

    const pipeline = createContestPipline(matchStage, skip, pageSize);

    const contests = await Contest.aggregate(pipeline);

    if (!contests) {
      res
        .status(400)
        .json({ success: false, message: "Could not find Contest" });
    }

    const liveContest = categorizeContestsForLive(contests);

    const totalContests = liveContest.length;

    return res.status(200).json({
      success: true,
      data: liveContest,
      page: pageNumber,
      totalPages: Math.ceil(totalContests / pageSize),
      totalContests,
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
};


const getWinningContest = async (req, res) => {
  try {
    const { subcategoryId, page, limit } = req.query;

    // Default values for pagination if not provided
    const pageNumber = parseInt(page) || 1;
    const pageSize = parseInt(limit) || 10;
    const skip = (pageNumber - 1) * pageSize;

    const matchStage = {
      ...(subcategoryId && { subcategoryId }),
    };

    const pipeline = createContestPipline(matchStage, skip, pageSize);

    const contests = await Contest.aggregate(pipeline);

    if (!contests) {
      res
        .status(400)
        .json({ success: false, message: "Could not find Contest" });
    }

    const winnigContest = categorizeContestsForWinning(contests);

    const totalContests = winnigContest.length;

    return res.status(200).json({
      success: true,
      data: winnigContest,
      page: pageNumber,
      totalPages: Math.ceil(totalContests / pageSize),
      totalContests,
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
};



const getSubcategoriesWithContests = async (req, res) => {
  const { page, limit, status } = req.query; // Get status from the request query parameters (e.g., 'live', 'upcoming', 'winning')

  const { id } = req.params;

  // Default values for pagination if not provided
  const pageNumber = parseInt(page) || 1;
  const pageSize = parseInt(limit) || 10;
  const skip = (pageNumber - 1) * pageSize;

  // Step 1: Validate the status
  const validStatuses = ["live", "upcoming", "winnings"];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: `Invalid status parameter. Allowed values are: ${validStatuses.join(
        ", "
      )}`,
    });
  }

  try {
    const category = await Category.findById(id);

  

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category Not found",
      });
    }
    // Step 2: Fetch subcategories with contests using aggregation
    const subcategoriesWithContests = await SubCategory.aggregate([
      {
        $match: { auctioncategory: category._id }, // Match subcategories by the auctioncategory (category ID)
      },

      {
        $lookup: {
          from: "categorycontests", // The Contest collection (make sure this matches your actual collection name)
          let: { subcategoryId: { $toString: "$_id" } }, // Convert SubCategory _id to string for matching
          pipeline: [
            {
              $addFields: {
                subcategoryIdString: {
                  $cond: {
                    if: { $eq: [{ $type: "$subcategoryId" }, "objectId"] },
                    then: { $toString: "$subcategoryId" }, // Convert ObjectId to string
                    else: "$subcategoryId", // If already a string, leave it as is
                  },
                },
              },
            },
            {
              $match: {
                $expr: { $eq: ["$subcategoryIdString", "$$subcategoryId"] }, // Match on subcategoryId string
              },
            },
            {
              $unset: ["prizeDistribution"], // Exclude specific fields
            },
          ],
          as: "contests", // The field to store contest data
        },
      },
      { $skip: skip },
      { $limit: pageSize },
    ]);

    // Step 3: Filter contests based on the 'status' query param
    const filteredSubcategories = subcategoriesWithContests.map(
      (subcategory) => {
        let filteredContests = [];

        // Apply filtering logic based on the status (live, upcoming, winning)
        if (status === "live") {
          // Filter contests for live contests using the categorizeContestsForLive function
          filteredContests = categorizeContestsForLive(subcategory.contests);
        } else if (status === "upcoming") {
          // Filter contests that are upcoming (startTime > current time)
          filteredContests = categorizeContestsForUpcoming(
            subcategory.contests
          );
        } else if (status === "winnings") {
          // Filter contests that have ended (endTime < current time)
          filteredContests = categorizeContestsForWinning(subcategory.contests);
        }

        // Return the subcategory with only the filtered contests
        return {
          ...subcategory,
          contests: filteredContests, // Only contests that match the condition will be returned
        };
      }
    );

    const totalfilteredSubcategories = filteredSubcategories.length;

    const totalPages = Math.ceil(totalfilteredSubcategories / pageSize);



    // Error Handling: If the requested page exceeds total pages
    if (pageNumber > totalPages) {
      return res.status(400).json({
        success: false,
        message: `Invalid page number. You have requested page ${pageNumber}, but there are only ${totalPages} pages available.`,
      });
    }

    // Step 4: Send the filtered subcategories with contests as the response
    return res.status(200).json({
      success: true,
      data: filteredSubcategories,
      page: pageNumber,
      totalPages,
      totalfilteredSubcategories,
    });
  } catch (error) {
    // Catch any errors during the aggregation or filtering process
    console.error("Error fetching subcategories with contests:", error);
    return res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};




const maincontestJoin = async (req, res) => {
  const { contestId, timeSlot } = req.params;
  const  userId = req.user._id;

  const userSocketId = users[userId]?.toString();
  const currentTime = new Date();
  if (!userSocketId) {
    console.error("User socket not found");
    return res
      .status(200)
      .json({ success: false, message: "User socket not found" });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const response = await userMainContestDetail
      .findOne({ userId: userId, contestId: contestId, timeslotId: timeSlot })
      .session(session);

      const timecheckObj = await Contest.findOne(
        { _id: contestId, "timeSlots._id": timeSlot },
        { "timeSlots.$": 1 }
      ).session(session);

  if (currentTime > timecheckObj.timeSlots[0].endTime) {
    await session.abortTransaction();
    session.endSession();
    req.io
      .to(userSocketId)
      .emit("contest-error", { message: "Contest is already over" });
    return res
      .status(200)
      .json({ success: false, message: "Contest is already over" });
  } 

  if(currentTime<timecheckObj.timeSlots[0].startTime){
    req.io
    .to(userSocketId)
    .emit("contest-error", { message: "Contest is not start yet" });
  return res
    .status(200)
    .json({ success: false, message: "Contest is not start yet" });
  }

  if(response){
    await session.abortTransaction();
    session.endSession();
    req.io
      .to(userSocketId)
      .emit("contest-error", { message: "You have Already joined Contest" });
    return res
      .status(200)
      .json({ success: false, message: "You have Already joined contest" });
  }
 
    const contest = await Contest.findById(contestId);

    if (!contest) {
      await session.abortTransaction();
      session.endSession(); req.io
        .to(userSocketId)
        .emit("contest-error", { message: "Contest not found" });
      return res
        .status(200)
        .json({ success: false, message: "Contest not found" });
    }

    const resp1 = await mainContestHistory.findOne({
      contestId: contestId,
      timeslotId: timeSlot,
    });

    if (resp1?.slotsFill.length >= contest.slots) {
      await session.abortTransaction();
      session.endSession();
      req.io
        .to(userSocketId)
        .emit("contest-noslot", { message: "No slots available" });
      return res
        .status(200)
        .json({ success: false, message: "No slots available" });
    }
 

    const wallet = await Wallet.findOne({ user: userId }).session(session);

    if (!wallet) {
      await session.abortTransaction();
      session.endSession();
      req.io
        .to(userSocketId)
        .emit("contest-error", { message: "Wallet not found" });
      return res
        .status(200)
        .json({ success: false, message: "Wallet not found" });
    }

    const entryFee = contest.entryAmount;
    const bonusprice = entryFee - contest.bonusCashPercentage / 100;
    const amount = entryFee - bonusprice;
    if (wallet.balance < amount && wallet.winningbalance < amount) {
      await session.abortTransaction();
      session.endSession();
      req.io.to(userSocketId).emit("contest-walletError", {
        message: "Insufficient balance to join the contest",
      });
      return res
        .status(200)
        .json({ success: false, message: "Insufficient balance" });
    }

    if (contest.type === "realCash") {
      if (contest.typeCashBonus === "use") {
        if (wallet.bonusAmount < bonusprice) {
          await session.abortTransaction();
          session.endSession();
          req.io.to(userSocketId).emit("contest-walletError", {
            message: "Insufficient Bonus Amount to join the contest",
          });
          return res.status(200).json({
            success: false,
            message: "Insufficient Bonus Amount to join the contest",
          });
        }

        if (wallet.balance >= amount) {
          wallet.balance -= amount;
          wallet.bonusAmount -= bonusprice;
        } else {
          wallet.winningbalance -= amount;
          wallet.bonusAmount -= bonusprice;
        }
        const resp1 = new TransactionHistory({
          user: userId,
          type: "debit",
          amount: entryFee,
          description: `${entryFee} debit from your wallet ${bonusprice} from you bonus Amount, ${amount} from Wallet for Join Contest`,
        });
        await resp1.save({ session });
      } else if (contest.typeCashBonus === "earn") {
        if (wallet.balance >= entryFee) {
          wallet.balance -= entryFee;
          wallet.bonusAmount += bonusprice;
        } else {
          wallet.winningbalance -= entryFee;
          wallet.bonusAmount += bonusprice;
        }
        const resp1 = new TransactionHistory({
          user: userId,
          type: "debit",
          amount: entryFee,
          description: `${entryFee} Amount  debit from your wallet, ${bonusprice} Amount added your Bonus Amount for Join Contest`,
        });
        await resp1.save({ session });
      } else if (contest.typeCashBonus === "none") {
        if (wallet.balance >= entryFee) {
          wallet.balance -= entryFee;
        } else {
          wallet.winningbalance -= entryFee;
        }
        const resp1 = new TransactionHistory({
          user: userId,
          type: "debit",
          amount: entryFee,
          description: `${entryFee} Amount  debit from your wallet for Join Contest`,
        });
        await resp1.save({ session });
      }
    } else if (contest.type === "realCash") {
      if (wallet.balance >= entryFee) {
        wallet.balance -= entryFee;
      } else {
        wallet.winningbalance -= entryFee;
      }
      const resp1 = new TransactionHistory({
        user: userId,
        type: "debit",
        amount: entryFee,
        description: `${entryFee} Amount  debit from your wallet for Join Contest`,
      });
      await resp1.save({ session });
    }
   
    await wallet.save({ session });

    await contest.save({ session });444



    const createUserContestDetails = new userMainContestDetail({
      contestId: contestId,
      userId: userId,
      timeslotId: timeSlot,
      winningAmount: 0,
      bids: [],
      totalAmount: 0,
    });

    await createUserContestDetails.save({ session });



    const contesthistory=await mainContestHistory.findOneAndUpdate(
      { contestId: contestId, timeslotId: timeSlot },
      {
        $addToSet: { slotsFill: userId },
        $inc: { actualPrizePool: entryFee || 0 },
        $setOnInsert: {
          contestId: contestId,
          timeslotId: timeSlot,
          companyProfit: 0,
          totalbid: 0,
          totalbidsAmount: 0,
        },
      },
      { new: true, upsert: true, session: session }
    );
    
   
    await session.commitTransaction();
   
  const data={
    ...contest.toObject(),
    timeSlots:timecheckObj.timeSlots[0],
    history: contesthistory,
  }
 
    req.io.emit(`single-Contest-${contest._id}`, data);
   
    return res
      .status(201)
      .json({ success: true, data: createUserContestDetails });

  } catch (error) {

    // await session.abortTransaction();

    req.io.to(userSocketId).emit("contest-error", {
      message: "An error occurred while joining the contest",
    });

    res
      .status(500)
      .json({ success: false, message: "Error joining contest", error });

  } finally {
    session.endSession();
  }
};

const bidding = async (req, res) => {
  const { contestId, timeSlot } = req.params;

  const userId = req.user._id;
  const { bidAmount } = req.body;

  const userSocketId = users[userId]?.toString();
  const session = await mongoose.startSession(); 
  session.startTransaction(); 
  const currentTime = new Date();

  try {

    if (!userSocketId) {
      console.error("User socket not found");
      return res
        .status(200)
        .json({ success: false, message: "User socket not found" });
    }

    const timecheckObj = await Contest.findOne(
      { _id: contestId, "timeSlots._id": timeSlot },
      { "timeSlots.$": 1 }
    ).session(session);


    if (currentTime > timecheckObj.timeSlots[0].endTime) {
      await session.abortTransaction();
      session.endSession();
      req.io
        .to(userSocketId)
        .emit("contest-error", { message: "Contest is already over" });
      return res
        .status(200)
        .json({ success: false, message: "Contest is already over" });
    } 

    const contest = await Contest.findById(contestId).session(session);
    const wallet = await Wallet.findOne({ user: userId }).session(session);

    function validateBid(bid) {
      if (bid < contest.bidRangeOfContest.minBidRange) {
          return res
          .status(200)
          .json({ success: false, message: `Bid too low! The minimum allowed bid is ${contest.bidRangeOfContest.minBidRange}.`}); 
      
      } else if (bid > contest.bidRangeOfContest.maxBidRange) {
          return res
          .status(200)
          .json({ success: false, message: `Bid too high! The maximum allowed bid is ${contest.bidRangeOfContest.maxBidRange}.` }); 
      } else {
        return res
        .status(200)
        .json({ success: false, message: `Bid accepted: ${bid}`});
      }
    }
    VOPM348

    validateBid(bidAmount)

    if(currentTime<timecheckObj.timeSlots[0].startTime){
      req.io
      .to(userSocketId)
      .emit("contest-error", { message: "Contest is not start yet" });
    return res
      .status(200)
      .json({ success: false, message: "Contest is not start yet" });
    }
  
    
    if (!contest) {
      await session.abortTransaction();
      session.endSession();
      req.io
        .to(userSocketId)
        .emit("contest-error", { message: "Contest not found" });
      return res
        .status(200)
        .json({ success: false, message: "Contest not found" });
    }

    const resp1 = await mainContestHistory.findOne({
      contestId: contestId,
      timeslotId: timeSlot,
    });

    if (resp1?.slotsFillCount >= contest.slots) {
      await session.abortTransaction();
      session.endSession();
      req.io
        .to(userSocketId)
        .emit("contest-noslot", { message: "No slots available" });
      return res
        .status(200)
        .json({ success: false, message: "No slots available" });
    }


    const entryFee = contest.entryAmount;
    const bonusprice = entryFee - contest.bonusCashPercentage / 100;
    const amount = entryFee - bonusprice;

    if (wallet.balance < amount && wallet.winningbalance < amount) {
      await session.abortTransaction();
      session.endSession();
      req.io.to(userSocketId).emit("contest-walletError", {
        message: "Insufficient balance to join the contest",
      });
      return res
        .status(200)
        .json({ success: false, message: "Insufficient balance" });
    }

    // console.log('wallet.balance',wallet.balance )
    // console.log('contest.type',contest.type)





    if (contest.type === "realCash") {
      if (contest.typeCashBonus === "use") {

        if (wallet.bonusAmount < bonusprice) {
          await session.abortTransaction();
          session.endSession();
          req.io.to(userSocketId).emit("contest-walletError", {
            message: "Insufficient Bonus Amount to join the contest",
          });
          return res.status(200).json({
            success: false,
            message: "Insufficient Bonus Amount to join the contest",
          });
        }

        if (wallet.balance >= amount) {
          wallet.balance -= amount;
          wallet.bonusAmount -= bonusprice;
        } else {
          wallet.winningbalance -= amount;
          wallet.bonusAmount -= bonusprice;
        }
        const resp1 = new TransactionHistory({
          user: userId,
          type: "debit",
          amount: entryFee,
          description: `${entryFee} debit from your wallet ${bonusprice} from you bonus Amount, ${amount} from Wallet for Join Contest`,
        });
        await resp1.save({ session });
      } else if (contest.typeCashBonus === "earn") {
        if (wallet.balance >= entryFee) {
          wallet.balance -= entryFee;
          wallet.bonusAmount += bonusprice;
        } else {
          wallet.winningbalance -= entryFee;
          wallet.bonusAmount += bonusprice;
        }
        const resp1 = new TransactionHistory({
          user: userId,
          type: "debit",
          amount: entryFee,
          description: `${entryFee} Amount  debit from your wallet, ${bonusprice} Amount added your Bonus Amount for Join Contest`,
        });
        await resp1.save({ session });
      } else if (contest.typeCashBonus === "none" || !contest?.typeCashBonus?.trim() ) {
        
        if (wallet.balance >= entryFee) {
          wallet.balance -= entryFee;
        } else {
          wallet.winningbalance -= entryFee;
        }


        // console.log('wallet.balance',wallet.balance )



        const resp1 = new TransactionHistory({
          user: userId,
          type: "debit",
          amount: entryFee,
          description: `${entryFee} Amount  debit from your wallet for Join Contest`,
        });
        await resp1.save({ session });
      }

    } 



    const userContestDetail = await userMainContestDetail
      .findOne({
        contestId: contestId,
        userId: userId,
        timeslotId: timeSlot,
      })
      .session(session);

   


      if(!userContestDetail){
        const createUserContestDetails = new userMainContestDetail({
          contestId: contestId,
          userId: userId,
          timeslotId: timeSlot,
          winningAmount: 0,
          bids: [
            {
              Amount: Number(bidAmount),           
              bidTimeDate: new Date(),
            }
          ],
          totalAmount: bidAmount,
        });

        const contesthistory=await mainContestHistory.findOneAndUpdate(
          { contestId: contestId, timeslotId: timeSlot },
          {
            $addToSet: { slotsFill: userId },
            $set: { slotsFillCount: 1},
            $inc: { actualPrizePool: entryFee || 0 },
            $setOnInsert: {
              contestId: contestId,
              timeslotId: timeSlot,
              companyProfit: 0,
              totalbid: 0,
              totalbidsAmount: 0,
            },
          },
          { new: true, upsert: true, session: session }
        );

        // await session.commitTransaction();
        await createUserContestDetails.save({ session });

        const data={
          ...contest.toObject(),
          timeSlots:timecheckObj.timeSlots[0],
          history: contesthistory,
        }
       
        req.io.emit(`single-Contest-${contest._id}`, data);
      }

      console.log('userContestDetail',userContestDetail)
      console.log('test-clear.......................',wallet.balance )

      if(userContestDetail?.bids?.map((el)=>el.Amount)?.includes(bidAmount)){
        await session.abortTransaction();
        session.endSession();
   
        return res
          .status(200)
          .json({ success: false, message: "Duplicate bids found. Please enter a unique number." }); 
      }
    
 

      const contesthistory = await mainContestHistory
        .findOne({ contestId: contestId, timeslotId: timeSlot })
        .session(session);

      const timecheck = await Contest.findOne(
        { _id: contestId, "timeSlots._id": timeSlot },
        { "timeSlots.$": 1 }
      ).session(session);



    // console.log(wallet,"Syedkemklfne")

    if (currentTime > timecheck.timeSlots[0].endTime) {
      await session.abortTransaction();
      session.endSession();
      req.io
        .to(userSocketId)
        .emit("contest-error", { message: "Contest is already over" });
      return res
        .status(200)
        .json({ success: false, message: "Contest is already over" });
    }


    if (!wallet) {
      await session.abortTransaction();
      session.endSession();
      req.io
        .to(userSocketId)
        .emit("walletError", { message: "Wallet not found" });
      return res
        .status(200)
        .json({ success: false, message: "Wallet not found" });
        
    }

    

    // if (!userContestDetail) {
    //   await session.abortTransaction();
    //   session.endSession();
    //   req.io
    //     .to(userSocketId)
    //     .emit("contest-error", { message: "User contest details not found" });
    //   return res
    //     .status(404) 
    //     .json({ success: false, message: "User contest details not found" });
    // }

    if (!contest) {
      await session.abortTransaction();
      session.endSession();
      req.io
        .to(userSocketId)
        .emit("contest-error", { message: "Private contest not found" });
      return res
        .status(404)
        .json({ success: false, message: "Private contest not found" });
    }

    if (wallet.balance < bidAmount && wallet.winningbalance < bidAmount) {
      await session.abortTransaction();

      session.endSession();
      req.io
        .to(userSocketId)
        .emit("walletError", {
          message: "Insufficient balance for bidding in contest",
        });
      return res
        .status(400)
        .json({ success: false, message: "Insufficient balance" });
    }

    if (userContestDetail?.bids?.length >= contest.upto) {
      await session.abortTransaction();
      session.endSession();
      req.io.to(userSocketId).emit("contest-error", {
        message: `Maximum bids reached (${contest.upto})`,
      });
      return res
        .status(400)
        .json({ success: false, message: `Maximum bids reached (${contest.upto})` });
    }

   

    if(userContestDetail){
      userContestDetail.bids.push({ Amount: bidAmount||0, bidTimeDate: new Date() });
      userContestDetail.totalAmount += contest.entryAmount||0;
      await userContestDetail.save({ session });
      contesthistory.totalbidsAmount += contest.entryAmount||0;
      contesthistory.slotsFillCount+=1
    }


    await contest.save({ session });
    await wallet.save({ session });
    const transaction = new TransactionHistory({
      user: userId,
      type: "debit",
      amount: contest.entryAmount,
      description: `contest-Bid ₹${contest.entryAmount} in  Contest`,
    });

    await transaction.save({ session });

    await session.commitTransaction();
    session.endSession();

    const [rankings, currentFill] = await calculatePlayerRankingTest(
      contestId,
      timeSlot,
      contest?.prizeDistribution,
      contest?.rankDistribution,
      {
        slotsFill:(contesthistory.slotsFillCount ),
        rankPercentage:contest.rankPercentage,
        platformFeePercentage:contest.platformFeePercentage,
        entryAmount:contest.entryAmount,
        prizeDistributionAmount:contest.prizeDistributionAmount
      }
    );
    
    contesthistory.userranks = rankings;
    contesthistory.currentFill = currentFill;



    await contesthistory.save();


    const data={
      ...contest.toObject(),
      timeSlots:timecheck.timeSlots[0],
      history: contesthistory,
    }

    req.io
      .to(userSocketId)
      .emit("contest-bidding", { message: "Bid successfully placed", contest });
    req.io.emit(`single-Contest-${contest._id}`, data);

    return res
      .status(200)
      .json({ success: true, message: "Bid successfully placed" });

  } catch (error) {
    // await session.abortTransaction();
    session.endSession();
    req.io
      .to(userSocketId)
      .emit("error", {
        message: "An error occurred while placing the bid",
        error,
      });
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error",error });
  }
};


const getuserContestDetails = async (req, res) => {
  const { contestId, timeslotId } = req.params;
  const {_id}=req.user;
  try {
    const response = await userMainContestDetail.findOne({
      userId: _id,
      contestId: contestId,
      timeslotId: timeslotId,
    });

    if (!response) {
      return res
        .status(200)
        .json({ success: false, message: "not joined contest" });
    }

    res.status(200).json({
      success: true,
      data: response,
    });
  } catch (err) {
    console.error("Error fetching contest:", err);
    res.status(500).json({ success: false, message: "Internal Server Error",err });
  }
};

const getsingleContest = async (req, res) => {
  const { contestId, timeslotId } = req.params;
  try {
    const contest = await Contest.findById(contestId).populate("subcategoryId");

    const contesthistory = await mainContestHistory.findOne({
      contestId: contestId,
      timeslotId: timeslotId,
    });

    if (!contest) {
      return res
        .status(200)
        .json({ success: false, message: "Contest not found" });
    }
    const currentTimeSlot = contest.timeSlots.find(
      (slot) => slot._id.toString() === timeslotId.toString()
    );
    if (!currentTimeSlot) {
      return res
        .status(404)
        .json({ success: false, message: "Timeslot not found in contest" });
    }

    console.log("contesthistory",contesthistory)

    res.status(200).json({
      success: true,
      data: {
        ...contest.toObject(),
        timeSlots: currentTimeSlot,
        history: contesthistory,
        currentFill:contesthistory?.currentFill,
        slotFillCount:contesthistory.userranks.length
      },
    });


  } catch (err) {
    console.error("Error fetching contest:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};


const calculateUserRankings = async (contestId, timeSlot) => {
  try {
  
    const userContestDetails = await userMainContestDetail.find({
      contestId: contestId,
      timeslotId: timeSlot,
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

const checkAndCompleteMainContests = async (io) => {
  try {
    const currentTime = new Date();
    const expiringContests = await Contest.aggregate([
      {
        $match: {
          "timeSlots.endTime": currentTime, 
        },
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
                  input: "$timeSlots",
                  as: "timeSlot",
                  cond: { $lt: ["$$timeSlot.endTime", currentTime] },
                },
              },
              -1, 
            ],
          },
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
    ]);

    io.emit("event",expiringContests);
   expiringContests.forEach(async(contest) => {
    
      const [rankings, currentFill] = await calculatePlayerRanking(
        contest._id,
        contest.timeSlot._id,
        contest?.prizeDistribution,
        contest?.rankDistribution,
        {
          slotsFill:(contest.slots),
          rankPercentage:contest.rankPercentage,
          platformFeePercentage:contest.platformFeePercentage,
          entryAmount:contest.entryAmount,
          prizeDistributionAmount:contest.prizeDistributionAmount
        }
      );

      const contesthistory = await mainContestHistory
      .findOne({ contestId: contest._id, timeslotId: contest.timeSlot._id });
    
  
      contesthistory.isComplete = true;
      contesthistory.userranks = rankings;
      // contesthistory.currentFill =currentFill

      await contesthistory.save();
      const topUsersByRank = getTopPercentRanks(
        finalRankings,
        contest.prizeDistributionPercentage
      );
      await distributePrizes(contest, topUsersByRank.length);
     
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

const distributePrizes = async (contest, uptoRank) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const contestDoc = await mainContestHistory
      .findById({ contestId: contest._id, timeslotId: contest.timeSlots })
      .lean()
      .session(session);
    const totalPrizePool = contestDoc.slotsFill.length * contest.entryAmount;
    const platformFeeAmount =
      totalPrizePool * (contest.platformFeePercentage / 100);
    // const resAmount=totalPrizePool-platformFeeAmount;
    // const topUsersByRank = contest.ranks.filter(rankGroup => rankGroup.rank <= uptoRank);
    // const totalRankedUsers = topUsersByRank.reduce((total, rankGroup) => total + rankGroup.users.length, 0);
    const {
      prizeDistributionPercentage,
      prizeDistributionAmount,
      rankDistribution
    } = contest;
    const { ranks } = contestDoc;
    const totalRanks = ranks.length;
    const prizeableRanksCount = Math.floor(
      (prizeDistributionPercentage / 100) * totalRanks
    );
    if (prizeableRanksCount === 0) {
      return "No ranks are eligible for prizes";
    }
    const prizeMap = rankDistribution.reduce((map, prize) => {
      const { rank, percentage } = prize;
    
      if (typeof rank === "number") {
        map[rank] = percentage;
      } else if (typeof rank === "string" && rank.includes("-")) {
        const [start, end] = rank.split("-").map(Number);
        for (let r = start; r <= end; r++) {
          map[r] = percentage;
        }
      }
      return map;
    }, {});

    const updatedRanks = ranks.map((rank) => {
      if (rank.rank <= prizeableRanksCount && prizeMap[rank.rank]) {
        const prizeAmountPercentage = prizeMap[rank.rank];
        const prizeAmount =
          (prizeAmountPercentage / 100) * prizeDistributionAmount;

        rank.users = rank.users.map(async (user) => {
          await userMainContestDetail
            .findOneAndUpdate(
              {
                userId: user.userId,
                contestId: contest._id,
                timeslotId: contest.timeSlots,
              },
              { $inc: { winningAmount: prizeAmount } },
              { new: true }
            )
            .session(session);

          const wallet = await Wallet.findOne({ user: user.userId }).session(
            session
          );
          wallet.winningbalance += prizeAmount;
          console.log("Helo ",prizeAmount)
          await wallet.save({ session });
          // sendSingleNotification(
          //   user.userId,
          //   `You have won ₹${prizeAmount}`, 
          //   `credit  ₹${prizeAmount} in your Winning Amount Wallet for winning Contest with rank ${rank.rank}`,
          // )
          const transaction = new TransactionHistory({
            user: user.userId,
            type: "credit",
            amount: prizeAmount,
            description: `credit  ₹${prizeAmount} in your Winning Amount Wallet for winning Contest with rank ${rank.rank}`,
          });

          await transaction.save({ session });
          return {
            ...user,
            winningAmount: prizeAmount,
          };
        });
      }
      return rank;
    });

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
        { contestId: contest._id, timeslotId: contest.timeSlots },
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

const mycontestMainCategory = async (userId) => {
  try {
    const response = await UserModel.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(userId) } },
      { $project: { _id: 0, contestnotify: 1 } },
      { $unwind: "$contestnotify" },
      {
        $lookup: {
          from: "sub-categories",
          localField: "contestnotify.subcategoryId",
          foreignField: "_id",
          as: "subcategory",
        },
      },
      { $unwind: "$subcategory" },

      {
        $lookup: {
          from: "timesheduleschemas",
          localField: "contestnotify.timeSlotId",
          foreignField: "_id",
          as: "timeSlot",
        },
      },
      { $unwind: "$timeSlot" },

      {
        $addFields: {
          currentTime: { $toDate: new Date() }, // Ensuring proper Date format
          contestStatus: {
            $switch: {
              branches: [
                {
                  case: { $gt: ["$timeSlot.startTime", "$$NOW"] },
                  then: "upcoming",
                },
                {
                  case: { $lt: ["$timeSlot.endTime", "$$NOW"] },
                  then: "wining",
                },
              ],
              default: "live",
            },
          },
        },
      },

      {
        $lookup: {
          from: "categories",
          localField: "subcategory.auctioncategory",
          foreignField: "_id",
          as: "categorie",
        },
      },
      { $unwind: "$categorie" },

      {
        $project: {
          startTime: "$timeSlot.startTime",
          endTime: "$timeSlot.endTime",
          title: "$categorie.title",
          categorieId: "$categorie._id",
          contestId: "$timeSlot._id",
          contestStatus: 1,
        },
      },
    ]);

    const response2 = await UserModel.aggregate(
      [
      { $match: { _id: new mongoose.Types.ObjectId(userId) } },
      { $project: { _id: 0, contestNotification: 1 } },
      { $unwind: "$contestNotification" },
      {
        $lookup: {
          from: "sub-categories",
          localField: "contestNotification.subcategoryId",
          foreignField: "_id",
          as: "subcategory",
        },
      },
      { $unwind: "$subcategory" },

      {
        $lookup: {
          from: "timesheduleschemas",
          localField: "contestNotification.timeSlotId",
          foreignField: "_id",
          as: "timeSlot",
        },
      },
      { $unwind: "$timeSlot" },

      {
        $addFields: {
          currentTime: { $toDate: new Date() }, // Ensuring proper Date format
          contestStatus: {
            $switch: {
              branches: [
                {
                  case: { $gt: ["$timeSlot.startTime", "$$NOW"] },
                  then: "upcoming",
                },
                {
                  case: { $lt: ["$timeSlot.endTime", "$$NOW"] },
                  then: "wining",
                },
              ],
              default: "live",
            },
          },
        },
      },

      {
        $lookup: {
          from: "categories",
          localField: "subcategory.auctioncategory",
          foreignField: "_id",
          as: "categorie",
        },
      },
      { $unwind: "$categorie" },

      {
        $project: {
          startTime: "$timeSlot.startTime",
          endTime: "$timeSlot.endTime",
          title: "$categorie.title",
          categorieId: "$categorie._id",
          contestId: "$timeSlot._id",
          contestStatus: 1,
        },
      },
    ]);

     const currentTime =  new Date()

    const contests1 = await userMainContestDetail.aggregate([
      // Match the user's contest details
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      // Lookup contest details
      {
        $lookup: {
          from: "categorycontests", // Replace with your contest collection name
          localField: "contestId",
          foreignField: "_id",
          as: "contestDetails",
        },
      },
      { $unwind: "$contestDetails" }, // Unwind to access contestDetails
      // Match contests by subcategory and categoryId
      {
        $lookup: {
          from: "sub-categories", // Replace with your subcategory collection name
          localField: "contestDetails.subcategoryId",
          pipeline: [
            {
              $lookup: {
                from: "categories", // Replace with your category collection name
                localField: "auctioncategory",
                foreignField: "_id",
                as: "categoryDetails",
              },
            },
          ],
          foreignField: "_id",
          as: "subcategoryDetails",  
        },
      },
      { $unwind: "$subcategoryDetails" }, // Unwind to access contestDetails
      { $unwind: "$subcategoryDetails.categoryDetails" }, // Unwind to access contestDetails
      {
         $addFields: {
           currentTime: currentTime,
        },
      },
 
      {
        $lookup: {
          from: "timesheduleschemas", // Replace with your contest collection name
          localField: "timeslotId",
          foreignField: "_id",
          as: "timeSlot",
        },
      },
      {
        $match: {
          contestDetails: { $ne: null, $not: { $size: 0 } },
          timeSlot: { $ne: null, $not: { $size: 0 } }
        }
      },
      { $unwind: { path: "$timeSlot", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          currentTime: { $toDate: new Date() }, // Ensuring proper Date format
          contestStatus: {
            $switch: {
              branches: [
                {
                  case: { $gt: ["$timeSlot.startTime", "$$NOW"] },
                  then: "upcoming",
                },
                {
                  case: { $lt: ["$timeSlot.endTime", "$$NOW"] },
                  then: "wining",
                },
              ],
              default: "live",
            },
          },
        },
      },
      {
        $project: {
          startTime: "$timeSlot.startTime",
          endTime: "$timeSlot.endTime",
          title: "$subcategoryDetails.categoryDetails.title",
          categorieId: "$subcategoryDetails.categoryDetails._id",
          contestId: "$timeSlot._id",
          contestStatus: 1,
        },
      },
    ]);

    // **Group contests by status**
    const categorizeContests = (contests) => {
      return contests.reduce(
        (acc, contest) => {
          const key = `${contest.title}-${contest.categorieId}-${contest.contestStatus}`;

          // Skip duplicates
          if (acc.keys.has(key)) {
            return acc;
          }

          acc.keys.add(key);
          acc[contest.contestStatus].push(contest);
          return acc;
        },
        { live: [], wining: [], upcoming: [], keys: new Set() }
      );
    };


    const categorized = categorizeContests(response.concat(response2).concat(contests1));
    return categorized;
  } catch (err) {
    console.error("Error fetching contests:", err);
    throw err;
  }
};



// const mycontestMainCategory = async (userId) => {
 
//   try {
     

//    const response = await UserModel.aggregate([
//     {
//       $match:{
//         _id:new mongoose.Types.ObjectId(userId)
//       }
//     },
//     {
//       $project:{
//         _id:0,
//         contestnotify:1
//       }
//     },
//     {
//     $unwind:"$contestnotify"  
//     },
//     {
//       $lookup: {
//         from: "sub-categories",  // The collection you're joining with
//         localField: "contestnotify.subcategoryId",  // The field in the current collection
//         foreignField: "_id",  // The field in the `privatecontests` collection to join with
//         as: "subcategory"  // The alias for the resulting array of joined documents
//       }
//     },
//     {
//       $lookup: {
//         from: "timesheduleschemas",  // The collection you're joining with
//         localField: "contestnotify.timeSlotId",  // The field in the current collection
//         foreignField: "_id",  // The field in the `privatecontests` collection to join with
//         as: "timeSlot2"  // The alias for the resulting array of joined documents
//       }
//     },
//     {
//       $addFields: {
//         currentTime: {
//           $dateToString: {
//             format: "%Y-%m-%d %H:%M:%S", // Define the date format
//             date: new Date(), // Current date and time
//             timezone: "Asia/Kolkata", // Set timezone to IST (Indian Standard Time)
//           },
//         },
//         contestStatus: {
//           $reduce: {
//             input: {
//               $map: {
//                 input: "$timeSlot2", // Iterate over each timeSlot
//                 as: "slot",
//                 in: {
//                   $cond: {
//                     if: {
//                       $and: [
//                         { $lte: ["$$slot.startTime", "$currentTime"] }, // Check if the start time is before or equal to current time
//                         { $gte: ["$$slot.endTime", "$currentTime"] },   // Check if the end time is after or equal to current time
//                       ],
//                     },
//                     then: "live", // If the time slot is live
//                     else: {
//                       $cond: {
//                         if: { $gte: ["$currentTime", "$$slot.endTime"] }, // If the current time is after the slot's end time
//                         then: "wining", // If the contest has ended
//                         else: "upcoming", // If the contest is upcoming
//                       },
//                     },
//                   },
//                 },
//               },
//             },
//             initialValue: [], // Start with an empty array
//             in: {
//               $cond: {
//                 if: { $in: ["$$this", "$$value"] }, // Check if the current status is already in the accumulated array
//                 then: "$$value", // If it already exists, keep the array as it is
//                 else: { $concatArrays: ["$$value", ["$$this"]] }, // Otherwise, add the current status to the array
//               },
//             },
//           },
//         },
//       },
//     },
//     {$unwind:"$contestStatus"},
//     {
//       $project:{
//         subcategory:1,
//         timeSlot:1,
//         contestStatus:1
//       }
//     },
//     {$unwind:"$subcategory"},
//     {$unwind:"$timeSlot"},
//     {
//       $lookup: {
//         from: "categories",  // The collection you're joining with
//         localField: "subcategory.auctioncategory",  // The field in the current collection
//         foreignField: "_id",  // The field in the `privatecontests` collection to join with
//         as: "categorie"  // The alias for the resulting array of joined documents
//       }
//     },
//     {$unwind:"$categorie"},
//     {
//       $project:{
//         startTime:"$timeSlot.startTime",
//         endTime:"$timeSlot.endTime",
//         title:"$categorie.title",
//         categorieId:"$categorie._id",
//         contestId:"$timeSlot._id",
//         contestStatus:"$contestStatus"
//       }
//     },
//   ]);




//   const categorizeContests = (contests) => {
//     return contests.reduce(
//         (acc, contest) => {
      
//             const key = `${contest.title}-${contest.categorieId}-${contest.contestStatus}`;

        
//             // Skip duplicates
//             if (acc.keys.has(key)) {
//                 return acc;
//             }

//             // Determine the category
//             if (contest.contestStatus=="upcoming") {
//                 acc.upcoming.push(contest);
//             } else if (contest.contestStatus=="wining") {
//                 acc.winning.push(contest);
//             } else {
//                 acc.live.push(contest);
//             }

//             // Mark this key as processed
//             acc.keys.add(key);
//             return acc;
//         },
//         { live: [], winning: [], upcoming: [], keys: new Set() } // Initialize with empty arrays and a Set for keys
//     );
// };




//       const categorized = await categorizeContests(response);
//       return categorized;




//   } catch (err) {
//     console.error("Error fetching contests:", err);
//     throw err;
//   }
// };

const mycontestBycategoryId = async (userId, categoryId,categoryStatus) => {
  try {
    const currentTime = new Date();

    // Aggregation pipeline
    const contests1 = await userMainContestDetail.aggregate([
      // Match the user's contest details
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      // Lookup contest details
      {
        $lookup: {
          from: "categorycontests", // Replace with your contest collection name
          localField: "contestId",
          foreignField: "_id",
          as: "contestDetails",
        },
      },
      { $unwind: "$contestDetails" }, // Unwind to access contestDetails
      // Match contests by subcategory and categoryId
      {
        $lookup: {
          from: "sub-categories", // Replace with your subcategory collection name
          localField: "contestDetails.subcategoryId",
          foreignField: "_id",
          pipeline: [
            {
              $lookup: {
                from: "categories", // Replace with your category collection name
                localField: "auctioncategory",
                foreignField: "_id",
                as: "categoryDetails",
              },
            },
            {
              $match: {
                "categoryDetails._id": new mongoose.Types.ObjectId(categoryId),
              },
            },
          ],
          as: "subcategoryDetails",
        },
      },
      { $unwind: "$subcategoryDetails" }, // Unwind to access contestDetails
      { $unwind: "$subcategoryDetails.categoryDetails" }, // Unwind to access contestDetails
      {
        $addFields: {
          currentTime: currentTime,
        },
      },
      {
        $lookup: {
          from: "categorycontests", // Replace with your contest collection name
          localField: "contestId",
          foreignField: "_id",
          as: "contestDetails",
        },
      },
      {
        $lookup: {
          from: "timesheduleschemas", // Replace with your contest collection name
          localField: "timeslotId",
          foreignField: "_id",
          as: "timeSlot",
        },
      },
      {
        $match: {
          contestDetails: { $ne: null, $not: { $size: 0 } },
          timeSlot: { $ne: null, $not: { $size: 0 } },
        },
      },
      { $unwind: { path: "$timeSlot", preserveNullAndEmptyArrays: true } },
      {
        $unwind: { path: "$contestDetails", preserveNullAndEmptyArrays: true },
      },
      {
        $addFields: {
          currentTime: { $toDate: new Date() }, // Ensuring proper Date format
          contestStatus: {
            $switch: {
              branches: [
                {
                  case: { $gt: ["$timeSlot.startTime", "$$NOW"] },
                  then: "upcoming",
                },
                {
                  case: { $lt: ["$timeSlot.endTime", "$$NOW"] },
                  then: "wining",
                },
              ],
              default: "live",
            },
          },
        },
      },
      {
        $match: {
          contestStatus: categoryStatus,
        },
      },
      {
        $lookup: {
          from: "contesthistories",
          localField: "timeSlot._id",
          foreignField: "timeslotId",
          as: "contestCount",
        },
      },
      { $unwind: "$contestCount" },
      
      {
        $group: {
          _id: "$subcategoryDetails._id",
          category: { $first: "$subcategoryDetails" },
          contestStatus: { $first: "$contestStatus" },
          contests: {
            $push: {
              entryAmount: { $ifNull: ["$contestDetails.entryAmount", 0] },
              state: "$contestDetails.state",
              isBotActive: "$contestDetails.isBotActive",
              slots: "$contestDetails.slots",
              upto: "$contestDetails.upto",
              totalAmount: "$contestDetails.totalAmount",
              type: "$contestDetails.type",
              typeCashBonus: "$contestDetails.typeCashBonus",
              bonusCashPercentage: "$contestDetails.bonusCashPercentage",
              bonusCashAmount: "$contestDetails.bonusCashAmount",
              favoriteCount: "$contestDetails.favoriteCount",
              platformFeePercentage: "$contestDetails.platformFeePercentage",
              platformFeeAmount: "$contestDetails.platformFeeAmount",
              prizeDistributionPercentage:
                "$contestDetails.prizeDistributionPercentage",
              prizeDistributionAmount:
                "$contestDetails.prizeDistributionAmount",
              rankDistribution: "$contestDetails.rankDistribution",
              prizeDistribution: "$contestDetails.prizeDistribution",
              rankCount: "$contestDetails.rankCount",
              rankPercentage: "$contestDetails.rankPercentage",
              startDateTime: "$contestDetails.startDateTime",
              endDateTime: "$contestDetails.endDateTime",
              _id: "$contestDetails._id",
              slotsContestFillInfo: {
                $size: "$contestCount.userranks",
              },
              timeSlots: "$timeSlot",
           
              // currentFillInfo: {
              //   $arrayElemAt: ["$contest.currentFillInfo", 0]
              // },
            },
          },
        },
      },
    ]);
    
    const contests = await UserModel.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(userId) } },
      { $project: { _id: 0, contestnotify: 1 } },
      { $unwind: "$contestnotify" },
      {
        $lookup: {
          from: "sub-categories",
          localField: "contestnotify.subcategoryId",
          foreignField: "_id",
          as: "subcategory",
        },
      },
      { $unwind: "$subcategory" },

      {
        $lookup: {
          from: "timesheduleschemas",
          localField: "contestnotify.timeSlotId",
          foreignField: "_id",
          as: "timeSlot",
        },
      },
      { $unwind: { path: "$timeSlot", preserveNullAndEmptyArrays: true } },

      {
        $addFields: {
          currentTime: { $toDate: new Date() }, // Ensuring proper Date format
          contestStatus: {
            $switch: {
              branches: [
                {
                  case: { $gt: ["$timeSlot.startTime", "$$NOW"] },
                  then: "upcoming",
                },
                {
                  case: { $lt: ["$timeSlot.endTime", "$$NOW"] },
                  then: "wining",
                },
              ],
              default: "live",
            },
          },
        },
      },
      {
        $match: {
          contestStatus: categoryStatus,
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "subcategory.auctioncategory",
          foreignField: "_id",
          as: "categorie",
        },
      },
      { $unwind: "$categorie" },
      {
        $match: {
          "categorie._id": new mongoose.Types.ObjectId(categoryId), // Match by the subcategory ID in contests
        },
      },
      {
        $lookup: {
          from: "categorycontests",
          localField: "contestnotify.contestId",
          foreignField: "_id",
          as: "contest",
        },
      },
      { $unwind: "$contest" },
      {
        $lookup: {
          from: "contesthistories",
          localField: "timeSlot._id",
          foreignField: "timeslotId",
          as: "contestCount",
        },
      },
      { $unwind: "$contestCount" },

      {
        $group: {
          _id: "$subcategory._id",
          category: { $first: "$subcategory" },
          contestStatus: { $first: "$contestStatus" },
          contests: {
            $push: {
              entryAmount: { $ifNull: ["$contest.entryAmount", 0] },
              state: "$contest.state",
              isBotActive: "$contest.isBotActive",
              slots: "$contest.slots",
              upto: "$contest.upto",
              totalAmount: "$contest.totalAmount",
              type: "$contest.type",
              typeCashBonus: "$contest.typeCashBonus",
              bonusCashPercentage: "$contest.bonusCashPercentage",
              bonusCashAmount: "$contest.bonusCashAmount",
              favoriteCount: "$contest.favoriteCount",
              platformFeePercentage: "$contest.platformFeePercentage",
              platformFeeAmount: "$contest.platformFeeAmount",
              prizeDistributionPercentage:
                "$contest.prizeDistributionPercentage",
              prizeDistributionAmount: "$contest.prizeDistributionAmount",
              rankDistribution: "$contest.rankDistribution",
              prizeDistribution: "$contest.prizeDistribution",
              rankCount: "$contest.rankCount",
              rankPercentage: "$contest.rankPercentage",
              startDateTime: "$contest.startDateTime",
              endDateTime: "$contest.endDateTime",
              _id: "$contest._id",
              slotsContestFillInfo: {
                $size: "$contestCount.userranks",
              },
              timeSlots: "$timeSlot",
              favorite: {
                $size: "$contestCount.favorite",
              },
              // currentFillInfo: {
              //   $arrayElemAt: ["$contest.currentFillInfo", 0]
              // },
            },
          },
        },
      },

      // {
      //   $group:{
      //     _id:"$subcategory._id",
      //     category:{$first:"$subcategory"},
      //     // sortByEntryAmount: { $first: "$entryAmount" }, // Capture smallest or largest entryAmount for sorting groups
      //     // sortBywiningPercentage: { $first: "$rankPercentage" },
      //     // sortBySlotSize:{ $first: "$slots" },
      //     // sortByPrizePoll:{$first:"$prizeDistributionAmount"},
      //     // contestType:{$first:"$type"},
      //     contests: {
      //       $push: {
      //         entryAmount: "$contest.entryAmount",
      //         state:"$contest.state",
      //         isBotActive:"$contest.isBotActive",
      //         slots: "$contest.slots",
      //         // isUserBookMarked: "$contest.isUserBookMarked",
      //         // isNotificationActive: "$contest.isNotificationActive",
      //         upto: "$contest.upto",
      //         totalAmount: "$contest.totalAmount",
      //         type: "$type",
      //         typeCashBonus: "$contest.typeCashBonus",
      //         bonusCashPercentage: "$contest.bonusCashPercentage",
      //         bonusCashAmount: "$contest.bonusCashAmount",
      //         favoriteCount:"$contest.favoriteCount",
      //         // Exclude subcategoryId here if you don’t need it
      //         platformFeePercentage: "$contest.platformFeePercentage",
      //         platformFeeAmount: "$contest.platformFeeAmount",
      //         prizeDistributionPercentage: "$contest.prizeDistributionPercentage",
      //         prizeDistributionAmount: "$contest.prizeDistributionAmount",
      //         rankDistribution: "$contest.rankDistribution",
      //         prizeDistribution: "$contest.prizeDistribution",
      //         rankCount: "$contest.rankCount",
      //         rankPercentage: "$contest.rankPercentage",
      //         startDateTime: "$contest.startDateTime",
      //         endDateTime: "$contest.endDateTime",
      //         _id:"$contest._id",
      //         slotsContestFillInfo: { $arrayElemAt: ["$contest.slotsContestFillInfo", 0] }, // First element of slotsContestFillInfo
      //         timeSlots:"$timeSlot",
      //         // isUserJoinContest:"$contest.isUserJoinContest",
      //         currentFillInfo: { $arrayElemAt: ["$contest.currentFillInfo", 0] },

      // },
      //     }
      //   }
      // },
    ]);

const matchedId = new Set(); // Using Set for faster lookups
// Merge contests by id
contests.forEach((el) => {
  const finded = contests1.find((el2) => el2._id.toString() === el._id.toString());
  if (finded) {
    matchedId.add(finded._id.toString()); // Store matched IDs in Set
    el.contests = el.contests ? [...el.contests, ...finded.contests] : [...finded.contests];
  }
});
// Filter contests1 to get only unmatched contests
const unmatchedContests = contests1.filter((el) => !matchedId.has(el._id.toString()));
// Merge contests with unmatched contests
const margeContest = [...contests, ...unmatchedContests];




    const liveContests = margeContest.filter((c) => c?.contestStatus === "live") || [];
    const expiredContests = margeContest.filter((c) => c?.contestStatus === "wining") || [];
    const upcomingContests = margeContest.filter((c) => c?.contestStatus === "upcoming") || [];

    console.log( { liveContests, expiredContests, upcomingContests })
    return { liveContests, expiredContests, upcomingContests };
  } catch (error) {
    console.error("Error fetching contests:", error);
    throw error;
  }
};






// const mycontestBycategoryId = async (userId, categoryId) => {
//   try {

//     const userData = await UserModel.findById(userId).select("contestnotify");

//     // Extract contest IDs
//     const ids = userData.contestnotify.map((el) => el.contestId);
  
//     // Fetch user contest details with nested population
//     const userContestDetails = await userMainContestDetail.find({ userId })
//     .populate({
//       path: "contestId",
//       match: { _id: { $in: ids }, _id: { $ne: null } }, // Ensure _id is in the list and not null
//       populate: {
//         path: "subcategoryId",
//         populate: {
//           path: "auctioncategory",
//           match: { _id: categoryId }, // Ensure _id is in the list and not null
//         },
//       },
//     });

//     //console.log('ids',userContestDetails)

//     const now = new Date();

//     const liveContests = [];
//     const expiredContests = [];
//     const upcomingContest=[]

//     for (const detail of userContestDetails) {
//       const contest = detail.contestId.toObject();

//       const currentTimeslot = await timeSheduleSchema.findById(detail.timeslotId.toString());

//       if (currentTimeslot) {
      
//         contest.timeSlots = currentTimeslot;
//         if (currentTimeslot.startTime <= now && currentTimeslot.endTime >= now) {
//           liveContests.push(contest); 
//         } else if (currentTimeslot.endTime < now) {
//           expiredContests.push(contest);
//         }
//       } else {
//         expiredContests.push(contest);
//       }
//     }

//  return {
//    liveContests,
//    expiredContests,
//    upcomingContest,
//  };

//   } catch (error) {
//     console.error("Error fetching contests:", error);
//     throw error;
//   }
// };


const LikemainContest=async(req,res)=>{
  const { contestId, timeSlotId,subcategoryId } = req.params;

  console.log( contestId, timeSlotId,subcategoryId )

  const userId = req.user._id;

  if(!userId) return;

  if (!contestId || !subcategoryId||!timeSlotId) {
    return res.status(400).json({ message: "contestId and timeSlotId are required" });
  }

  try {
    const user = await UserModel.findById(userId);
    const contest = await contestModel.findById(contestId)   

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const existingNotificationIndex = user.contestnotify.findIndex(
      (notify) =>
        notify.contestId.toString() === contestId && notify.subcategoryId.toString() === subcategoryId
    );

    if(!contest?.favorite){
      contest.favorite=[]
    }

    const existingUserFavorite = contest?.favorite?.findIndex((el)=>el?.toString()===user._id);
     

    if(existingNotificationIndex == -1) { 
      user.contestnotify.push({ contestId, timeSlotId,subcategoryId });
      contest?.favorite?.push(user._id);
      await user.save();
      await contest.save()
      return res.status(200).json({success:true, message: "Contest saved successFully",  });
    }


    if (existingNotificationIndex !== -1) {
      user.contestnotify.splice(existingNotificationIndex, 1);
      contest?.favorite.splice(existingUserFavorite, 1);
      await user.save();
      await contest.save()
      return res.status(200).json({success:true, message: "Contest remove successFully",  });
    }


    



  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "An error occurred", error });
  }
}


const MyBids = async (req, res) => {
  const { contestId, timeSlotId } = req.params;
  const userId = req.user._id;
  if(!userId) return;
  if (!contestId || !timeSlotId) {
    return res
      .status(400)
      .json({ message: "contestId and timeSlotId are required" });
  } 

  try {
    const response = await contesthistory.findOne({
      contestId: contestId,
      timeslotId: timeSlotId,
    }).populate('contestId');



    function assignRankLabel (bid,rank1bidNo) {
      const lastRank = response.contestId.rankDistribution?.at(-1)?.rank
      // rank 1 
      if(bid.rank===1&&bid.duplicateCount===1){//ok
        return "Highest and Unique"; 
        // case  winner top and uniq only for rank 1
      }  else if(bid.rank>1&& bid.rank>lastRank&& bid.duplicateCount!==1&&bid.bid>rank1bidNo){ //ok 
        return "Highest but not Unique " ;
       }
      else if(bid.rank<=lastRank&&bid.duplicateCount===1&&bid.bid<rank1bidNo){//ok
        return "Unique but not Highest (Winning)"
        // case : compare in number sequnace and uniq and wining range 
        // if bid in below rank 1 bid number  in winning range and uniq  then it would be
      } else if(bid.rank>1&& bid.rank<=lastRank&& bid.duplicateCount!==1&&bid.bid>rank1bidNo){ //ok 
        return "Highest but not Unique (Winning)";
     }
      else if(bid.rank<=lastRank&&bid.duplicateCount!==1&&bid.bid<rank1bidNo){// ok
          return "Neither Highest nor Unique (Winning)";
     // case : compare in number sequnace and duplicate and wining range 
    // if bid in below rank 1 bid number and duplicate and within the range
      } else if(bid.rank>lastRank&&bid.duplicateCount===1&&bid.bid<rank1bidNo){ // ok 
        return "Unique but not Highest"
        //case: compare in rank sequnace  
    // below rank 1 bid number and uniq 
      } 
      else{
          return "Neither Highest nor Unique"
      }
    }

    if (!response)
      return res
        .status(404)
        .json({ success: false, message: "Bids Not Found" });
    return res.status(200).json({ success: true, data:      
      response.userranks.filter((el)=>el.userId.toString()===userId).map((el)=>{
      return {
        bidStatus:assignRankLabel(el,response.userranks[0].bid),
        bid:el.bid,
        biddingTime:el.biddingTime
      }
    })
      
      });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "An error occurred", error });
  }
};



const totalBidder = async (req, res) => {
  const { contestId, timeSlotId } = req.params;

  if (!contestId || !timeSlotId) {
    return res.status(400).json({
      success: false,
      message: "contestId and timeSlotId are required",
    });
  }

  try {

    const response = await userMainContestDetail.aggregate([
      {
        $match: {
          contestId: new mongoose.Types.ObjectId(contestId),
          timeslotId: new mongoose.Types.ObjectId(timeSlotId),
          totalAmount: { $gt: 0 },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      { $unwind: "$userDetails" },
      {
        $addFields: {
          bidsCount: { $size: "$bids" },
        },
      },
      {
        $project: {
          _id: 0,
          userId: "$userDetails._id",
          name: "$userDetails.name",
          image: "$userDetails.image",
          totalBidAmount: "$totalAmount",
          bidsCount: 1,
        },
      },
    ]);


    res.status(200).json({ success: true, data: response });
  } catch (error) {
    console.error("Error fetching total bidders:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching total bidders",
      error: error,
    });
  }
};



const winingUser = async (contestId, timeslotId, userId) => {
  try {
    const ranking = await contesthistory
      .findOne({ contestId, timeslotId })
      .populate([
        {
          path: "contestId",
          select: "rankDistribution subcategoryId bidRangeOfContest upto decimalRange",
          populate: {
            path: "subcategoryId",
            select: "name",
            model: "sub-category",
          },
        },
        {
          path: "timeslotId",
        },
        {
          path: "userranks.userId",
          select: "name email _id",
          model: "User",
        },
      ])

    if (!ranking) {
      throw new Error("Ranking data not found");
    }

    // Reduce in a single loop to extract winningUsers and userCount
    let winningUsers = [];
    let userCount = 0;

    for (const el of ranking.userranks || []) {
      if (el.rank === 1) {
        winningUsers.push(el.userId);
      }
      if (el.userId?._id?.toString() === userId.toString()) {
        userCount++;
      }
    }

    console.log("Successs......")
    return {
      contestInfo: {
        title: ranking.contestId.subcategoryId?.name || "Unknown",
        firstPrize: ranking.contestId.rankDistribution?.[0]?.amount || 0,
      },
      decimalRange: ranking.contestId?.decimalRange,
      currentWiningUsers: winningUsers,
      bidRange: {
        max: ranking.contestId.bidRangeOfContest?.maxBidRange || 0,
        min: ranking.contestId.bidRangeOfContest?.minBidRange || 0,
      },
      upto: (ranking?.contestId?.upto || 0) - userCount,
      cuurenttimeSlots: ranking.timeslotId,

      lastThreeDayBidReview: {
        topFiveAmountWinner: [],
        topFiveWinningBid: [],
        topFiveUniqBid: [],
        topFiveCrowdedBid: [],
      },

      // Uncomment when aggregation is required again
      // lastThreeDayBidReview: {
      //   topFiveAmountWinner: filterBidFunction(
      //     [...response].sort((a, b) => b.winingRange - a.winingRange).slice(0, 5)
      //   ),
      //   topFiveWinningBid: filterBidFunction(
      //     [...response].sort((a, b) => b.topRankCount - a.topRankCount).slice(0, 5)
      //   ),
      //   topFiveUniqBid: filterBidFunction(
      //     [...response].sort((a, b) => a.duplicateCount - b.duplicateCount).slice(0, 5)
      //   ),
      //   topFiveCrowdedBid: filterBidFunction(
      //     [...response].sort((a, b) => b.totalBid - a.totalBid).slice(0, 5)
      //   ),
      // },
    };
  } catch (err) {
    console.error(err);
    throw err;
  }
};




// const winingUser=async(contestId,timeslotId)=>{
// try{
//   console.log({
//     contestId,
//     timeslotId
//   })

//   const ranking = await contesthistory.findOne({contestId,timeslotId})
//   .populate(
//     {
//       path:"contestId",
//       populate: {
//         path: 'subcategoryId',    // Assuming Subcategory has a reference to Category
//         model: 'sub-category' // Specify the model to populate
//       }
//     }
//   )
//   ;
//   const userId=ranking?.userranks?.reduce((crr,el)=>{
//     if( el.rank==1){
//       crr.push(el.userId)
//     }
//     return crr
//   },[])

//   const response = await UserModel.find({
//     _id: { $in: userId }
//   }).select('name')

//   console.log(ranking.contestId.rankDistribution[0].amount)

//   const userCount = await userMainContestDetail.countDocuments({contestId,timeslotId})   
//   const cuurentTimeSlot = await timeSheduleSchema.findOne({_id:timeslotId,contestId})

  
//   return {
//     contestInfo:{
//       title:ranking.contestId.subcategoryId.name,
//       firstPrize:ranking.contestId.rankDistribution[0].amount
//     },
//     currentWiningUsers:response,
//     bidRange:{max:ranking.contestId.bidRangeOfContest.maxBidRange,min:ranking.contestId.bidRangeOfContest.minBidRange},
//     upto:ranking.contestId.upto-userCount,
//     cuurenttimeSlots:cuurentTimeSlot
//   }
// }catch(err){
//   console.error(err);
//   throw err
// }
// }


const ActiveNotificationAlert=async(req,res)=>{
  const { contestId, subcategoryId } = req.params;

  const userId = req.user._id;
  if(!userId) return;

  if (!contestId || !subcategoryId) {
    return res.status(400).json({ message: "contestId and timeSlotId are required" });
  }

  try {
    const user = await UserModel.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const existingNotificationIndex = user.contestNotification.findIndex(
      (notify) =>
        notify.contestId.toString() === contestId && notify.subcategoryId.toString() === subcategoryId
    );

    if (existingNotificationIndex !== -1) {
      user.contestNotification.splice(existingNotificationIndex, 1);
      await user.save();

      return res.status(200).json({success:true, message: "Notification close successFully",  });
    } else {
      console.log(existingNotificationIndex,'existingNotificationIndex',user,contestId, subcategoryId)
      user.contestNotification.push({ contestId, subcategoryId });
      await user.save();

      return res.status(200).json({success:true, message: "Notification activated successFully",  });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "An error occurred", error });
  }
}

const getALlTopWinner = async (req,res)=>{
  try{
    const response = await contesthistory.find().skip(9320)
    return res.status(200).json({success:true,data:response });
  }catch (error){
    return res.status(500).json({success:false, message: "An error occurred", error });
  }
}

module.exports = {
  getUpcomingContest,
  getLiveContest,
  getWinningContest,
  getSubcategoriesWithContests,
  maincontestJoin,
  bidding,
  checkAndCompleteMainContests,
  mycontestMainCategory,
  LikemainContest,
  mycontestBycategoryId,
  getsingleContest,
  getuserContestDetails,
  MyBids,
  totalBidder,
  winingUser,
  ActiveNotificationAlert,
  getALlTopWinner
};








