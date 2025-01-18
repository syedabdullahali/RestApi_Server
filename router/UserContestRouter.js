const express = require("express");
const router = express.Router();
const isUser = require("../middleware/authenticateToken");

const {
  creatContestTimeSlotDetails,
  updateContestTimeSlotDetails,
  getAllTimeSlotContest,
  joinContest,
  placeBid,
  getContestHistory,
  getUserContestDetails
} = require("../controller/UserContestController");

router.post("/", creatContestTimeSlotDetails);
router.put("/:timeSlotId", isUser.authenticateToken, updateContestTimeSlotDetails);
router.get("/", getAllTimeSlotContest);
router.post("/join/contest",joinContest);
router.get("/cotesthistory/:contestId/:timeslotId",getContestHistory);
router.get("/user/contesthistory/:contestId/:timeslotId/:userId",isUser.authenticateToken,getUserContestDetails)
router.post("/bidding",placeBid);


module.exports = router;
