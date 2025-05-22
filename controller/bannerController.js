const Banner = require("../model/admin/BannerSchema");

// Add a new banner
exports.addBanner = async (req, res, next) => {
  try {
    const banner = new Banner({ imageUrl: req.body.imageUrl });
    await banner.save();
    res
      .status(201)
      .json({ data: banner, message: "Banner added successfully" });
  } catch (error) {
    next(error);
  }
};

// Get all banners
exports.getBanners = async (req, res, next) => {
  try {
    const banners = await Banner.find();
    res.status(200).json(banners);
  } catch (error) {
    next(error);
  }
};

exports.getBannersPagination = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1; // Default to page 1 if not provided
    const limit = parseInt(req.query.limit) || 10; // Default to 10 contests per page if not provided

    const skip = (page - 1) * limit; // Calculate the number of items to skip

    // Get Banner with pagination
    const banners = await Banner.find().skip(skip).limit(limit);
    // res.status(200).json(banners);

    // Get the total number of Banner for pagination info
    const totalBanners = await Banner.countDocuments();

    const data = {
      success: true,
      data: banners,
    };

    res.status(200).json({
      page,
      totalPages: Math.ceil(totalBanners / limit),
      totalBanners,
      data,
    });
  } catch (error) {
    next(error);
  }
};

// Update a banner by ID
exports.updateBanner = async (req, res, next) => {
  try {
    const banner = await Banner.findByIdAndUpdate(
      req.params.id,
      { imageUrl: req.body.imageUrl, url: req.body.url, updatedAt: Date.now() },
      { new: true }
    );
    if (!banner) return res.status(404).json({ message: "Banner not found" });
    res
      .status(200)
      .json({ data: banner, message: "Banner updated successfully" });
  } catch (error) {
    next(error);
  }
};

// Delete a banner by ID
exports.deleteBanner = async (req, res, next) => {
  try {
    const banner = await Banner.findByIdAndDelete(req.params.id);
    if (!banner) return res.status(404).json({ message: "Banner not found" });
    res.status(200).json({ message: "Banner deleted successfully" });
  } catch (error) {
    next(error);
  }
};
