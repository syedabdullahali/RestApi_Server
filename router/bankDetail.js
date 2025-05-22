const express = require("express");
const auth = require('../middleware/authenticateToken')
const router = express.Router();
const bannerController = require("../controller/bankDetailSchema");

// Route to add a new banner
router.post("/update",auth.authenticateToken, bannerController.createBankDetail);

// Route to get all banners
router.get("/all",auth.authenticateToken, bannerController.getBankDetail);
router.get("/user_data",auth.authenticateToken, bannerController.getBankDetailById);


// Route to update a banner by ID

// Route to delete a banner by ID
router.delete("/delete/:id",auth.authenticateToken, bannerController.deleteBankDetail);

// Route to get all banner with paginations

module.exports = router;