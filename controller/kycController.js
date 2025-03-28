const UserModel = require("../model/user/user");
const userKyc = require("../model/userKyc");
const KYC = require("../model/userKyc");
const Withdraw = require("../model/widthrawhistory");
const moment = require("moment");

const isValidPAN = (panNumber) => {
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  return panRegex.test(panNumber);
};

const isValidAadhaar = (aadhaarNumber) => {
  const aadhaarRegex = /^[0-9]{12}$/;
  return aadhaarRegex.test(aadhaarNumber);
}

exports.CreateKYC = async (req, res) => {
  const { _id } = req.user;
  const data = req.body;
  try {
    const check = await KYC.findOne({ user: _id });
    if (check) {
      return res.status(400).send({ success: false, message: "KYC Already Applied" });
    }
    const validaadhar = isValidAadhaar(data.aadharNumber);
    if (!validaadhar) {
      return res.status(403).send({ success: false, message: "Invalid Aadhar Number" })
    }
    const validpan = isValidPAN(data.pancardNumber)
    if (!validpan) {
      return res.status(403).send({ success: false, message: "Invalid PAN Card" })
    }
    const response = await KYC.create({ ...data, user: _id });
    return res.status(201).send({ success: true, data: response, message: "KYC Apply successfully", });
  } catch (err) {
    return res.status(500).send({ success: false, message: "Internal Server Error", error: err.message, });
  }
};

// for the user kyc for adhar and pan card and making boolean value to true in documentKYC
// and this controller function will only udpate document (adhar and pan card)
exports.updatedDocuments = async (req, res) => {
  // console.log("req.body: ", req.body);

  const { _id } = req.user
  const pancardNumber = req.body?.pancardNumber
  const aadharNumber = req.body?.aadharNumber
  const aadhar_photo = req.body?.aadhar_photo
  const pancard_photo = req.body?.pancard_photo

  try {
    const checkUser = await UserModel.findById(_id)

    if (!checkUser) {
      return res.status(404).send({ success: false, message: "User not found" });
    }

    const validaadhar = isValidAadhaar(aadharNumber);
    if (!validaadhar) {
      return res.status(400).send({ success: false, message: "Invalid Aadhar Number" })
    }
    const validpan = isValidPAN(pancardNumber)
    if (!validpan) {
      return res.status(400).send({ success: false, message: "Invalid PAN Card" })
    }

    if (!aadhar_photo) {
      return res.status(400).send({ success: false, message: "Aadhar photo is required" });
    }
    if (!pancard_photo) {
      return res.status(400).send({ success: false, message: "Pan card photo is required" });
    }

    const checkKYCUser = await userKyc.findOne({ user: _id })

    if (checkKYCUser) {
      checkKYCUser.aadharNumber = aadharNumber
      checkKYCUser.aadhar_photo = aadhar_photo
      checkKYCUser.pancardNumber = pancardNumber
      checkKYCUser.pancard_photo = pancard_photo
      // checkKYCUser.documentKYC = true
      const result = await checkKYCUser.save()

      if (result) {
        return res.status(200).send({ success: true, data: result, message: "KYC updated successfully", });
      }
      return res.status(403).send({ success: false, message: "Failed to update kyc" });
    }

    const result = await userKyc.create({ user: _id, aadharNumber, aadhar_photo, pancardNumber, pancard_photo, });
    if (result) {
      return res.status(201).send({ success: true, data: result, message: "KYC Apply successfully", });
    }
    return res.status(403).send({ success: false, message: "Failed to apply kyc" });
  } catch (error) {
    // console.log("error on kyc: ", error);
    return res.status(500).send({ success: false, message: "Internal Server Error", error: error.message, });
  }
}

// this controller is responsible for bank kyc for user
exports.BankKyc = async (req, res) => {
  const { _id } = req.user
  const upiId = req.body?.upiId
  const bankName = req.body?.bankName
  const accountNumber = req.body?.accountNumber
  const ifscCode = req.body?.ifscCode
  // const branchName = req.body?.branchName
  try {
    const checkUser = await UserModel.findById(_id)
    if (!checkUser) {
      return res.status(404).send({ success: false, message: "User not found" });
    }
    if (!upiId || !bankName || !accountNumber || !ifscCode) {
      return res.status(400).send({ success: false, message: "All fields are required" });
    }
    checkUser.bankName = bankName
    checkUser.upiId = upiId
    checkUser.accountNumber = accountNumber
    checkUser.ifscCode = ifscCode
    // checkUser.branchName = branchName
    const result = await checkUser.save()
    if (result) {
      return res.status(200).send({ success: true, data: result, message: "Bank Kyc updated successfully", });
    }
    return res.status(400).send({ success: false, message: "Failed to update bank kyc" });
  } catch (error) {
    return res.status(500).send({ success: false, message: "Internal Server Error", error: error.message, });
  }
}

