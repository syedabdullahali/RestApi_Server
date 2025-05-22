const mongoose = require("mongoose");
const express = require("express");
const app = express();
app.use(express.json());
app.use(require("cors")());
const http = require("http");
require('dotenv').config()

const server =  http.createServer({}, app);
const initializeSocket = require("./sockethelper/socket");
const { handalePrizeDistribution } = require("./function/HandaleprizeDistribution");
initializeSocket(server, app);
const cron = require("node-cron");
const { handalePrivatePrizeDistribution } = require("./function/HndalePrivatePrizeDistribution");

const PORT = process.env.PORT || 7000;

const interval = parseInt(process.env.EVENT_TRIGGER_TIME_SECOND || "40", 10);
// if (!interval || interval < 1 || interval > 59) throw new Error("Invalid interval");

let isRunning = false;

cron.schedule(`*/${interval} * * * * *`, async () => {
  if (isRunning) return;
  isRunning = true;
  try {
    await handalePrizeDistribution();
    await handalePrivatePrizeDistribution();
  } catch (err) {
    console.error("Error in prize distribution:", err);
  } finally {
    isRunning = false;
  }
});

mongoose
  .connect(process.env.MONGO_DB_URI,
    {
      socketTimeoutMS: 45000, // Increase timeout
      serverSelectionTimeoutMS: 5000, // Time MongoDB waits for a response
    }
  )
  .then(() => {
    server.listen(PORT, () => {
      console.log("Local host running on port ", 7000);
    });
  })
  .catch((error) => {
    console.log(error);
  });



// Total Deposit Balance : 
// ₹2000.00 

// Total Withdrawn Balance:  total  WithDraw by user 
// ₹० 

// Wallet Balance: 
// ₹218.92 

// Winning Balance: 
// ₹694.55

// Tax:  = (Total Withdrawn Balance  +Winning Balance  - Total Deposit Balance) *30
// ₹2000.00 

//Winning Balance After Tax = Winning balance - Tax. 
// ₹2000.00 

// Referral Amount: 
// २० 
// Private Contest Balance = 
 
// Withdrawable Balance: = Winning Balance After Tax  + Referral Amount + Private Contest Balance
// ₹0 

// Private Contest Balance

// GST Deducted: 
// ¥440.00 

//amount  will deduct to  (Winning Balance + referal balance + privatecontest balance ) 

// TDS Deducted:  = Total Withdrawn Balance - and current withdraw balance 


//exampale 

// Usre won 3000 

// tax 900
// winning balance after tax 2100 

// referal 1000
// private contest 1000
