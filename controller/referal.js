const Referral = require('../model/user/referal');
const User = require('../model/user/user');
const referalController = require("../model/referalController"); 
const { Types, default: mongoose } = require('mongoose');
const referalCounter = require("../model/user/referalCount");
// Generate a unique referral code
const generateReferralCode = () => {
  return Math.random().toString(36).substr(2, 8).toUpperCase();
};

// Create a referral
const createReferral = async (req, res) => {

  try {
    const randomNum = Math.floor(Math.random() * (10 - 1 + 1)) + 1;
    let latestCounter = 0
    const response = await referalCounter.findOne()
     if(!response){
         const tempDoc = new referalCounter({
          sequence_value:1
         })
        const res =  await tempDoc.save()
        latestCounter=res.sequence_value
     }else {
      response.sequence_value+=randomNum
      const res =  await response.save()
      latestCounter=res.sequence_value
     }
    

    const { referrerId } = req.body;
    const referalResponse = await referalController.findOne()
    const referrer = await User.findById(referrerId);

    if (!referrer) return res.status(404).json({ message: "Referrer not found" });

    // Generate unique referral code
    const referralCode = generateReferralCode();

    const newReferral = new Referral({
      referrerId,
      referralCode:referralCode+""+latestCounter,
      status:"Pending",
      creditRewardAmount:0,
      rewardAmount:referalResponse?.amount|100,
      amountDistributionPercentage:referalResponse?.amountDistributionPercentage|50,
      referalType:referalResponse.referalType,
      isLogin:false
    });

    await newReferral.save();
    res.status(201).json({ message: "Referral created successfully", referral: newReferral });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getReferrals = async (req, res) => {
  try {

    const pipeline = [
      {
         $lookup:{
          from:"users",
          localField:"referrerId",
          pipeline:[
               {
                $project:{
                  name:1,
                  mobileNumber:1,
                  _id:1,
                  email:1  
                }
               }
          ],
          foreignField:"_id",
          as:"userDetails" 
         }
      },
      {
        $unwind:"$userDetails"
      },
      {
        $group:{
          _id:"$referrerId",
          name:{$first:"$userDetails.name"},
          mobileNumber:{$first:"$userDetails.mobileNumber"},
          userId:{$first:"$userDetails._id"},
          email:{$first:"$userDetails.email"},
          totalReferal:{
           $sum:1
          },
          totalAmount:{
            $sum:{
              rewardAmount:"$rewardAmount"
            }
          },
          totalEarnAmount:{
            $sum:"$creditRewardAmount"
          },
          totalPendingAmount:{
            $sum:{
              $subtract: ["$rewardAmount", "$creditRewardAmount"]
            }
          },
          pendingReferal: {
            $sum: {
              $cond: {
                if: { $ne: ["$status", "Completed"] }, // If status is NOT "Completed"
                then: 1,
                else: 0
              }
            }
          },
          successFullReferal: {
            $sum: {
              $cond: {
                if: { $eq: ["$status", "Completed"] }, // If status IS "Completed"
                then: 1,
                else: 0
              }
            }
          }
        }
      }
    ]

    let { page, limit } = req.query; // Get pagination parameters

    page = parseInt(page) || 1; // Default page = 1
    limit = parseInt(limit) || 10; // Default limit = 10

    const skip = (page - 1) * limit;

    // Find users who were referred by the given userId
    const referrals = await Referral.aggregate(pipeline)
      .skip(skip)
      .limit(limit)

    const totalCount = await Referral.countDocuments(); // Get total referrals count

    res.json({
      success: true,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      totalReferrals: totalCount,
      data:referrals,
    });

  } catch (error) {
    // console.error("Error fetching referrals:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const getReferralsById = async (req, res) => {
  try {

    const {userId} =  req.params

    let { page, limit } = req.query; // Get pagination parameters

    page = parseInt(page) || 1; // Default page = 1
    limit = parseInt(limit) || 10; // Default limit = 10

    const skip = (page - 1) * limit;

    // Find users who were referred by the given userId
    const pipeline = [
      {
       $match:{
        referrerId:new Types.ObjectId(userId)
       }
      },
      {
         $lookup:{
          from:"users",
          localField:"referrerId",
          pipeline:[
               {
                $project:{
                  name:1,
                  mobileNumber:1,
                  _id:1,
                  email:1  
                }
               }
          ],
          foreignField:"_id",
          as:"userDetails" 
         }
      },
      {
        $unwind:"$userDetails"
      },
      {
        $group:{
          _id:"$referrerId",
          name:{$first:"$userDetails.name"},
          mobileNumber:{$first:"$userDetails.mobileNumber"},
          userId:{$first:"$userDetails._id"},
          email:{$first:"$userDetails.email"},
          totalReferal:{
           $sum:1
          },
          totalAmount:{
            $sum:{
              rewardAmount:"$rewardAmount"
            }
          },
          totalEarnAmount:{
            $sum:"$creditRewardAmount"
          },
          totalPendingAmount:{
            $sum:{
              $subtract: ["$rewardAmount", "$creditRewardAmount"]
            }
          },
          pendingReferal: {
            $sum: {
              $cond: {
                if: { $ne: ["$status", "Completed"] }, // If status is NOT "Completed"
                then: 1,
                else: 0
              }
            }
          },
          successFullReferal: {
            $sum: {
              $cond: {
                if: { $eq: ["$status", "Completed"] }, // If status IS "Completed"
                then: 1,
                else: 0
              }
            }
          }
        }
      }
    ]

    const response = await Referral.aggregate(pipeline)
    .skip(skip)
    .limit(limit)

    const referrals = await Referral.find({referrerId:userId})
      .skip(skip)
      .limit(limit)

    const totalCount = await Referral.countDocuments({referrerId:userId}); // Get total referrals count

    res.json({
      success: true,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      totalReferrals: totalCount,
      userDashBordData:response[0],
      data:referrals
    });

  } catch (error) {
    console.error("Error fetching referrals:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const getAllreferedUsre = async (req,res)=>{
 const userId =  req.user._id

 try{
  const referal = await Referral.aggregate([
    { 
      $match: { referrerId: new mongoose.Types.ObjectId(userId) } // Filter by userId
    },
    {
      $lookup: {
        from: 'users', // Assuming the 'refereeId' references the 'users' collection
        localField: 'refereeId',
        foreignField: '_id',
        as: 'refereeDetails'
      }
    },
    {
      $unwind: '$refereeDetails' // Unwind the 'refereeDetails' array to get the individual document
    },
    {
      $project: {
        rewardAmount: 1,
        creditRewardAmount: 1,
        status: 1,
        'refereeDetails.name': 1,
        'refereeDetails.email': 1,
        'refereeDetails.mobileNumber': 1
      }
    }
  ]);
  

  res.status(200).json({success:true,
    referedUserdata:referal,
    referalCode:req.user.referalCode
  })

 }catch(error){
    res.status(500).json({
      success:false,
      message:error.message||"Something went wrong....."
    })
 }
}

// Get all referrals
// exports.getReferrals = async (req, res) => {
//   try {
//     const referrals = await Referral.find().populate('referrerId refereeId');
//     res.status(200).json(referrals);
//   } catch (error) {
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };

// // Get referrals by referrerId
// exports.getReferralsByReferrer = async (req, res) => {
//   try {
//     const { referrerId } = req.params;
//     const referrals = await Referral.find({ referrerId }).populate('referrerId refereeId');
//     res.status(200).json(referrals);
//   } catch (error) {
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };

// // Register a referee using referral code
// exports.registerReferee = async (req, res) => {
//   try {
//     const { referralCode, refereeId } = req.body;

//     // Check if referral exists
//     const referral = await Referral.findOne({ referralCode });
//     if (!referral) return res.status(404).json({ message: "Invalid referral code" });

//     // Update referral with refereeId
//     referral.refereeId = refereeId;
//     referral.status = 'Completed';
//     referral.creditRewardAmount += 10; // Example: Giving a reward on successful referral
//     await referral.save();

//     res.status(200).json({ message: "Referral completed successfully", referral });
//   } catch (error) {
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };

// // Delete a referral
// exports.deleteReferral = async (req, res) => {
//   try {
//     const { id } = req.params;
//     await Referral.findByIdAndDelete(id);
//     res.status(200).json({ message: "Referral deleted successfully" });
//   } catch (error) {
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };

module.exports = {createReferral,getReferrals,getReferralsById,getAllreferedUsre}