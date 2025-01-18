const { handaleBotBid } = require("./botFunction");
const userModel = require("../model/user/user");

const fillBotSlots = async (el) => {
  try {
    const botUserList = await userModel.find({
      type: "bot",
      _id: { $nin: el?.contesthistories.slotsFill }, // Exclude IDs that are already in `useBotsList`
    });

    const botList = JSON.parse(JSON.stringify(botUserList));

    let startTestTime = new Date(el.currentTimeSlot.startTime); // Initial contest start time
    startTestTime;

    const isBotAv = !!botUserList.map((el) => el._id).length;


    const contest = {
      contestDuration: el.minutesBetween, // Contest duration in minutes (40 minutes)
      startTime: startTestTime,
      realUserSlots: el.userTypeCounts.userCount, // Slots filled by real users
      bots: [], // Array to hold bids
      botSlots: el.userTypeCounts.botCount, // Count of slots filled by bots,
      upToBids: el.upto,
      contestId: el._id,
      timeSlotId: `${el.currentTimeSlot._id.toString()}`,
      bidRange: 100,
      contestHsitoryId: el.contesthistories._id,
      botSession: el.contesthistories.botSession,
      rankDistribution:el.rankDistribution,
      prizeDistribution:el.prizeDistribution,
      slotsFill:el?.contesthistories?.slotsFill?.length,
      rankPercentage:el.rankPercentage,
      platformFeePercentage:el.platformFeePercentage,
      entryAmount:el.entryAmount,
      prizeDistributionAmount:el.prizeDistributionAmount,
      // bidRange:el.bidRange
    };
    const totalSlots = el.slots;
    // console.log("el",el.slots)
    // console.log("contest",el?.contesthistories?.slotsFill?.length)

    console.log(
      "Contest Start Time:",
      new Date(el.currentTimeSlot.startTime).toLocaleTimeString()
    );
    console.log(
      "Contest Start End:",
      new Date(el.currentTimeSlot.endTime).toLocaleTimeString()
    );

    console.log("userCount", el.userTypeCounts.userCount);
    console.log("botCount", contest.botSlots);
    console.log("botSession", contest.botSession);


    // Total slots availablelimiy

    // Bots bids limit will calculate according to slot and slot bids limit

    const botPercentageFirstPortion = 0.1; // 20% of slots filled by bots in first portion
    const remainingSlotPercentage = 0.8; // Remaining 80% for real users and bots

    // Divide contest time into 4 portions
    const portionTime = contest.contestDuration / 4; // 40 minutes divided into 4 portions (each 10 minutes)
    const startTime = contest.startTime;

    // Simulating current time (adjust as needed for testing)
    const currentTime = new Date(); // Change this to test different portions

    // currentTime.setMinutes(startTestTime.getMinutes()+5)

    // console.log("Current Time:", currentTime.toLocaleTimeString(),startTime.toLocaleTimeString());

    // console.log(currentTime - startTime < (portionTime * 60000))
    // First Portion: Fill 20% of slots by bots
    const slotsToFillFir = totalSlots * botPercentageFirstPortion; // 20% of slots

    // console.log("contest.botSession",contest.botSession,isBotAv)

    if (
      currentTime - startTime < portionTime * 60000 &&
      isBotAv &&
      slotsToFillFir > contest.botSlots &&
      contest.botSession !== "first" 
    ) {
      await placeBids(
        contest,
        slotsToFillFir,
        "bot",
        botList.slice(0, slotsToFillFir)
      ); // Place the bot bids
      console.log("First Portion: Filled slots by bots:", `${slotsToFillFir}`);
      contest.botSession = "first";
    }

    // Second Portion: No bot participation
    // if real time user is 200% then nothing will fill
    // else 10% would be fill

    if (
      currentTime - startTime >= portionTime * 60000 &&
      currentTime - startTime < portionTime * 2 * 60000 &&
      isBotAv &&
      contest.botSession !== "second" 
    ) {
      // console.log("Second Portion: No bot bids");
      // contest.botSession = "second";
      console.log( contest.botSession);

      await placeBids(
        contest,
        slotsToFillFir,
        "bot",
        botList.slice(0, slotsToFillFir)
      ); // Place the bot bids
      console.log("Second Portion: Filled slots by bots:", `${slotsToFillFir}`);
      contest.botSession = "second";

    }

    // Third Portion: Fill half of remaining slots by bots
    if (
      currentTime - startTime >= portionTime * 2 * 60000 &&
      currentTime - startTime < portionTime * 3 * 60000 &&
      isBotAv &&
      contest.botSession !== "third" 
    ) {
      const filledSlots = contest.realUserSlots + contest.botSlots; // Real users and bots combined
      const remainingSlots = totalSlots - filledSlots; // Calculate remaining slots
      
      const slotsToFillThirdPortion =
        (remainingSlotPercentage * totalSlots - contest.realUserSlots) *

        (2 / 4); // 50% of remaining slots
      await placeBids(
        contest,
        slotsToFillThirdPortion,
        "bot",
        botList.slice(0, slotsToFillThirdPortion)
      ); // Place bot bids
      console.log(
        "Third Portion: Filled slots by bots:",
        slotsToFillThirdPortion
      );
      contest.botSession = "third";
    }

    // Fourth Portion: Fill remaining slots based on real user participation
    if (
      currentTime - startTime >= portionTime * 3 * 60000 &&
      isBotAv &&
      contest.botSession !== "fourth" 
    ) {
      const filledSlots = contest.realUserSlots + contest.botSlots; // Real users and bots combined

      const remainingSlots = totalSlots - filledSlots; // Calculate remaining slots
      if (remainingSlots > 0) {
        await placeBids(
          contest,
          remainingSlots,
          "bot",
          botList.slice(0, remainingSlots)
        ); // Place remaining bot bids
        console.log(
          "Fourth Portion: Filled remaining slots by bots:",
          remainingSlots
        );
        contest.botSession = "fourth";
      }
    }

    return contest;
  } catch (error) {
    throw error;
  }
};

// Function to place bids (bot or real user)
const placeBids = async (contest, slotsToFill, userType, botList) => {
  try {
    // for (let i = 0; i < slotsToFill; i++) {
    //     // const bid = {
    //     //     // userType,
    //     //     // bidAmount: Math.random() * 100, // Random bid amount for bots
    //     //     // bidTime: new Date(), // Current time for bid placement
    //     //     // userId: userType === 'bot' ? null : "RealUserId" // Null for bots, otherwise real user ID
    //     //     ...botUserList[(Math.random()*botUserList.length)+1]
    //     // };
    //     const bid ={
    //         botInfo:botList[Math.floor(Math.random()*botList.length)+1],
    //         bidInfo:{
    //             botList:Math.floor(Math.random() * contest.bidRange)+1
    //         }
    //     }
    const bots = handaleBotBid(
      botList,
      contest.upToBids,
      slotsToFill,
      contest.bidRange
    );
    // console.log(bots)

    //     contest.bots.push(bid); // Add the bid to the contest bids array
    // }
    contest.bots = contest.bots.concat(bots);
  } catch (error) {
    throw error;
  }

  // contest.botSlots += slotsToFill; // Increment bot slot count
  // await contest.save(); // Save the contest (if using a database)
};

// Call the function to test
module.exports = fillBotSlots;
