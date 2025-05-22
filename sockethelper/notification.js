const { sendSingleNotification } = require('../function/sendNotification');
const  Users = require('../model/user/user')

const handaleUserNoification =async ()=>{
try{
const response =await Users.aggregate([
{
    $project:{
     _id:1,
     contestNotification:1
    }
},
{
    $unwind: {
      path: "$contestNotification",
      includeArrayIndex: "contestNotificationIndex"
    }
},
{$project:{
    userId:"$_id",
    timeSlotId:"$contestNotification.timeSlotId",
    isNotificationSended:"$contestNotification.isNotificationSended",
    contestNotificationIndex:"$contestNotificationIndex",
    contestId:"$contestNotification.contestId",
    subcategoryId:"$contestNotification.subcategoryId"
}},
{
  $match:{
    isNotificationSended:false
  }
},
{
    $match:{
        timeSlotId:{ $exists: true }
    }
},
{
    $lookup:{
     from:"timesheduleschemas",
     localField:"timeSlotId",
     foreignField:"_id",
     as:"timeSlots"
    }
},
{
    $addFields: {
      currentTime: {
        $dateToString: {
          format: "%Y-%m-%d %H:%M:%S", // Define the date format
          date: new Date(), // Current date and time
          timezone: "Asia/Kolkata", // Set timezone to IST (Indian Standard Time)
        },
      },
      contestStatus: {
        $reduce: {
          input: {
            $map: {
              input: "$timeSlots", // Iterate over each timeSlot
              as: "slot",
              in: {
                $cond: {
                  if: {
                    $and: [
                      { $lte: ["$$slot.startTime", "$currentTime"] }, // Check if the start time is before or equal to current time
                      { $gte: ["$$slot.endTime", "$currentTime"] },   // Check if the end time is after or equal to current time
                    ],
                  },
                  then: "live", // If the time slot is live
                  else: {
                    $cond: {
                      if: { $gte: ["$currentTime", "$$slot.endTime"] }, // If the current time is after the slot's end time
                      then: "wining", // If the contest has ended
                      else: "upcoming", // If the contest is upcoming
                    },
                  },
                },
              },
            },
          },
          initialValue: [], // Start with an empty array
          in: {
            $cond: {
              if: { $in: ["$$this", "$$value"] }, // Check if the current status is already in the accumulated array
              then: "$$value", // If it already exists, keep the array as it is
              else: { $concatArrays: ["$$value", ["$$this"]] }, // Otherwise, add the current status to the array
            },
          },
        },
      },
    },
},
{$unwind:"$contestStatus"},
// {
//   $match:{
//     contestStatus:"live"
//   }
// },
{$unwind:"$timeSlots"},

{
    $lookup:{
     from:"categorycontests",
     localField:"timeSlots.contestId",
     foreignField:"_id",
     as:"contest"
    }
},
{$unwind:"$contest"},
{
    $lookup:{
     from:"sub-categories",
     localField:"subcategoryId",
     foreignField:"_id",
     as:"subCategories"
    }
},
{$unwind:"$subCategories"},
{
    $lookup:{
     from:"categories",
     localField:"subCategories.auctioncategory",
     foreignField:"_id",
     as:"categorie"
    }
},
{$unwind:"$categorie"},
{$project:{
    userId:"$_id",
    timeSlotId:"$timeSlots._id",
    isNotificationSended:"$contestNotification.isNotificationSended",
    contestNotificationIndex:"$contestNotificationIndex",
    contestId:"$contest._id",
    subcategoryId:"$subCategories._id",
    subcategoryName:"$subCategories.name",
    categorieName:"$categorie.duration",
}},
])



const response2 = await Promise.all(
    response.map(async (el) => {
      try {
        if(el?.userId){
        // Send the notification
     
  
         await Users.findByIdAndUpdate(
          el.userId,
          {
            $set: {
              [`contestNotification.${el.contestNotificationIndex}`]: {
                contestId: el.contestId,
                timeSlotId: el.timeSlotId,
                isNotificationSended: true,
                subcategoryId: el.subcategoryId
              }
            }
          },
          { new: true } // This ensures the updated document is returned
        );
      }
      
      sendSingleNotification(
        el.userId,
        `${el.categorieName} Category: ${el.subcategoryName} Contest is Now Live!`,
        `The ${el.categorieName} Category, ${el.subcategoryName} Contest is officially live! Don't miss out – join now and enjoy the competition!`
      );
      } catch (error) {
        console.error(`Error processing user ${el.userId}:`, error);
        throw error; // Rethrow the error if you want it to propagate or handle it differently
      }
    })
  );
  
  return response2;
  
  

}catch(error){


}
}

module.exports ={handaleUserNoification}