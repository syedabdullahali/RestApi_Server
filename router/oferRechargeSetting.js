const isAuth=require("../middleware/authenticateToken")
const { create_Offer_Recharge, get_All_Offer_Recharge} =  require('../controller/oferRechargeSetting')

const router  = require('express')()

router.post('/create',isAuth.authenticateToken, create_Offer_Recharge)
router.get('/all_offer_recharge',isAuth.authenticateToken, get_All_Offer_Recharge)

module.exports = router