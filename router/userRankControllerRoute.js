const express = require("express");
const router = express.Router();
const userRankSettingController = require("../controller/userControllerRoute");

router.post("/create-or-update", userRankSettingController.createOrUpdateUserRankSetting);
router.get("/", userRankSettingController.getUserRankSetting);

module.exports = router;
