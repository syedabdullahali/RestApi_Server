const express = require("express");
const router = express.Router();
const {
  updatePContest,
  Delete_PContest_Id,
  getSetting,
  updatesetting,
  createSetting,
  getallPContest,
  getsinglePContest,
  createPcontets,
  getPContestpagination,
  approvePrivateContest,
  rejectPrivateContest,
  joinPrivateContest,
  getSettingToApp,
  sendPrivateContestCalculation,
  MyBids,
  MyBidder,
  getPriveiteContestByStatus
} = require("../controller/PrivatecontestCotroller");

const isAut = require("../middleware/authenticateToken");
const {joinContest,bidding,getSingleUserPrivateContestDetails, getPrivateContestData}=require("../sockethelper/privateContest")
router.post("/create",isAut.authenticateToken, createPcontets);
router.put("/update/:id",isAut.authenticateToken, updatePContest);
router.delete("/del/:id", Delete_PContest_Id);
router.get("/all", getallPContest);
router.get("/single/:id",isAut.authenticateToken, getsinglePContest);

//private contest setting
router.post("/setting/create", createSetting);
router.get("/setting", getSetting);
router.get("/setting_to_app", getSettingToApp);
router.put("/setting/update/:id", updatesetting);

//review
// Approve a review contest
router.post("/approve/:contestId", approvePrivateContest);

// Reject a review contest
router.post("/reject/:contestId", rejectPrivateContest);

//pagination
router.get("/", getPContestpagination);

router.post("/join/contest/:contestId",isAut.authenticateToken,joinContest);
router.post("/rankDistribution",isAut.authenticateToken,sendPrivateContestCalculation)
router.post("/bidding/:contestId",isAut.authenticateToken,bidding);
router.get("/contest/userdetail/:contestId",isAut.authenticateToken,getSingleUserPrivateContestDetails);
router.post("/join-influencer/contest/:joiningCode",isAut.authenticateToken,joinPrivateContest)
router.get("/biddingList/:contestId",isAut.authenticateToken,MyBids);
router.get("/bidderList/:contestId",isAut.authenticateToken,MyBidder);
router.get("/admin",isAut.authenticateToken,getPriveiteContestByStatus);



module.exports = router;
