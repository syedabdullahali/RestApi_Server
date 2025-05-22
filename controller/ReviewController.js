const ReviewContest = require("../model/admin/ReviewPContestSchema");
const PrivateContest = require("../model/privatecontest");
//get all review contests
const getAllReviewContests = async (req, res) => {
  try {
    const reviews = await ReviewContest.find({ activeStatus: "review" });

    if (!reviews || reviews.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No review contests found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Review contests fetched successfully",
      data: reviews,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

//get review by pagination
const getPaginationReviewContests = async (req, res) => {
  try {
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);

    const skip = (page - 1) * limit; // Calculate the number of items to skip

    // const reviews = await ReviewContest.find({ activeStatus: "review" })
    const reviews = await ReviewContest.find().skip(skip).limit(limit);

    if (!reviews || reviews.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No review contests found",
      });
    }

    // Get the total number of contests for pagination info
    const totalReviewContests = await ReviewContest.countDocuments();

    const data = {
      success: true,
      data: reviews,
    };

    console.log(page, limit, data, "from review");
    res.status(200).json({
      page,
      totalPages: Math.ceil(totalReviewContests / limit),
      totalReviewContests,
      message: "Review contests fetched successfully",
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//approve a  private contest
const approveContest = async (req, res) => {
  try {
    const { contestId } = req.params;

    // Find the contest in the ReviewContest collection
    const reviewContest = await ReviewContest.findById(contestId);

    if (!reviewContest) {
      return res.status(404).json({
        success: false,
        message: "Review contest not found",
      });
    }

    // Remove the contest from the ReviewContest collection
    await ReviewContest.findByIdAndDelete(contestId);

    // Update the contest status in the PrivateContest collection to "approved"
    const updatedPrivateContest = await PrivateContest.findByIdAndUpdate(
      contestId,
      { activeStatus: "approved" },
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

//review private contest
const rejectContest = async (req, res) => {
  try {
    const { contestId } = req.params;

    // Find the contest in the review collection
    const reviewContest = await ReviewContest.findById(contestId);

    if (!reviewContest) {
      return res.status(404).json({
        success: false,
        message: "Review contest not found",
      });
    }

    // Update the contest in the ReviewContest collection to status "rejected"
    const updatedReviewContest = await ReviewContest.findByIdAndUpdate(
      contestId,
      { activeStatus: "rejected" },
      { new: true }
    );

    // Add or update the contest in the PrivateContest collection with status "rejected"
    // const privateContestData = {
    //   ...reviewContest.toObject(),
    //   activeStatus: "rejected",
    // };
    const privateContest = await PrivateContest.findByIdAndUpdate(
      contestId,
      { activeStatus: "rejected" },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Contest rejected successfully",
      data: { updatedReviewContest, privateContest },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getAllReviewContests,
  getPaginationReviewContests,
  approveContest,
  rejectContest,
};
