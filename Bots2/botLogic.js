// const contestModel = require("../model/contestModel"); 
const contesthistory = require('../model/contesthistory')
const userBidDetails =  require('../model/admin/userContestDetailSchema')
const botData = require('../data/New_Text_Document.json');
const { Types } = require('mongoose');

const handaleBotBidRangeCalc = async (contestId,timeSlotId,prize,rankDistribution,
  currentFillObj,contesthistoryId,upto,bidRange) => {
    try{
    const response = await userBidDetails
    .aggregate([
     {$match:{
        contestId: new Types.ObjectId(contestId),
        timeslotId:new Types.ObjectId(timeSlotId)
     }},
     {
        $lookup:{
            from:"users",
            localField:"userId",
            foreignField:"_id",
            as:"users"
        }
     },
     {$unwind:"$bids"},
     {$unwind:"$users"},
    ])
  

   const uniqBidsObj = response.reduce((crr,el)=>{
   if(!crr[(""+el.bids.Amount)]){
        crr[(""+el.bids.Amount)] ={type:"uniq",id:el.bids._id,Amount:el.bids.Amount,
            usreType:el.users.type,bidTimeDate:el.bids.bidTimeDate,_id:el.bids._id}
      }else{
        crr[(""+el.bids.Amount)] ={type:"duplicate",id:el.bids._id,Amount:el.bids.Amount,
            usreType:el.users.type,bidTimeDate:el.bids.bidTimeDate,_id:el.bids._id}
    }
    return crr
},{})

// return  uniqBidsArr

const botBids =  response.reduce((crr,el)=>{

    if (!crr.groupData[el.bids._id]){
      crr.groupData[el.bids._id]={bids:0}
      crr.groupData[el.bids._id].type = el.users.type
      crr.groupData[el.bids._id].userId=el.bids._id
      crr.groupData[el.bids._id].timeslotId=el.timeslotId 
      crr.groupData[el.bids._id].contestId=el.contestId
      crr.groupData[el.bids._id].winningAmount=el.winningAmount
      crr.groupData[el.bids._id].totalAmount=el.totalAmount
      crr.groupData[el.bids._id]._id = el._id
      crr.groupData[el.bids._id].bids = [
        {
            Amount:el.bids.Amount,
            _id:el.bids._id,
            bidTimeDate:el.bids.bidTimeDate,
        }
      ]
      crr.groupData[el.bids._id].uniqBidCount=0
      crr.groupData[el.bids._id].totalAmount=0
      crr.groupData[el.bids._id].duplicateUsreBidCount=0

      crr.groupData[el.bids._id].uniqBidCount+=(uniqBidsObj[el.bids.Amount+""].type==="uniq"?1:0)
      crr.groupData[el.bids._id].duplicateUsreBidCount+=(uniqBidsObj[el.bids.Amount+""].type==="uniq"?0:1)
      crr.groupData[el.bids._id].totalAmount+=el.bids.Amount

    } else {
      crr.groupData[el.bids._id].bids.push({
        Amount:el.bids.Amount,
        _id:el.bids._id,
        bidTimeDate:el.bids.bidTimeDate,
    })

    // if(crr.groupData[el.bids._id].type==='user'){
    crr.groupData[el.bids._id].duplicateUsreBidCount+=(uniqBidsObj[el.bids.Amount+""].type==="uniq"?0:1)
    // }
    crr.groupData[el.bids._id].uniqBidCount+=(uniqBidsObj[el.bids.Amount+""].type==="uniq"?1:0)
    crr.groupData[el.bids._id].totalAmount+=el.bids.Amount

    }
    return crr
},{
    groupData:{},
})


// const uniqBids = 

const {botCalculation,userCalculation } =  botData.reduce((crr,el)=>{ 
        if(el.type=='bot'){
         crr.botCalculation+=el.bids.Amount
        }else {
         crr.userCalculation+=el.bids.Amount
        }
        return crr
},{botCalculation:0,userCalculation:0})


const bidRange = upto|0
const maxbidAmount = bidRange|0



// console.log(maxbidAmount*0.20)



const userAllUniqBids =   Object.values(uniqBidsObj)
.reduce((crr,el)=>el.type==="uniq"&&el.usreType=='user' ?(`${crr.push(el.Amount)}`&&crr):crr,[])

const topBids = new Array(maxbidAmount*0.20).fill(1).map((no,i)=>(maxbidAmount)- i)

//fix
const userBotDpBids = Object.values(botBids.groupData).filter((el)=>el.duplicateUsreBidCount||el.type!=='bot')

//test
const userBotUnBids = Object.values(botBids.groupData).filter((el)=>!el.duplicateUsreBidCount&&el.type==='bot')
//fix
const {covertedToDuplicate,notConverted} =   userBotUnBids.reduce((crr,el,i)=>{

    const bids = userAllUniqBids.slice(i*2,bidRange+(2*i)).map((el2)=>{
        return ({
            "userId": el.userId,
            "Amount": el2,
            "bidTimeDate":new Date()
        })
    })

    const bids2 = topBids.slice(Math.floor(i-(userAllUniqBids.length/2))*2,bidRange+
    (2*Math.floor(i-(userAllUniqBids.length/2)))).map((el2)=>{
        return ({
            "userId": el.userId,
            "Amount": el2,
            "bidTimeDate":new Date()
        })
    })
    
    if(bids.length){
        crr.covertedToDuplicate.push({...el,uniqBidCount:0,bids:bids})    
     }else if(bids2.length){
        crr.notConverted.push({...el,uniqBidCount:0,bids:bids2}) 
     }
     return  crr

},{covertedToDuplicate:[],notConverted:[]})

  const updateDocuments = async (data) => {
    try {
      const bulkOperations = data.map((doc) => ({
        updateOne: {
          filter: { _id: doc._id },
          update: {
            $set: {
              bids: doc.bids||[],
            },
          },
        },
      }));
        const result = await userBidDetails.bulkWrite(bulkOperations);
      console.log("Bulk update result:", result);
      return result
    } catch (error) {
      console.error("Error updating documents:", error);
    }
  };

  const transformData = ( template,input) => {
    let userCounter = 0; // To keep track of user distribution
  
    return template
      // .filter(entry => entry.rank !== "7-10") // Filtering out rank "7-10" if it doesn't exist in the template
      .map((entry) => {
  
        if (typeof entry.rank === "number") {
          // Single rank, such as rank 1 or rank 2
          const user = input[userCounter] ? input[userCounter].users : [];
  
          userCounter += user.length;
          
          return { 
            // ...entry, 
            rank:entry.rank,
            prizeAmount:entry.amount,
            users: user // Assign users to the rank
          };
        } else if (typeof entry.rank === "string" && entry.rank.includes("-")) {
          // Rank range (e.g., "3-6")
          const [start, end] = entry.rank.split("-").map(Number);
          const users = [];
  
          // Collect users for the rank range (e.g., 3 to 6)
          for (let i = start - 1; i < end; i++) {
            if (input[userCounter]) {
              users.push(...input[userCounter].users);
              userCounter++;
            }
          }
  
          return { 
            rank:entry.rank,
            prizeAmount:entry.amount, users 
        };
        }
  
        return entry; // Fallback for unexpected cases
      });
   };
  

  const calculatePlayerRanking = async (userContestDetails,contestId, timeSlot,prize,rankDistribution,currentFillObj) => 
    {

      if(!userContestDetails?.length){
       return  [null, null]
      }
  
      try {
            const bidCountMap = new Map();
            userContestDetails.forEach((user) => {
              user.bids.forEach((bid) => {
                const amount = bid.Amount;
                bidCountMap.set(amount, (bidCountMap.get(amount) || 0) + 1);
              });
            });
       
            const usersData = userContestDetails.map((user) => {
              let totalBidAmount = 0;
              let uniqueBidCount = 0;
              user.bids.forEach((bid) => {
                const amount = bid.Amount;
                totalBidAmount += amount;
       
                if (bidCountMap.get(amount) === 1) {
                  uniqueBidCount++;
                }
              });
       
              return {
                userId: user.userId,
                totalBidAmount,
                uniqueBidCount,
                winningAmount: 0,
              };
            });
       
            usersData.sort((a, b) => {
              if (b.totalBidAmount !== a.totalBidAmount) {
                return b.totalBidAmount - a.totalBidAmount;
              }
              return b.uniqueBidCount - a.uniqueBidCount;
            });
       
            const rankings = [];
       
            let currentRank = 1;
            let prevUser = null;
       
            usersData.forEach((user) => {
              if (
                prevUser &&
                (prevUser.totalBidAmount !== user.totalBidAmount ||
                  prevUser.uniqueBidCount !== user.uniqueBidCount)
              ) {
                currentRank++;
              }
       
              let rankEntry = rankings.find((r) => r.rank === currentRank);
              if (!rankEntry) {
                rankEntry = {
                   rank: currentRank, 
                   users: [],
                   isInWniningRange:false,
                   rankPrize:0 
                  };
                rankings.push(rankEntry);
              }
       
              rankEntry.users.push({
                userId: user.userId,
                totalBidAmount: user.totalBidAmount,
                uniqueBidCount: user.uniqueBidCount,
                winningAmount: 0,
              });
       
              prevUser = user;
            });
       
           await prize.forEach((el,i)=>{
            if(rankings?.[i]){
              rankings[i].isInWniningRange=true
              rankings[i].rankPrize=el.prizeAmount
            }
            })
          
       
            const currentFill = transformData(rankDistribution,rankings);
            const totalCurrentPrizeCount  = currentFillObj.prizeDistributionAmount     
            const totalColected =  currentFillObj.slotsFill*currentFillObj.entryAmount     
            const scalingFactor = totalColected/totalCurrentPrizeCount
  
            const currentFillModify = currentFill.map((el)=>({
              prizeAmount:Math.floor(el.prizeAmount*scalingFactor.toFixed(4)),
              rank:el.rank,
              users:el.users
            }))
      
            return [rankings,currentFillModify];
       
          } catch (error) {
            console.error("Error calculating rankings:", error);
            throw error;
          }
 };

  const modifyData = [...covertedToDuplicate,...notConverted,...userBotDpBids]
  .map((el)=>{
    return   ({
      "bids": el.bids,
      "userId": el.userId,
      "timeslotId": el.timeslotId,
      "contestId":el.contestId,
      "winningAmount": el.winningAmount,
      "totalAmount": el.totalAmount,
      "_id": el._id,
  })
   })
   if(modifyData.length){
    await  updateDocuments(modifyData)
    const [rankings, currentFill] = await calculatePlayerRanking(modifyData,contestId,timeSlotId,prize,rankDistribution,
      {...currentFillObj,slotsFill:modifyData.length})
  
      //  Prepare the update data
      if(rankings&&currentFill){

        const updateData = {
          $set: {
            ranks: rankings,
            currentFill,
            bot2isActive:false
          },
        };
      
       await contesthistory.findByIdAndUpdate(contesthistoryId, updateData, {new: true});

      }
  }
 
}catch(error){
throw{error:error}
}
};

module.exports = { handaleBotBidRangeCalc }