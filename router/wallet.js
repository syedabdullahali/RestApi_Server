const { hndaleTransitionCalculation,handleWithdrawal, handleGetWithdrawalBalance, getWithdrawAllertiHistory, updateWithdrawAllertiHistory } = require('../controller/walletController')
const auth = require("../middleware/authenticateToken");

const router =  require('express').Router()

router.get('/walet-dashbord',auth.authenticateToken,hndaleTransitionCalculation)
router.get('/withdrawal_balance',auth.authenticateToken,handleGetWithdrawalBalance)


router.post('/withdrawal',auth.authenticateToken, handleWithdrawal);
router.get('/withdraw_Allert_History',auth.authenticateToken, getWithdrawAllertiHistory);
router.post('/withdraw_Allert_History/update/:id',auth.authenticateToken, updateWithdrawAllertiHistory);


module.exports = router