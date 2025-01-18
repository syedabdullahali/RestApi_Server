const  PaymentIntegrationKey =  require('../model/PaymentIntegrationKey')

exports.getAllPaymentIntegrationKey = async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query; // Default to page 1 and limit 10 if not provided
      const kycRecords = await PaymentIntegrationKey.find()
        .skip((page - 1) * limit) // Skip the documents based on the current page
        .limit(parseInt(limit)) // Limit the number of documents
        .populate('user', 'name mobileNumber email image address')
        .exec();

      const totalRecords = await PaymentIntegrationKey.countDocuments(); // Get the total count of records
      return res.status(200).send({
        success: true,
        data: kycRecords,
        page: parseInt(page),
        limit: parseInt(limit),
        totalRecords,
        totalPages: Math.ceil(totalRecords / limit),
        message: "Payment Integration Key Retrieved Successfully",
      });
    } catch (err) {
      return res.status(500).send({
        success: false,
        message: "Internal Server Error",
        error: err.message,
      });
    }
};
  

exports.deletePaymentIntegrationKey = async (req, res) => {
    try {
      const kycRecords = await PaymentIntegrationKey.findByIdAndDelete(req.params.id)
      return res.status(200).send({
        success: true,
        data: kycRecords,
      });
    } catch (err) {
      return res.status(500).send({
        success: false,
        message: "Internal Server Error",
        error: err.message,
      });
    }
};

exports.updatePaymentIntegrationKey = async (req, res) => {
    try {
      const kycRecords = await PaymentIntegrationKey.findByIdAndUpdate(req.params.id,req.body,{new:true})
      return res.status(200).send({
        success: true,
        data: kycRecords,
      });
    } catch (err) {
      return res.status(500).send({
        success: false,
        message: "Internal Server Error",
        error: err.message,
      });
    }
};

exports.postPaymentIntegrationKey = async (req, res) => {
    try {
      const temp = new PaymentIntegrationKey(req.params.id,req.body,{new:true})
      const kycRecordsTemp =await temp.save()
      return res.status(200).send({
        success: true,
        data: kycRecordsTemp,
      });
    } catch (err) {
      return res.status(500).send({
        success: false,
        message: "Internal Server Error",
        error: err.message,
      });
    }
};