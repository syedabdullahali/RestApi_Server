const mongoose = require("mongoose");
const Contest = require("../model/contestModel");
const ContestHistory=require("../model/contesthistory")
const timeSheduleSchema = require('../model/contestTimeSheduleList')
//assigning single contest for whole day
const dayWiseContest = async (req, res) => {

  // console.log("Hello World")
  const session = await mongoose.startSession();
  try{
   session.startTransaction();

  const contestId = req.params.id;
  const contest = await Contest.findById(contestId).populate({
    path: "subcategoryId", // Populate subcategoryId
    populate: {
      path: "auctioncategory", // Populate auctioncategory inside subcategory
      model: "category", // Specify the model for auctioncategory
    },
  }).session(session); // Attach session
  
  if (contest.timeSlots && contest.timeSlots.length > 0) {
    return res.status(200).json(contest);
  }

  if (!contest) {
    res.status(404).json({ message: "Contest is not Present" });
  }

  // Extract category duration
  const duration = contest.subcategoryId.auctioncategory.duration; // e.g., "40 minutes"

  if (!duration) {
    res.status(404).json({ message: "Duration is present" });
  }

  const [timeValue, timeUnit] = (duration ?? "").split(" ");

  let timeMultiplier;

  // Determine the time multiplier based on the unit (minutes, hours)
  if (timeUnit === "minutes" || timeUnit === "minute") {
    timeMultiplier = 60 * 1000; // 1 minute = 60,000 ms
  } else if (timeUnit === "hours" || timeUnit === "hour") {
    timeMultiplier = 60 * 60 * 1000; // 1 hour = 3,600,000 ms
  } else {
    return res.status(400).json({ message: "Unsupported time unit" });
  }

  const startOfDay = new Date();
    // const startOfDay = contest.timeSlots.at(0).startTime;

  // startOfDay.setDate(contest.timeSlots.at(0).startTime)

  startOfDay.setHours(0, 0, 0, 0);
  const dayContests = [];
  let currentStartTime = new Date(startOfDay);

  // console.log(startOfDay.toLocaleDateString(),contest.timeSlots.at(0).startTime.toUTCString())

  while (currentStartTime.getDate() === startOfDay.getDate()) {
    const endTime = new Date(
      currentStartTime.getTime() + timeValue * timeMultiplier
    ); // Add duration in minutes
    dayContests.push({
      startTime: currentStartTime,
      endTime: endTime,
      contestId
    });

    // Update currentStartTime for next contest
    currentStartTime = new Date(endTime);
  }

  dayContests.at(-1)
  // Add timeSlots to contest
  contest.startDateTime = startOfDay;
  contest.endDateTime =   dayContests.at(-1).endTime
    const insertedTimeSlots = await timeSheduleSchema.insertMany(dayContests, { session });

    contest.timeSlots = insertedTimeSlots.map((el) => ({
      startTime: el.startTime,
      endTime: el.endTime,
      status: el.status,
      _id: el._id,
    }));


    // Map through inserted timeSlots to create ContestHistory documents
    const contestHistories = insertedTimeSlots.map((timeSlot) => ({
      contestId,
      timeslotId: timeSlot._id,
      companyProfit: 0,
      actualPrizePool: 0,
      totalbid: 0,
      totalbidsAmount: 0,
      slotsFill: [],
      ranks: [],
      isComplete: false,
    }));

    // Insert ContestHistory documents
    await ContestHistory.insertMany(contestHistories, { session });
    await contest.save({ session }); // Use session

    await session.commitTransaction(); // Commit the transaction
    session.endSession();

  res.status(200).json(contest);
}catch (error){
  await session.abortTransaction(); // Roll back changes on error
  session.endSession();

  res.status(500).json(error)
}
};

