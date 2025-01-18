const offerRecharge = require('../model/offerRecharge')

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
                bounusAmount:1
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
    const tempDoc =  new offerRecharge(req.body)
    const response =  await tempDoc.save()
    res.status(200).json({success:true, data:response})
}catch (error){
    res.status(500).json({success:false,data:error})
    
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

module.exports  = {
    get_All_Recharge_Offer,create_Offer_Recharge,
    update_Offer_Rechareg,delete_Offer_Rechareg,
    get_All_Recharge_Offer_Admin,
    get_All_Recharge_Offer_Byid 
}