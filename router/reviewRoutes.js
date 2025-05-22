const express = require("express");

const {
  getAllReviewContests,
  getPaginationReviewContests,
  approveContest,
  rejectContest,
} = require("../controller/ReviewController");

const router = express.Router();

// 1. Get all review contests
router.get("/all", getAllReviewContests);
router.get("/", getPaginationReviewContests);

// 2. Approve a review contest
router.post("/approve/:contestId", approveContest);

// 3. Reject a review contest
router.post("/reject/:contestId", rejectContest);

module.exports = router;
