const express = require("express");
const router = express.Router();
const bannerController = require("../controller/bannerController");

// Route to add a new banner
router.post("/add", bannerController.addBanner);

// Route to get all banners
router.get("/all", bannerController.getBanners);

// Route to update a banner by ID
router.put("/update/:id", bannerController.updateBanner);

// Route to delete a banner by ID
router.delete("/delete/:id", bannerController.deleteBanner);

// Route to get all banner with paginations
router.get("/", bannerController.getBannersPagination);

module.exports = router;