const express = require("express");
const router = express.Router();
const {
  Register,
  updateUser,
  Login,
  getSingleUserBYADmin,
  LoginVerify,
  getallUser,
  updateUserByAdmin,
  Delete_user_Id,
  getUserPagination,
  getUserProfile,
  walletWithdraw,
  walletAdd,
  getUserWallet,
  getTransactionHistory,
  TdsGstHistory,
  getUserDashbordDetailToApp,
  HandleFollowing
} = require("../controller/userController");

const isAut = require("../middleware/authenticateToken");

// for user
router.post("/create", Register);
router.put("/update", isAut.authenticateToken, updateUser);

router.post("/login", Login);
router.post("/login/verify", LoginVerify);
router.get("/profile", isAut.authenticateToken, getUserProfile);

router.get("/single/:id", getSingleUserBYADmin);
router.get("/all", getallUser);

router.put("/:id", updateUserByAdmin);
router.delete("/:id", Delete_user_Id);
router.get("/", getUserPagination);

router.post("/wallet/add", isAut.authenticateToken, walletAdd);
router.post("/wallet/withdraw", isAut.authenticateToken, walletWithdraw);
router.get("/wallet", isAut.authenticateToken, getUserWallet);
router.get("/transaction/history", isAut.authenticateToken, getTransactionHistory);

router.get("/tds/history", isAut.authenticateToken, TdsGstHistory)

router.get("/dashbord", isAut.authenticateToken, getUserDashbordDetailToApp);
router.get("/dashbord/:id", isAut.authenticateToken, getUserDashbordDetailToApp);
router.patch("/following/:id", isAut.authenticateToken, HandleFollowing);


module.exports = router;
