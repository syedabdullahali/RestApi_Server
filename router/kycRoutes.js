const express = require("express");
const router = express.Router();
const { CreateKYC, UpdateKYC, updateKYCStatus, GETKYC, getAllKYC, GETKYCBYAdmin, createwidthraw, getWidthraws, updatedDocuments, BankKyc, updatePersonalInformation, kycEamilUpdate } = require("../controller/kycController")
const isAuth = require("../middleware/authenticateToken")

router.post("/user/apply", isAuth.authenticateToken, CreateKYC)
router.post("/user/modify/kyc", isAuth.authenticateToken, updatedDocuments); //modify by karim ansari
router.get("/user/own/kyc", isAuth.authenticateToken, GETKYC); //modify by karim ansari

router.post("/user/bank/kyc", isAuth.authenticateToken, BankKyc); //modify by karim ansari
router.post("/user/personalInfo/kyc", isAuth.authenticateToken, updatePersonalInformation); //modify by karim ansari
router.post("/user/email/kyc", isAuth.authenticateToken, kycEamilUpdate); //modify by karim ansari

// router.post("/withdra/create",isAuth.authenticateToken,createwidthraw);

router.post("/withdra/create", isAuth.authenticateToken, createwidthraw);

//for admin user
router.get("/admin/withdraw/get/all/:id", isAuth.AdminAuthentication, getWidthraws)
router.put("/admin/update/status/:id", isAuth.AdminAuthentication, updateKYCStatus)
router.get("/admin/get/all/kyc", isAuth.AdminAuthentication, getAllKYC);
router.get("/admin/get/:id", isAuth.AdminAuthentication, GETKYCBYAdmin)

module.exports = router;
