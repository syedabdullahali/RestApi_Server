const { getReferalController,createReferalController } = require("../controller/referalController")

const router =  require("express").Router()

router.get('/',getReferalController)
router.post('/create-or-update',createReferalController)


module.exports = router