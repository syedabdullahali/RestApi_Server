const express = require("express");
const {
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
} = require("../controller/categoryContestController");

const {
  getLiveContest,
  getUpcomingContest,
  getWinningContest,
  getSubcategoriesWithContests,
  maincontestJoin,
  bidding,checkAndCompleteMainContests,
  LikemainContest,
  getsingleContest,
  getuserContestDetails,
  MyBids,
  totalBidder,
  ActiveNotificationAlert,
  getALlTopWinner
} = require("../controller/upcomingLiveWinningController");


const {getExpiredContestsForUser}=require("../sockethelper/mainContest")
const router = express.Router();
const auth = require('../middleware/authenticateToken')

router.post("/cat/create", createContest);
router.get("/cat/all", getContests);

router.get("/cat/type", getContestByType);
router.get("/cat/single/:id", GetById);
router.delete("/cat/del/:id", Delete);
router.put("/cat/update/:id", updateContest);

//pagination
router.get("/cat", getContestsByPagination);
router.get("/cat/type/p", getContestByTypePagination);  

//upcoming,live, winning contest with pagination
router.get("/upcoming", getUpcomingContest);
router.get("/live", getLiveContest);
router.get("/winning", getWinningContest);

router.get("/:id/sub", getSubcategoriesWithContests);

router.get("/user/epired/contest",getExpiredContestsForUser)


router.post("/join/contest/:contestId/:timeSlot",auth.authenticateToken,maincontestJoin);
router.post("/contest/bid/:contestId/:timeSlot",auth.authenticateToken,bidding);
router.post("/final",auth.authenticateToken,checkAndCompleteMainContests);

router.put("/save/main/contest/:contestId/:subcategoryId/:timeSlotId",auth.authenticateToken,LikemainContest);
router.put("/notificationAlert/main/contest/:contestId/:subcategoryId",auth.authenticateToken,ActiveNotificationAlert);

router.get("/get/single/contest/:contestId/:timeslotId",getsingleContest);
router.get("/check/user/already/join/:contestId/:timeslotId" ,auth.authenticateToken, getuserContestDetails);


router.get("/contest/user/bids/:contestId/:timeSlotId",auth.authenticateToken,MyBids);
router.get("/contest/bidders/:contestId/:timeSlotId",totalBidder);
router.get("/top-winner",auth.authenticateToken,getALlTopWinner);
router.get("/timeslot/:id",auth.authenticateToken,getAllTimeSlotList)
router.get("/rankcard",auth.authenticateToken,getAllTimeSlotFirstRankWinner)


module.exports = router;
