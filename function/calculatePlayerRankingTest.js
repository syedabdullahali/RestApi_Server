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
const totalCurrentPrizeCount =(totalColected  * (currentFillObj.prizeDistributionPercentage/ 100)) 

const platformFeesPercentage = totalColected / currentFillObj.platformFeePercentage

const currentWinner =  ( currentFillObj.slotsFill  * (currentFillObj.rankPercentage/100)) 

console.log("totalColected",currentFillObj.slotsFill * entryAmount)
console.log("totalCurrentPrizeCount" ,totalColected * (currentFillObj.prizeDistributionPercentage/ 100))

console.log("currentFillObj.slotsFill",currentFillObj.slotsFill)
console.log("currentFillObj.slotsFill",(currentFillObj.rankPercentage/100))





// console.log(totalColected)

 //  10  slot 

   //3 rank 

  //  1 200
  //  2 160 
  //  3 120 

  //  // 5 slot 
  //  // 1.6

  //  1 200

  //  160*0.6


   const currentFillAmount = []


     const handleScallingFactors = (scallingPercentage) =>{

      const rankArr = prize
      let sum =0
    
      const pointNumber = scallingPercentage -Math.floor(scallingPercentage) 

      // const pointNumber = scallingPercentage - scallingPercentage

      console.log("pointNumber",pointNumber)
      console.log("scallingPercentage",scallingPercentage)
      console.log("Math.ceil(scallingPercentage)",Math.ceil(scallingPercentage))


      const numaricNumber =  scallingPercentage
    
      let counterNum =1

    
      while(counterNum<=Math.ceil(scallingPercentage)){


        if(counterNum===Math.ceil(scallingPercentage)){

          if(pointNumber>=0){
            sum+= (rankArr[counterNum-1]?.prizeAmount *(pointNumber||1))
            currentFillAmount.push({prizeAmount:(rankArr[counterNum-1]?.prizeAmount *(pointNumber||1)),rank:counterNum})
          }else{
            sum+= rankArr[counterNum]-1?.prizeAmount
            currentFillAmount.push({prizeAmount:rankArr[counterNum-1]?.prizeAmount,rank:counterNum})
          }
        }else{
          sum+= rankArr[counterNum-1]?.prizeAmount 
          currentFillAmount.push({prizeAmount:rankArr[counterNum-1]?.prizeAmount,rank:counterNum})
        }
        counterNum ++
      }    
      return sum
    }

    const currentWinnerPercentage = handleScallingFactors(currentWinner)
    
    const scallingFactors = totalCurrentPrizeCount/currentWinnerPercentage

    console.log("scallingFactors",scallingFactors)
    console.log("scallingFactors",currentWinnerPercentage)


    // console.log("totalCurrentPrizeCount",currentWinnerPercentage,
    //   currentWinner,totalCurrentPrizeCount,scallingFactors)
    // const currentFillModify = prize.slice(0,Math.floor(Math.ceil(currentWinner))).map((el,i)=>({


    const currentFillModify = currentFillAmount.map((el,i)=>({
       prizeAmount:Number((el.prizeAmount *scallingFactors).toFixed(2)),
       rank:el.rank,
       users:userContestDetails[i]?.users
    }))

  //   const currentFillModify =   rankDistribution.slice(0,Math.ceil(currentWinner)).map((el,i)=>({
  //     prizeAmount:Math.floor(totalCurrentPrizeCount*(el.percentage/100)),
  //     rank:el.rank,
  //     users:userContestDetails[i]?.users
  //  }))

  

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

// (node:32012) MaxListenersExceededWarning: Possible EventEmitter memory leak detected. 11 disconnect listeners added to [Socket].
//  MaxListeners is 10. Use emitter.setMaxListeners() to increase limit
// (Use `node --trace-warnings ...` to show where the warning was created)