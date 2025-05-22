const isAuth=require("../middleware/authenticateToken")
const { get_All_Recharge_Offer, update_Offer_Rechareg, delete_Offer_Rechareg, 
create_Offer_Recharge,get_All_Recharge_Offer_Admin,  
get_All_Recharge_Offer_Byid,
get_All_User_Recharge_Offer} =  require('../controller/offerRecharge')

const router  = require('express')()

router.get('/all',isAuth.authenticateToken,get_All_Recharge_Offer)
router.get('/all-list',isAuth.authenticateToken,get_All_Recharge_Offer_Admin)
router.get('/singale-recharge/:id',isAuth.authenticateToken,get_All_Recharge_Offer_Byid)
router.get('/all_user_Recharge',isAuth.authenticateToken,get_All_User_Recharge_Offer);

router.post('/create',isAuth.authenticateToken,create_Offer_Recharge)
router.put('/update/:id',isAuth.authenticateToken,update_Offer_Rechareg)
router.delete('/delete/:id',isAuth.authenticateToken,delete_Offer_Rechareg)

module.exports = router