// Reschedule a specific time slot or stop it from running
const resheduleAndStop = async (req, res) => {
  const contestId = req.params.id;
  const slotId = req.params.slotId;
  const { startTime, action } = req.body; // Expecting startTime, endTime, and action

  try {
    const contest = await Contest.findById(contestId).populate({
      path: "subcategoryId", // Populate subcategoryId
      populate: {
        path: "auctioncategory", // Populate auctioncategory inside subcategory
        model: "category", // Specify the model for auctioncategory
      },
    });

     await timeSheduleSchema.findOneAndUpdate(
      { contestId, _id: slotId }, // Query criteria
      { status:action }, // Update data
      { new: true } // Options (e.g., return the updated document)
    );

    // Check if contest exists
    if (!contest) {
      return res.status(404).json({ message: "Contest not found" });
    }

    // Extract category duration
    const duration = contest.subcategoryId.auctioncategory.duration; // e.g., "40 minutes"

    // Find the time slot to update
    const timeSlot = contest.timeSlots.find(
      (slot) => slot._id.toString() === slotId
    );

    // console.log(timeSlot, slotId, contest);
    // Check if the time slot exists
    if (!timeSlot) {
      return res.status(404).json({ message: "Time slot not found" });
    }

    const [timeValue, timeUnit] = duration.split(" ");

    let timeMultiplier;

    let currentStartTime = new Date(startTime);

    // Determine the time multiplier based on the unit (minutes, hours)
    if (timeUnit === "minutes" || timeUnit === "minute") {
      timeMultiplier = 60 * 1000; // 1 minute = 60,000 ms
    } else if (timeUnit === "hours" || timeUnit === "hour") {
      timeMultiplier = 60 * 60 * 1000; // 1 hour = 3,600,000 ms
    } else {
      return res.status(400).json({ message: "Unsupported time unit" });
    }

    if (action === "reschedule") {
      // Update the time slot with new start and end times
      timeSlot.startTime = new Date(startTime);
      timeSlot.endTime = new Date(
        currentStartTime.getTime() + timeValue * timeMultiplier
      );
    } else if (action === "stop") {
      // Mark the time slot as stopped
      timeSlot.status = "stopped";
    } else if (action === "active") {
      // Mark the time slot as stopped
      timeSlot.status = "active";
    }

    timeSlot._id = new mongoose.Types.ObjectId();
    await contest.save(); // Save the updated contest
    res.status(200).json(contest);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

const rescheduleContest = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction(); // Start a transaction
    const contestId = req.params.id;
    const { newDate } = req.body; // New date in 'YYYY-MM-DD' format

    // Fetch the contest
    const contest = await Contest.findById(contestId)
    .populate({
      path: "subcategoryId", // Populate subcategoryId
      populate: {
        path: "auctioncategory", // Populate auctioncategory inside subcategory
        model: "category", // Specify the model for auctioncategory
      },
    })
    .session(session);
    if (!contest) {
      return res.status(404).json({ success:false,message: "Contest not found" });
    }

    // Parse the new date
    const targetDate = new Date(newDate);
    if (isNaN(targetDate)) {
      return res.status(400).json({ success:false,message: "Invalid date format provided" });
    }
    // console.log(contest)

    // Fetch the duration
    const duration = contest?.subcategoryId?.auctioncategory?.duration; // e.g., "40 minutes"
    if (!duration) {
      return res.status(400).json({ success:false, message: "Contest duration is missing" });
    }

    // Parse duration (e.g., "40 minutes")
    const [timeValue, timeUnit] = duration.split(" ");
    let timeMultiplier;
    if (timeUnit.toLowerCase().startsWith("minute")) {
      timeMultiplier = 60 * 1000; // 1 minute = 60,000 ms
    } else if (timeUnit.toLowerCase().startsWith("hour")) {
      timeMultiplier = 60 * 60 * 1000; // 1 hour = 3,600,000 ms
    } else {
      return res.status(400).json({ success:false, message: "Unsupported time unit in duration" });
    }

    // Set the start of the day for the new date
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    console.log(startOfDay.toLocaleDateString())
    
    const dayContests = [];
    let currentStartTime = new Date(startOfDay);
    
    // Generate time slots for the day
    while (currentStartTime.getDate() === startOfDay.getDate()) {
      const endTime = new Date(currentStartTime.getTime() + timeValue * timeMultiplier);
    
      dayContests.push({
        startTime: currentStartTime,
        endTime,
        contestId,
      });
    
      currentStartTime = new Date(endTime); // Update for the next slot
    }
    
    // Fetch existing time slots for the contest
    const existingStartTimes = await timeSheduleSchema.find(
      {
        contestId, // Match only for the same contest
        startTime: { $in: dayContests.map((slot) => slot.startTime) },
      },
      { startTime: 1, _id: 0 } // Fetch only startTime for comparison
    );
    
    // Create a Set of existing startTime values for fast lookups
    const existingStartTimesSet = new Set(
      existingStartTimes.map((slot) => slot.startTime.toISOString())
    );
    
    // Filter out slots that already exist
    const newTimeSlots = dayContests.filter(
      (slot) => !existingStartTimesSet.has(slot.startTime.toISOString())
    );
    
    if (newTimeSlots.length === 0) {
      return res
        .status(400)
        .json({success:false, message: "All time slots already exist. No new slots created." });
    }
    
    // Insert the new time slots
    const insertedTimeSlots = await timeSheduleSchema.insertMany(dayContests, { session });

    // Update contest's timeSlots
    contest.timeSlots = insertedTimeSlots.map((el) => ({
      startTime: el.startTime,
      endTime: el.endTime,
      status: el.status,
      _id: el._id,
    }));

    // Update contest start and end times
    contest.startDateTime = startOfDay;
    contest.endDateTime = dayContests.at(-1).endTime;

    // Create ContestHistory documents
    const contestHistories = insertedTimeSlots.map((timeSlot) => ({
      contestId,
      timeslotId: timeSlot._id,
      companyProfit: 0,
      actualPrizePool: 0,
      totalbid: 0,
      totalbidsAmount: 0,
      slotsFill: [],
      ranks: [],
      isComplete: false,
    }));

    await ContestHistory.insertMany(contestHistories, { session });

    // Save contest with session
    await contest.save({ session });

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({success:true, message: "Contest rescheduled successfully", contest });
  } catch (error) {
    console.error("Error in rescheduling contest:", error);
    await session.abortTransaction(); // Abort the transaction in case of an error
    session.endSession();
    res.status(500).json({
      message: "An error occurred while rescheduling the contest",
      error,
    });
  }
};


