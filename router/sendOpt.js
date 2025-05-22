const express = require('express');
const router = express.Router();
const otpController = require('../controller/sendOTP');
const { Register, LoginVerify } = require('../controller/userController');

// Route to send OTP using 2Factor SDK
router.post('/send-otp', Register);
// Route to verify OTP using 2Factor SDK
router.post('/verify-otp', LoginVerify);

// Route to send OTP using URL method
// router.post('/url-send-otp', async (req, res) => {
//     const { mobile } = req.body;
//     try {
//         const response = await otpController.urlSendTestOtp(mobile);
//         res.status(200).json({ success: true, data: response });
//     } catch (error) {
//         res.status(500).json({ success: false, message: error.message });
//     }
// });

// // Route to verify OTP using URL method
// router.post('/url-verify-otp', async (req, res) => {
//     const { sessionId, otp } = req.body;
//     try {
//         const response = await otpController.urlVerifyOtp(sessionId, otp);
//         res.status(200).json({ success: true, data: response });
//     } catch (error) {
//         res.status(500).json({ success: false, message: error.message });
//     }
// });

module.exports = router;
