const referalModel = require("../model/referalController");

const getReferalController = async (req, res) => {
  try {
    const response = await referalModel.findOne();
    res.status(200).json({
      success: true,
      data: response,
      message: "SuccesFully Fetched",
    });
  } catch (error) {
    res.status(500).json({
      success: true,
      data: error,
      message: "Semething went wrong....",
    });
  }
};

const createReferalController = async (req, res) => {
  const { referalType, amount, amountDistributionPercentage } = req.body;
  try {
    const response = await referalModel.findOne();

    if (!response) {
      const tempDoc = new referalModel({
        referalType,
        amount,
        amountDistributionPercentage,
      });
       await tempDoc.save();
    }else{
        response.referalType = referalType 
        response.amount = amount
        response.amountDistributionPercentage = amountDistributionPercentage
        await response.save()
    }
    res.status(200).json({
      success: true,
      data: response,
      message: "Succesfully Created",
    });
  } catch (error) {
    console.log(error)
    res.status(500).json({
      success: true,
      data: error,
      message: "Semething went wrong....",
    });
  }
};

module.exports = { getReferalController,createReferalController};