//
// const rescheduleContest = async (req, res) => {

//   const session = await mongoose.startSession();
//   try{
//    session.startTransaction();
//     const contestId = req.params.id;
//     const { newDate } = req.body; // Expecting newDate in the format: 'YYYY-MM-DD'
//     const contest = await Contest.findById(contestId).session(session);

//     if (!contest) {
//       return res.status(404).json({ message: "Contest not found" });
//     }
//     const targetDate = new Date(newDate);
//     if (isNaN(targetDate)) {
//       return res.status(400).json({ message: "Invalid date provided" });
//     }

//     // // Reschedule all time slots to the new date
//     // contest.timeSlots.forEach(async(timeSlot, index) => {
//     //   // Check if the status is not 'stopped'
//     //   if (timeSlot.status !== "stopped") {
//     //     timeSlot._id = new mongoose.Types.ObjectId();
//     //     const oldStartTime = new Date(timeSlot.startTime);
//     //     const oldEndTime = new Date(timeSlot.endTime);

//     //     // Create new date objects with updated date but keep time intact
//     //     timeSlot.startTime = new Date(
//     //       targetDate.getFullYear(),
//     //       targetDate.getMonth(),
//     //       targetDate.getDate(),
//     //       oldStartTime.getHours(),
//     //       oldStartTime.getMinutes(),
//     //       oldStartTime.getSeconds()
//     //     );


//     //     if (index === contest.timeSlots.length - 1) {
//     //       timeSlot.endTime = new Date(
//     //         targetDate.getFullYear(),
//     //         targetDate.getMonth(),
//     //         targetDate.getDate() + 1, // Move to the next day
//     //         oldEndTime.getHours(),
//     //         oldEndTime.getMinutes(),
//     //         oldEndTime.getSeconds()

//     //       );
//     //     } else {
//     //       // For other time slots, keep the original endTime date
//     //       timeSlot.endTime = new Date(
//     //         targetDate.getFullYear(),
//     //         targetDate.getMonth(),
//     //         targetDate.getDate(),
//     //         oldEndTime.getHours(),
//     //         oldEndTime.getMinutes(),
//     //         oldEndTime.getSeconds()
//     //       );
//     //     }

//     //     let contestHistory = await ContestHistory.findOne({
//     //       contestId,
//     //       timeslotId: timeSlot._id
//     //     });
        
//     //     if (!contestHistory) {
//     //       contestHistory = new ContestHistory({
//     //         contestId,
//     //         timeslotId: timeSlot._id,
//     //         companyProfit: 0,
//     //         actualPrizePool: 0,
//     //         totalbid: 0,
//     //         totalbidsAmount: 0,
//     //         slotsFill: [],
//     //         ranks: [],
//     //         isComplete: false
//     //       });
//     //       await contestHistory.save();
//     //     }
//     //   }
//     // });
//     const duration = contest.subcategoryId.auctioncategory.duration; // e.g., "40 minutes"

//     if (!duration) {
//       res.status(404).json({ message: "Duration is present" });
//     }
  
//     const [timeValue, timeUnit] = (duration ?? "").split(" ");
  
//     let timeMultiplier;
  
