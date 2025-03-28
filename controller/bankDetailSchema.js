const bankDetails = require("../model/bankDetails")

const createBankDetail = async (req, res) => {
  try {
    let response = {};
    const userId = req?.body?.user?._id ?req?.body?.user?._id:req.user._id
    
    // Check if bank detail exists for the user
    const existingBankDetail = await bankDetails.findOne({ user: userId });

    if (!existingBankDetail) {
      // Create new bank detail
      const tempDoc = new bankDetails({...req.body,user:userId});
      response = await tempDoc.save();
    } else {
      // Update existing bank detail
      response = await bankDetails.findOneAndUpdate(
        { user: userId },
        req.body,
        { new: true }
      );
    }

    res.status(200).json({
      success: true,
      data: response,
      message: "Bank Detail Created/Updated Successfully",
    });
  } catch (error) {
    console.error("Error in createBankDetail:", error);
    res.status(500).json({
      success: false,
      data: error.message,
      message: "Something Went Wrong...",
    });
  }
};


const getBankDetail  = async (req,res)=>{

    const page =  req.query.page ||1
    const limit =  req.query.limit ||10

    try{ 

    const documentCount = await bankDetails.countDocuments()

    const response = await bankDetails.find()
    .populate({
        path:"user",
        select:"name email mobileNumber"
    })
    .skip((page-1)*limit)
    .limit(limit)
    .exec()

    res.status(200).json({success:true,data:{
        data:response,
        totalDocument:documentCount,
        totalPages:documentCount/limit,
        currentPage:page,
    },message:"Fetch Bank Detail Successfully"})

    }catch(error){
    res.status(500).json({success:false,data:error,message:"Somthing Went Wrong ....."})
 }
}

const deleteBankDetail = async (req, res) => {
  const { id } = req.params;
  try {
    const response = await bankDetails.findByIdAndDelete(id);
    res.status(200).json({
      success: true,
      data: response,
      message: "Successfully deleted Bank Detail",
    });
  } catch (error) {
    console.error(error)
    res
      .status(500)
      .json({
        success: false,
        data: error,
        message: "Somthing Went Wrong .....",
      });
  }
}; 


const getBankDetailById  = async (req,res)=>{
    try{ 
    const response = await bankDetails.findOne({user:req.user._id})
    .populate({
        path:"user",
        select:"name email mobileNumber"
    })

    res.status(200).json({success:true,data:response,message:"Fetch Bank Detail Successfully"})
    }catch(error){
    res.status(500).json({success:false,data:error,message:"Somthing Went Wrong ....."})
 }
}


module.exports = {createBankDetail,getBankDetail,deleteBankDetail,getBankDetailById}