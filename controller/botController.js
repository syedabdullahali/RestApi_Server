const User = require("../model/user/user");

const createBot = async (req, res, next) => {
  try {
    const response = new User(req.body);
    await response.save();
    res.status(201).json({
      success: true,
      data: response,
      message: "Bot created",
    });
  } catch (error) {
    next(error);
  }
};

const getAllBots = async (req, res, next) => {
  try {
    const type = req.query.type;
    const contests = await User.find({ type: type });
    res.status(200).json(contests);
  } catch (error) {
    next(error);
  }
};

const getBotsByPagination = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1; // Default to page 1 if not provided
    const limit = parseInt(req.query.limit) || 10; // Default to 10 contests per page if not provided

    const skip = (page - 1) * limit; // Calculate the number of items to skip

    const type = req.query.type;

    // Get contests with pagination
    const bots = await User.find({ type: type }).skip(skip).limit(limit);

    // Get the total number of bots for pagination info
    const totalBots = await User.countDocuments();

    const data = {
      success: true,
      data: bots,
    };

    res.status(200).json({
      page,
      totalPages: Math.ceil(totalBots / limit),
      totalBots,
      data,
    });
  } catch (error) {
    next(error);
  }
};

const GetBotById = async (req, res, next) => {
  try {
    const response = await User.findById(req.params.id);
    if (!response)
      return res.status(404).json({ success: false, message: "Bot not found" });
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

const updateBot = async (req, res, next) => {
  try {
    const response = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!response)
      return res.status(404).json({ success: false, message: "Bot not found" });
    res
      .status(200)
      .json({ success: true, data: response, message: "Bot Updated" });
  } catch (error) {
    next(error);
  }
};

const deleteBot = async (req, res, next) => {
  try {
    const response = await User.findByIdAndDelete(req.params.id);

    // console.log("bots>>>>", req.params.id, response);
    if (!response)
      return res.status(404).json({ success: false, message: "bot not found" });
    res
      .status(200)
      .json({ success: true, message: "Bot` deleted successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createBot,
  getAllBots,
  getBotsByPagination,
  GetBotById,
  updateBot,
  deleteBot,
};
