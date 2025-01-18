const {getAllPaymentIntegrationKey,updatePaymentIntegrationKey,
    deletePaymentIntegrationKey,
} 
=  require('../controller/PaymentIntegrationKey')
const { AdminAuthentication } = require('../middleware/authenticateToken')
const router =  require('express').Router()

router.get('/all',AdminAuthentication,getAllPaymentIntegrationKey)
router.patch('/update/:id',AdminAuthentication,updatePaymentIntegrationKey)
router.delete('/delete/:id',AdminAuthentication,deletePaymentIntegrationKey)
router.post('/create',AdminAuthentication,deletePaymentIntegrationKey)

module.exports = router