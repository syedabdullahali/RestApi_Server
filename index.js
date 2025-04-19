const mongoose = require("mongoose");
const express = require("express");
const app = express();
app.use(express.json());
app.use(require("cors")());
const http = require("http");
require('dotenv').config()
const server = http.createServer(app);

app.use("/admin-account", require("./router/SignUp"));
const categoryRoute = require("./router/category");
const subcategoryRoute = require("./router/subcategory");
const contestRoutes = require("./router/contestRoutes");
const bannerRoutes = require("./router/bannerRoutes");
const userRoutes = require("./router/userRoutes");
const pContestRoute = require("./router/privateContestRoutes");
const catContest = require("./router/categoryContestRoutes");
const reviewContest = require("./router/reviewRoutes");
const documentRoute = require("./router/documentRoutes");
const plannRoute = require("./router/plannRoutes");
const tdsGstTextRoute = require("./router/tdsGstTextRoutes");
const kycRoute = require("./router/kycRoutes")
const userContestDetailsRoute = require("./router/UserContestRouter");
const paymentIntegrationRoute = require("./router/PaymentIntegrationKey")
const offerRechargeRoute = require("./router/offerRecharge")
const notificationRoute = require("./router/notification")
const walletRoute = require("./router/wallet")
const offerRechargeSetting = require("./router/oferRechargeSetting");
const rankSetting =  require("./router/userRankControllerRoute")
const referralRoutes = require('./router/referal');
const referralControllerRoutes = require('./router/referalController');
const bankDetailRoutes = require('./router/bankDetail');
const widthrawSettingRoutes = require('./router/widthrawSetting');
const sendOptRoutes = require('./router/sendOpt');


const routes = [
  {
    path: "/api/kyc/",
    func: kycRoute,
  },
  {
    path: "/api/category/",
    func: categoryRoute,
  },
  {
    path: "/api/subcategory/",
    func: subcategoryRoute,
  },
  {
    path: "/api/contest/",
    func: contestRoutes,
  },
  {
    path: "/api/banner",
    func: bannerRoutes,
  },
  {
    path: "/api/user/",
    func: userRoutes,
  },
  {
    path: "/api/privatecontest/",
    func: pContestRoute,
  },
  {
    path: "/api/catcontest/",
    func: catContest,
  },
  {
    path: "/api/review/",
    func: reviewContest,
  },
  {
    path: "/api/document/",
    func: documentRoute,
  },
  {
    path: "/api/planned/",
    func: plannRoute,
  },
  {
    path: "/api/text/",
    func: tdsGstTextRoute,
  },
  {
    path: "/api/time",
    func: userContestDetailsRoute,
  },
  {
    path: "/api/paymentIntegration",
    func: paymentIntegrationRoute,
  },
  {
    path: "/api/offerRecharge",
    func: offerRechargeRoute,
  },
  {
    path: "/api/offerRechargeSetting",
    func: offerRechargeSetting,
  },
  {
    path: "/api/wallet",
    func: walletRoute,
  },
  {
    path: "/api/notify",
    func: notificationRoute,
  },
  {
    path: "/api/rankSetting",
    func: rankSetting,
  },
  {
    path: "/api/referrals",
    func: referralRoutes,
  },
  {
    path: "/api/referal_controller",
    func: referralControllerRoutes,
  },
  {
    path: "/api/bankDetails",
    func: bankDetailRoutes,
  },
  {
    path: "/api/widthrawSetting",
    func: widthrawSettingRoutes,
  },
  {
    path: "/api/otp",
    func: sendOptRoutes,
  }
];


routes.forEach(({ path, func }) => {
  app.use(path, func);
});

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_DB_URI)
  .then(async () => {
    server.listen(PORT, () => {
      console.log("Local host running on port ", 5000);
      console.log("Database connected");
    });
  })
  .catch((error) => {
    console.log(error);
  });

