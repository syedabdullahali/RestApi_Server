const { hndaleTransitionCalculation,handleWithdrawal, handleGetWithdrawalBalance } = require('../controller/walletController')
const auth = require("../middleware/authenticateToken");

const router =  require('express').Router()

router.get('/walet-dashbord',auth.authenticateToken,hndaleTransitionCalculation)
router.get('/withdrawal_balance',auth.authenticateToken,handleGetWithdrawalBalance)


router.post('/withdrawal',auth.authenticateToken, handleWithdrawal);


module.exports = router