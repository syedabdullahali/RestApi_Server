const UserRankSetting = require("../model/user/userRankController");

// ✅ Create or Update User Rank Setting
exports.createOrUpdateUserRankSetting = async (req, res) => {
  try {
    const { maximumCollectionLimit, isCollectionLimit, maximumDaysObservation,userLimit } = req.body;

    let setting = await UserRankSetting.findOne();
    
    if (setting) {
      // Update existing setting
      setting.maximumCollectionLimit = maximumCollectionLimit || setting.maximumCollectionLimit;
      setting.isCollectionLimit = isCollectionLimit || setting.isCollectionLimit;
      setting.maximumDaysObservation = maximumDaysObservation || setting.maximumDaysObservation;
      setting.userLimit = userLimit || setting.userLimit;

      await setting.save();
      res.status(200).json({ success: true, message: "User rank setting updated", data: setting });
    } else {
      // Create new setting
      setting = new UserRankSetting({ maximumCollectionLimit, isCollectionLimit, maximumDaysObservation,userLimit });
      await setting.save();
      res.status(201).json({ success: true, message: "User rank setting created", data: setting });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: "Error saving user rank setting", error });
  }
};

// ✅ Get User Rank Setting
exports.getUserRankSetting = async (req, res) => {
  try {
    const setting = await UserRankSetting.findOne();
    if (!setting) {
      return res.status(404).json({ success: false, message: "No user rank setting found" });
    }
    res.status(200).json({ success: true, data: setting });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching user rank setting", error });
  }
};
