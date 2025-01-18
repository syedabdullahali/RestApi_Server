const { hndaleTransitionCalculation,handleWithdrawal } = require('../controller/walletController')
const auth = require("../middleware/authenticateToken");

const router =  require('express').Router()

router.get('/walet-dashbord',auth.authenticateToken,hndaleTransitionCalculation)
router.post('/withdrawal',auth.authenticateToken, handleWithdrawal);


module.exports = router