const mainContestHistory = require("../model/contesthistory");
const calculatePlayerRankingTest = require("./calculatePlayerRankingTest");

const handaleDiclareRank = async (contestId,timeSlot,contest)=>{
    
        let updatedMainContestHistory = await mainContestHistory.findOne({ contestId, timeslotId: timeSlot });
    
        // Call ranking logic asynchronously
        calculatePlayerRankingTest(
          contestId,
          timeSlot,
          contest?.prizeDistribution,
          contest?.rankDistribution,
          {
            slotsFill:updatedMainContestHistory.userranks.length+1,
            rankPercentage: contest.rankPercentage,
            platformFeePercentage: contest.platformFeePercentage,
            entryAmount: contest.entryAmount,
            prizeDistributionPercentage: contest.prizeDistributionPercentage,
            rankDistribution: contest.rankDistribution,
            actualSlotFill:contest.slots
          }
        )
          .then(async ([rankings, currentFill]) => {
            // Ensure we have the latest instance of mainContestHistory
    
            if (!updatedMainContestHistory) {
              console.error("mainContestHistory document not found for save operation.");
              return;
            }
            // console.log(currentFill)
    
            updatedMainContestHistory.userranks = rankings;
            updatedMainContestHistory.currentFill = currentFill;
            await updatedMainContestHistory.save();
          })
          .catch((err) => console.error("Ranking calculation failed", err));
}

module.exports = handaleDiclareRank