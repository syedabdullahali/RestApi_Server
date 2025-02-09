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

// const { handaleBots } = require("./Bots/Bots");
// const { handaleBotBidRangeCalc } = require("./Bots2/botLogic");
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
    path: "/api/wallet",
    func: walletRoute,
  },
  {
    path: "/api/notify",
    func: notificationRoute,
  },

];

routes.forEach(({ path, func }) => {
  app.use(path, func);
});

const PORT = process.env.PORT || 5000;

// const sendingMessageToRank = (slotfill, currentSlot, rankPercentage) => {

//      slotfill

//   return {
//       messageStatus: currentSlot !== slotfill,
//       message: `Next winner will be added when ${usersNeeded} more spots fill`
//   };
// }

// // Example usage
// const nextFillObj = sendingMessageToRank(100, 20, 10);

// console.log(nextFillObj); // Correctly log the result of calling the function
console.log(new Date('2025-01-02T06:21:00.000+00:00').toLocaleString())
mongoose.connect(process.env.MONGO_DB_URI)
  .then(() => {
    console.log("Database connected");
    server.listen(PORT, () => {
      console.log("Local host running on port ", 5000);
    });
  })
  .catch((error) => {
    console.log(error);
  });

