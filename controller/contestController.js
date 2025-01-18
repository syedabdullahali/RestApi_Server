const Contest = require("../model/contestModel");

// Create a new contest
exports.createContest = async (req, res, next) => {
  try {
    // Temporarily removed validation
    const contest = new Contest(req.body);
    await contest.save();
    res.status(201).json(contest);
  } catch (error) {
    next(error);
  }
};

// Get all contests
exports.getContests = async (req, res, next) => {
  try {
    const contests = await Contest.find();
    res.status(200).json(contests);
  } catch (error) {
    next(error);
  }
};

exports.getContestsPagination = async (req, res, next) => {
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

// Get a contest by ID
exports.getContestById = async (req, res, next) => {
  try {
    const contest = await Contest.findById(req.params.id);
    if (!contest) return res.status(404).json({ message: "Contest not found" });
    res.status(200).json(contest);
  } catch (error) {
    next(error);
  }
};

// Update a contest by ID
exports.updateContest = async (req, res, next) => {
  try {
    
    // Temporarily removed validation
    const contest = await Contest.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    // if (!contest) return res.status(404).json({ message: "Contest not found" });
    res.status(200).json(contest);
  } catch (error) {
    next(error);
  }
};

// Delete a contest by ID
exports.deleteContest = async (req, res, next) => {
  try {
    const contest = await Contest.findByIdAndDelete(req.params.id);
    if (!contest) return res.status(404).json({ message: "Contest not found" });
    res.status(200).json({ message: "Contest deleted successfully" });
  } catch (error) {
    next(error);
  }
};

//funtion for Live,upcoming  and expired contest
const classifyContests = async () => {
  const now = new Date();
  const contests = await Contest.find();
  // console.log("contest data>>",contests);
  const upcoming = [];
  const ongoing = [];
  const expired = [];

  const bulkOperations = [];

  contests.forEach((contest) => {
    if (contest.endDateTime < now && !contest.isExpire) {
      expired.push(contest);
      bulkOperations.push({
        updateOne: {
          filter: { _id: contest._id },
          update: { $set: { isExpire: true } },
        },
      });
    } else if (contest.startDateTime > now) {
      upcoming.push(contest);
    } else {
      ongoing.push(contest);
    }
  });

  // Step 2: Bulk update expired contests for better performance
  if (bulkOperations.length > 0) {
    await Contest.bulkWrite(bulkOperations);
  }

  return { upcoming, ongoing, expired };
};

exports.getTypeContests = async (req, res) => {
  try {
    const categorizedContests = await classifyContests();
    res.json(categorizedContests);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch contests" });
  }
};

//every 1 min will call this funtion
const checkAndUpdateContests = () => {
  setInterval(async () => {
    try {
      const categorizedContests = await classifyContests();
      // console.log("Updated contests:", categorizedContests);
    } catch (err) {
      console.error("Error updating contests:", err);
    }
  }, 60000);
};
checkAndUpdateContests();
