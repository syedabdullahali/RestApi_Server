const { Types } = require("mongoose");
const userMainContestDetail = require("../model/admin/userContestDetailSchema");
const UserPrivateContestDetails=require("../model/userprivatecontest");




const calculatePrivatePlayerRanking = async (contestId,contestObj) => {

   try {
    
     const userContestDetails = await UserPrivateContestDetails.aggregate([
    { 
    $match:{
        contestId: new Types.ObjectId(contestId),
       }
    },
    {$addFields:{
        totalUserBids:{$size:"$bids"}	
     }
    },

    {$unwind:"$bids"},
    {
        $group:{
            _id:"$bids.Amount",
            duplicateCount:{
                $sum:1
            },
            users:{
                $push:{
                    userId:"$userId",
                    totalUserBids:"$totalUserBids",
                    bidTimeDate:"$bids.bidTimeDate"
                }
            }
        },
    },

  { 
    $sort: { duplicateCount: 1, _id: -1 } 
  },
]);

  const {winingPercentage,entryFees,spots,prizedistribution} = contestObj

  const totalWinnerSlot = winingPercentage * ((spots*(prizedistribution/100))/100)
  const distributedAmount = ((spots*(prizedistribution/100))*entryFees)/totalWinnerSlot
  const rankPrizeDistribution = new Array(Math.floor(totalWinnerSlot)).fill(Math.floor(distributedAmount))  

  const userRank =  userContestDetails.reduce((crr,el,i)=>{
    crr.push(el.users.map((el2)=>(
       {
           rank:i+1,
           userId:el2.userId,
           bid:el._id,
           totalBids:el2.totalUserBids,
           biddingTime:el2.bidTimeDate,
           duplicateCount:el.duplicateCount,
           WinningAmount:0,
           isInWiningRange:false
      }
   )))
    return crr
   },[]).flat(1)

   rankPrizeDistribution.forEach((winingAmount, i) => {
    if (userRank[i]) {
      userRank[i].WinningAmount = winingAmount;
      userRank[i].isInWiningRange = true;
    }
  });
    return userRank
   } catch (error) {
     console.error("Error calculating rankings:", error);
     throw error;
   }
 };

module.exports = calculatePrivatePlayerRanking