exports.UpdateKYC = async (req, res) => {
  const { _id } = req.user;
  const data = req.body;

  try {
    const kyc = await KYC.findOne({ user: _id });
    if (!kyc) {
      return res.status(404).send({ success: false, message: "KYC not found" });
    }


    if (data.aadharNumber && !isValidAadhaar(data.aadharNumber)) {
      return res.status(403).send({ success: false, message: "Invalid Aadhaar Number" });
    }

    if (data.pancardNumber && !isValidPAN(data.pancardNumber)) {
      return res.status(403).send({ success: false, message: "Invalid PAN Card Number" });
    }

    const updatedKYC = await KYC.findByIdAndUpdate(
      kyc._id,
      { $set: data },
      { new: true, runValidators: true }
    );

    return res.status(200).send({
      success: true,
      data: updatedKYC,
      message: "KYC updated successfully",
    });
  } catch (err) {
    return res.status(500).send({
      success: false,
      message: "Internal Server Error",
      error: err.message,
    });
  }
};

exports.updatePersonalInformation = async (req, res) => {
  const { _id } = req.user;
  const name = req.body?.fullName
  const dob = req.body?.dob
  const pincode = req.body?.pincode
  const address = req.body?.address
  const state = req.body?.state
  const city = req.body?.city


  try {
    if (!_id) {
      return res.status(403).send({ success: false, message: "Access Denaid!" });
    }
    const checkUser = await UserModel.findById(_id)
    if (!checkUser) {
      return res.status(404).send({ success: false, message: "User not found" });
    }
    const checkUserKyc = await userKyc.findOne({ user: _id })
    if (checkUserKyc) {
      checkUserKyc.name = name
      checkUserKyc.dob = dob
      checkUserKyc.pincode = pincode
      checkUserKyc.address = address
      checkUserKyc.state = state
      checkUserKyc.city = city
      const result = await checkUserKyc.save()
      if (result) {
        return res.status(200).send({ success: true, data: result, message: "KYC updated successfully", });
      }
      return res.status(400).send({ success: false, message: "Failed to update kyc" });
    } else {
      const newUserKyc = await userKyc.create({ user: _id, name, dob, pincode, address, state, city });
      if (newUserKyc) {
        return res.status(201).send({ success: true, data: newUserKyc, message: "KYC created successfully", });
      }
      return res.status(400).send({ success: false, message: "Failed to create kyc" });
    }
  } catch (error) {
    return res.status(500).send({ success: false, message: "Internal Server Error", error: err.message, });
  }
}

exports.kycEamilUpdate = async (req, res) => {
  const { _id } = req.user;
  const email = req.body?.email;

  try {
    if (!_id) {
      return res.status(403).send({ success: false, message: "Access Denaid!" });
    }
    const checkUser = await UserModel.findById(_id)
    if (!checkUser) {
      return res.status(404).send({ success: false, message: "User not found" });
    }
    const checkUserKyc = await userKyc.findOne({ user: _id })
    if (checkUserKyc) {
      checkUserKyc.email = email
      const result = await checkUserKyc.save()
      if (result) {
        return res.status(200).send({ success: true, data: result, message: "KYC updated successfully", });
      }
      return res.status(400).send({ success: false, message: "Failed to update kyc" });
    } else {
      const newUserKyc = await userKyc.create({ user: _id, email });
      if (newUserKyc) {
        return res.status(201).send({ success: true, data: newUserKyc, message: "KYC created successfully", });
      }
      return res.status(400).send({ success: false, message: "Failed to create kyc" });
    }
  } catch (error) {
    return res.status(500).send({ success: false, message: "Internal Server Error", error: err.message, });
  }
}

