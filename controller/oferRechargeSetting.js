const offerRechargeSetting = require('../model/admin/oferRechargeSetting')
const create_Offer_Recharge = async (req,res)=>{
try{
    const offerRechargeSettingList = await offerRechargeSetting.findOne()
     
    if(offerRechargeSettingList){
     console.log(req.body)
     req.body.minimumCashBonusExpireDay =  Number(req.body.minimumCashBonusExpireDay)
     const response =  await  offerRechargeSetting.findByIdAndUpdate(offerRechargeSettingList?._id,req.body,{new:true})
     res.status(200).json({success:true, data:response,message:"Recharge Offer Setting Updated "})
    }else{
        const tempDoc =  new offerRechargeSetting(req.body)
        const response =  await tempDoc.save()
        res.status(200).json({success:true, data:response,message:"Recharge Offer Setting Updated "})
    }

}catch (error){
       console.log(error)
        res.status(500).json({success:false,data:error,message:"Something went wrong....."})
}}

const get_All_Offer_Recharge = async (req,res)=>{
    try{
        const response = await offerRechargeSetting.find()
        res.status(200).json({success:true, data:response[0],message:"Recharge Offer Setting Updated "})
    }catch (error){
        res.status(500).json({success:false,data:error,message:"Something went wrong....."})
    }}
    

module.exports = {create_Offer_Recharge,get_All_Offer_Recharge}