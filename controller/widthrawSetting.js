const widthrawSetting = require("../model/widthrawSetting");

const getWitdthrawController = async (req, res) => {
  try {
    const response = await widthrawSetting.findOne();
    res.status(200).json({
      success: true,
      data: response,
      message: "SuccesFully Fetched",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      data: error,
      message: "Semething went wrong....",
    });
  }
};

const createWitdthrawController = async (req, res) => {
  try {
    const responseWidthraw = await widthrawSetting.findOne();
    let response = {};
    if (!responseWidthraw) {
      const tempDoc = new widthrawSetting(req.body);
      response = await tempDoc.save();
    } else {
      responseWidthraw.minimumWidthraw = req.body.minimumWidthraw;
      response = await responseWidthraw.save();
    }
    res.status(200).json({
      success: true,
      data: response,
      message: "Succesfully Created",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      data: error,
      message: "Semething went wrong....",
    });
  }
};


module.exports = { getWitdthrawController,createWitdthrawController};