exports.GETKYC = async (req, res) => {
  const { _id } = req.user;

  try {
    // const kyc = await KYC.findOne({ user: _id }).populate("user")
    const kyc = await KYC.findOne({ user: _id }).populate({ path: "user", select: "-contestNotification -joinPrivateContest -type -contestnotify -activePercentage -otp" });
    if (!kyc) {
      return res.status(404).send({ success: false, message: "KYC not found" });
    }
    // console.log("kyc: ", kyc);

    return res.status(200).send({ success: true, data: kyc, });
  } catch (err) {
    return res.status(500).send({ success: false, message: "Internal Server Error", error: err.message, });
  }
};



//By Admin
exports.updateKYCStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const allowedStatuses = ["Pending", "Reject", "Approve"];
  if (!allowedStatuses.includes(status)) {
    return res.status(400).send({
      success: false,
      message:
        "Invalid status value. Allowed values are: Pending, Reject, Approve",
    });
  }

  try {
    const updatedKYC = await KYC.findByIdAndUpdate(
      id,
      { $set: { status: status } },
      { new: true, runValidators: true }
    );

    if (!updatedKYC) {
      return res
        .status(404)
        .send({ success: false, message: "KYC record not found" });
    }

    return res.status(200).send({
      success: true,
      data: updatedKYC,
      message: "KYC status updated successfully",
    });
  } catch (err) {
    return res.status(500).send({
      success: false,
      message: "Internal Server Error",
      error: err.message,
    });
  }
};
exports.getAllKYC = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query; // Default to page 1 and limit 10 if not provided

    const kycRecords = await KYC.find()
      .skip((page - 1) * limit) // Skip the documents based on the current page
      .limit(parseInt(limit)) // Limit the number of documents
      .populate('user', 'name mobileNumber email image address')
      .exec();

    const totalRecords = await KYC.countDocuments(); // Get the total count of records

    if (!kycRecords || kycRecords.length === 0) {
      return res.status(404).send({
        success: false,
        message: "No KYC records found",
      });
    }

    return res.status(200).send({
      success: true,
      data: kycRecords,
      page: parseInt(page),
      limit: parseInt(limit),
      totalRecords,
      totalPages: Math.ceil(totalRecords / limit),
      message: "KYC records retrieved successfully",
    });
  } catch (err) {
    return res.status(500).send({
      success: false,
      message: "Internal Server Error",
      error: err.message,
    });
  }
};



exports.GETKYCBYAdmin = async (req, res) => {
  const { id } = req.params;

  try {
    const kyc = await KYC.findById(id);
    if (!kyc) {
      return res.status(404).send({ success: false, message: "KYC not found" });
    }
    return res.status(200).send({
      success: true,
      data: kyc,
    });
  } catch (err) {
    return res.status(500).send({
      success: false,
      message: "Internal Server Error",
      error: err.message,
    });
  }
};





//user Withdraw

exports.createwidthraw = async (req, res) => {
  const { _id } = req.user;
  const data = req.body;
  try {
    const response = await Withdraw.create({ ...data, user: _id });
    if (!response)
      return res.status(201).send({
        success: true,
        data: response,
        message: "Withdraw successfully",
      });

    return res.status(201).send({ success: true, data: response, message: "Withraw created" })
  } catch (err) {
    return res.status(500).send({
      success: false,
      message: "Internal Server Error",
      error: err.message,
    });
  }
};




//get all widthraw by admin using userId
exports.getWidthraws = async (req, res) => {
  const { id } = req.params;
  const { transactionId, sort, startDate, endDate } = req.query;

  try {
    const filter = { user: id };
    if (transactionId) {
      filter.transactionId = transactionId;
    }

    if (startDate && endDate) {
      const start = moment(startDate, "DD-MM-YYYY").startOf("day").toDate();
      const end = moment(endDate, "DD-MM-YYYY").endOf("day").toDate();

      filter.createdAt = {
        $gte: start,
        $lte: end,
      };
    }

    let sortOption = {};
    if (sort === "asc") {
      sortOption.amount = 1;
    } else if (sort === "desc") {
      sortOption.amount = -1;
    }

    console.log("filter>>>>", filter);
    const withdrawals = await Withdraw.find(filter).sort(sortOption);
    res.status(200).json({
      message: "Withdrawals retrieved successfully",
      data: withdrawals,
    });
  } catch (err) {
    res.status(500).json({
      message: "Error retrieving withdrawals",
      error: err.message,
    });
  }
};
