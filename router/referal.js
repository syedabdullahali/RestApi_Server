const express = require('express');
const router = express.Router();
const referralController = require('../controller/referal');
const isAut = require("../middleware/authenticateToken");

router.post('/create',isAut.authenticateToken, referralController.createReferral);
router.get('/all',isAut.authenticateToken, referralController.getReferrals);
// router.get('/:userId',isAut.authenticateToken, referralController.getReferralsById);
router.get('/all-referals',isAut.authenticateToken, referralController.getAllreferedUsre);


module.exports = router;