//     // Determine the time multiplier based on the unit (minutes, hours)
//     if (timeUnit === "minutes" || timeUnit === "minute") {
//       timeMultiplier = 60 * 1000; // 1 minute = 60,000 ms
//     } else if (timeUnit === "hours" || timeUnit === "hour") {
//       timeMultiplier = 60 * 60 * 1000; // 1 hour = 3,600,000 ms
//     } else {
//       return res.status(400).json({ message: "Unsupported time unit" });
//     }
  
//     const startOfDay = new Date();
//       // const startOfDay = contest.timeSlots.at(0).startTime;
  
//     // startOfDay.setDate(contest.timeSlots.at(0).startTime)
  
//     startOfDay.setHours(0, 0, 0, 0);
//     const dayContests = [];
//     let currentStartTime = new Date(startOfDay);
  
//     // console.log(startOfDay.toLocaleDateString(),contest.timeSlots.at(0).startTime.toUTCString())
  
//     while (currentStartTime.getDate() === startOfDay.getDate()) {
//       const endTime = new Date(
//         currentStartTime.getTime() + timeValue * timeMultiplier
//       ); // Add duration in minutes
//       dayContests.push({
//         startTime: currentStartTime,
//         endTime: endTime,
//         contestId
//       });
  
//       // Update currentStartTime for next contest
//       currentStartTime = new Date(endTime);
//     }
  
//     dayContests.at(-1)
//     // Add timeSlots to contest
//     contest.startDateTime = startOfDay;
//     contest.endDateTime =   dayContests.at(-1).endTime
//       const insertedTimeSlots = await timeSheduleSchema.insertMany(dayContests, { session });
  
//       contest.timeSlots = insertedTimeSlots.map((el) => ({
//         startTime: el.startTime,
//         endTime: el.endTime,
//         status: el.status,
//         _id: el._id,
//       }));
  
  
//       // Map through inserted timeSlots to create ContestHistory documents
//       const contestHistories = insertedTimeSlots.map((timeSlot) => ({
//         contestId,
//         timeslotId: timeSlot._id,
//         companyProfit: 0,
//         actualPrizePool: 0,
//         totalbid: 0,
//         totalbidsAmount: 0,
//         slotsFill: [],
//         ranks: [],
//         isComplete: false,
//       }));
  
//       // Insert ContestHistory documents
//       await ContestHistory.insertMany(contestHistories, { session });
//       await contest.save({ session }); // Use session
  
//       await session.commitTransaction(); // Commit the transaction
//       session.endSession();
  
//     res.status(200).json(contest);

//     res.status(200)
//       .json({ message: "Contest rescheduled successfully", contest });
//   } catch (error) {
//     console.error("Error in rescheduling contest:", error);
//     res
//       .status(500)
//       .json({ message: "An error occurred while rescheduling the contest",error });
//   }
// };

const getAllScheduleDates = async (req,res)=>{
try{

const response = await timeSheduleSchema.aggregate([
  {
    $match: {
      contestId: new mongoose.Types.ObjectId(req.params.id), // Match contestId
    },
  },
  {
    $group: {
      _id: {
        $dateToString: {
          format: "%Y-%m-%d",
          date: "$startTime",
          timezone: "Asia/Kolkata", // Set your desired time zone
        },
      },
    },
  },
  {
    $sort: { _id: 1 }, // Sort dates in ascending order
  },
  {
    $project: {
      _id: 0,         // Exclude default _id
      date: "$_id", // Rename grouped field
    },
  },
])

// console.log(req.params.date)

const targetDate = new Date((req.params.date!=="no-date")?req.params.date:response[0].date); // Ensure format: YYYY-MM-DD

// Reset targetDate times to avoid unintended changes
const startOfDay = new Date(targetDate);
startOfDay.setHours(0, 0, 0, 0); // Start of the day

const endOfDay = new Date(targetDate);
endOfDay.setHours(23, 59, 59, 999); // End of the day

const response2 = await timeSheduleSchema.aggregate([
  {
    $match: {
      contestId: new mongoose.Types.ObjectId(req.params.id),
      startTime: {
        $gte: startOfDay, // Match from start of the day
        $lte: endOfDay    // Match until the end of the day
      }
    },
  },
  
]);

response2.map((el)=>{
  console.log(new Date(el.startTime).toDateString())
})

  return res.status(200).json({
    dateList:response,
    data:response2,
    selectedDate:req.params.date!=="no-date"?req.params.date:response[0].date
  });
}catch (error){
  return res.status(500).json(error)
}
}

module.exports = { dayWiseContest, resheduleAndStop, rescheduleContest,
getAllScheduleDates };


