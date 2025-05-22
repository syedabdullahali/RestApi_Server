const express = require('express');
const router = express.Router();
const widthrawSetting = require('../controller/widthrawSetting');

router.post('/create', widthrawSetting.createWitdthrawController);
router.get('/', widthrawSetting.getWitdthrawController);


module.exports = router;