const { Types } = require("mongoose");
const userMainContestDetail = require("../model/admin/userContestDetailSchema");



const calculatePlayerRankingTest = async (contestId, timeSlot,
    prize,rankDistribution,currentFillObj
) => {

    const prizeDistributionAmount = currentFillObj.prizeDistributionAmount
    const entryAmount = currentFillObj.entryAmount



   try {
    
     const userContestDetails = await userMainContestDetail.aggregate([
    { 
    $match:{
         contestId: new Types.ObjectId(contestId),
         timeslotId:  new Types.ObjectId(timeSlot)
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


const totalColected =  currentFillObj.slotsFill * entryAmount

const platformFeesPercentage = totalColected / currentFillObj.platformFeePercentage
const totalCurrentPrizeCount =(totalColected  * currentFillObj.prizeDistributionPercentage) / 100
const currentWinner =  ( currentFillObj.slotsFill  * currentFillObj.rankPercentage) / 100





     const handleScallingFactors = (scallingPercentage) =>{
      const rankArr = prize
      let sum =0
    
      const pointNumber = scallingPercentage - Math.floor(scallingPercentage)
      const numaricNumber =  Math.floor(scallingPercentage)
    
      let counterNum =1
    
      while(counterNum<=Math.ceil(scallingPercentage)){
        if(counterNum===Math.ceil(scallingPercentage)){
          if(pointNumber>=0){
            sum+= (rankArr[counterNum-1]?.prizeAmount *pointNumber)
          }else{
            sum+= rankArr[counterNum-1]?.prizeAmount
          }
        }else{
          sum+= rankArr[counterNum-1]?.prizeAmount 
        }
        counterNum ++
      }    
      return sum
    }
    const currentWinnerPercentage = handleScallingFactors(currentWinner)
    
    const scallingFactors = totalCurrentPrizeCount/currentWinnerPercentage

    // console.log("totalCurrentPrizeCount",currentWinnerPercentage,
    //   currentWinner,totalCurrentPrizeCount,scallingFactors)

    const currentFillModify = prize.slice(0,Math.ceil(currentWinner)).map((el,i)=>({
       prizeAmount:Math.floor(el.prizeAmount*scallingFactors),
       rank:el.rank,
       users:userContestDetails[i]?.users
    }))

     const userList = userContestDetails.reduce((crr,el,i)=>{
        crr.push(el.users.map((el2)=>(
           {
               rank:i+1,
               userId:el2.userId,
               bid:el._id,
               totalBids:el2.totalUserBids,
               biddingTime:el2.bidTimeDate,
               WinningAmount:(currentFillModify[i]?.prizeAmount/el2.totalUserBids?
                currentFillModify[i]?.prizeAmount/el.users.length:0),
               isInWiningRange:(currentFillModify[i]?true:false),
               duplicateCount:el.duplicateCount
          }
       )))
        return crr
       },[]).flat(1)

       
     return [userList,currentFillModify];

   } catch (error) {
     console.error("Error calculating rankings:", error);
     throw error;
   }
 };

module.exports = calculatePlayerRankingTest