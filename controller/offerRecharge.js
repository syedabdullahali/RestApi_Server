const { messaging } = require('firebase-admin')
const offerRecharge = require('../model/offerRecharge')
const userTrnasition = require('../model/Transaction')
const { pipeline } = require('nodemailer/lib/xoauth2')


const get_All_Recharge_Offer_Admin = async (req,res)=>{
    try{
        const response =  await offerRecharge.find()
        res.status(200).json({success:true, data:response})
    }catch (error){
        res.status(500).json({success:false,data:error})
    }
}

const get_All_Recharge_Offer = async (req,res)=>{
try{
    const response =  await offerRecharge.aggregate([
        {$unwind:"$rangeOption"},
        {
            $addFields: {
                bounusAmount: {
                $multiply: ["$bounus", "$rangeOption"]
              }
            }
          },
        {
            $project:{
                amount:"$rangeOption",
                bounusAmount:1,
                bounusPercentage:"$bounus",
                range:"$range",  
            }
        },
        {
            $sort:{
                amount:1
            }
        } 
    ])
    res.status(200).json({success:true, data:response})
}catch (error){
    res.status(500).json({success:false,data:error})
}
}

const get_All_Recharge_Offer_Byid = async (req,res)=>{
    try{
        const response =  await offerRecharge.findById(req.params.id)
        res.status(200).json({success:true, data:response})
    }catch (error){
        res.status(500).json({success:false,data:error})
    }
}

const create_Offer_Recharge = async (req,res)=>{
try{
    const [minBody,maxBody] =req.body?.range?.split(" - ")

    const offerRechargeList = await offerRecharge.find().select('range')


    const isAve = offerRechargeList.find((el,i)=>{
     const [max,min] = el?.range?.split(" - ")
     if((Number(max)>=Number(maxBody) || Number(min)<=Number(minBody))){
     }
     return (Number(max)>=Number(maxBody) || Number(min)>=Number(minBody))
    })

    if(isAve){
        res.status(403).json({success:false,data:{},message:"Range is already Available"})
    }else{
        const tempDoc =  new offerRecharge(req.body)
        const response =  await tempDoc.save()
        res.status(200).json({success:true, data:response,message:"Recharge Offer Created"})
    }
}catch (error){
        res.status(500).json({success:false,data:error,message:"Something went wrong....."})
}}

const update_Offer_Rechareg =async (req,res)=>{
try{
    const rsponse = await offerRecharge.findByIdAndUpdate(req.params.id,{...req.body},{new:true})
    res.status(200).json({success:true, data:rsponse})
}catch (error){
    res.status(500).json({success:false,data:error})
}}

const delete_Offer_Rechareg = async (req,res)=>{
    try{
        const rsponse = await offerRecharge.findByIdAndDelete(req.params.id)
        res.status(200).json({success:true, data:rsponse})
    }catch (error){
        res.status(500).json({success:false,data:error})
    }
}

// User ............................................//

const get_All_User_Recharge_Offer = async (req, res) => {
    try {
  
      let { page, limit,name="",startDate,endDate } = req.query; // Get pagination parameters
  
      page = parseInt(page) || 1; // Default page = 1
      limit = parseInt(limit) || 10; // Default limit = 10
  
      const skip = (page - 1) * limit;
      
      const referrals = await userTrnasition.aggregate([
       ...(startDate.trim()&&endDate.trim()?[{
          $match: {
            pay_date: { $gte: new Date(startDate), $lte: new Date(endDate) }, // Example date range filter
          },
        }]:[]),
        {
          $lookup: {
            from: "users", // MongoDB collection name for users
            localField: "user",
            pipeline:[
              {
                $project:{
                    name:1,
                    email:1
                }
              }
            ],
            foreignField: "_id",
            as: "user",
          },
        },
        {
          $unwind: "$user", // Convert userDetails array into an object
        },
        {
          $match: {
            "user.name": { $regex: name, $options: "i" }, // Filter user data
          },
        },
        {
          $skip: skip, // Apply pagination
        },
        {
          $limit: limit, // Limit the number of results
        },
      ]);
      const totalCount = await userTrnasition.aggregate(
        [
            ...(startDate.trim()&&endDate.trim()?[{
                $match: {
                  pay_date: { $gte: new Date(startDate), $lte: new Date(endDate) }, // Example date range filter
                },
              }]:[]),
              {
                $lookup: {
                  from: "users", // MongoDB collection name for users
                  localField: "user",
                  pipeline:[
                    {
                      $project:{
                          name:1,
                          email:1
                      }
                    }
                  ],
                  foreignField: "_id",
                  as: "user",
                },
              },
              {
                $unwind: "$user", // Convert userDetails array into an object
              },
              {
                $match: {
                  "user.name": { $regex: name, $options: "i" }, // Filter user data
                },
            },
            {
                $group: {
                    _id: null,
                    totalDocument: {
                        $sum: 1  // Ensure null values don't break the sum
                    }
                }
            }

        ]
      ); // Get total referrals count
      const totalBalance = await userTrnasition.aggregate([
        ...(startDate.trim()&&endDate.trim()?[{
            $match: {
              pay_date: { $gte: new Date(startDate), $lte: new Date(endDate) }, // Example date range filter
            },
          }]:[]),
          {
            $lookup: {
              from: "users", // MongoDB collection name for users
              localField: "user",
              pipeline:[
                {
                  $project:{
                      name:1,
                      email:1
                  }
                }
              ],
              foreignField: "_id",
              as: "user",
            },
          },
          {
            $unwind: "$user", // Convert userDetails array into an object
          },
          {
            $match: {
              "user.name": { $regex: name, $options: "i" }, // Filter user data
            },
        },
        {
            $group: {
                _id: null,
                totalBalance: {
                    $sum: { $ifNull: ["$pay_amount", 0] }  // Ensure null values don't break the sum
                }
            }
        }
      ]);
    
      res.json({
        success: true,
        currentPage: page,
        totalPages: Math.ceil(totalCount[0]?.totalDocument / limit),
        totalRechargeOffer: totalCount[0]?.totalDocument,
        data:referrals,
        totalBalance:totalBalance[0]?.totalBalance
      });
  
    } catch (error) {
      console.error("Error fetching referrals:", error);
      res.status(500).json({ success: false, message: "Internal Server Error" });
    }
  };

module.exports  = {
    get_All_Recharge_Offer,create_Offer_Recharge,
    update_Offer_Rechareg,delete_Offer_Rechareg,
    get_All_Recharge_Offer_Admin,
    get_All_Recharge_Offer_Byid ,
    get_All_User_Recharge_Offer
}