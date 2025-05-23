const SignUp = require("../model/admin/SignUp");
const router = require("express").Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken"); // assuming you want to use JWT for authentication
const sendOtpMail = require("../function/sendOtpMail");
const authenticateToken = require("../middleware/authenticateToken");

require("dotenv").config();

router.get("/getProfile", authenticateToken.authenticateToken, async (req, res) => {
  try {
    const user = await SignUp.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(user);
  } catch (error) {
    res
      .status(500)
      .json({ error: error.message, message: "Something went wrong..." });
  }
});

router.patch("/updateProfile", authenticateToken.authenticateToken, async (req, res) => {
  try {
    const updateData = { ...req.body };

    const user = await SignUp.findByIdAndUpdate(req.user.id, updateData, {
      new: true,
      select: "-password -otp",
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res
      .status(200)
      .json({ data: user, message: "Profile updated successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ error: error.message, message: "Something went wrong..." });
  }
});

router.post("/create", async (req, res) => {
  try {
    const findUser = await SignUp.findOne({ email: req.body.email });
    const emailExists = !findUser;

    if (emailExists) {
      const hashedPassword = await bcrypt.hash(req.body.password, 10);
      const tempDoc = new SignUp({ ...req.body, password: hashedPassword });
      const saveDoc = await tempDoc.save();
      res.status(200).json({ data: saveDoc, message: "Successfully saved" });
    } else {
      res.status(409).json({ message: "Usre All Ready exist" });
    }
  } catch (error) {
    res.status(500).json({ error: error, message: "Something went wrong..." });
  }
});

router.post("/login", async (req, res) => {
  try {
    const min = 100000;
    const max = 999999;
    const generatedOTP = Math.floor(Math.random() * (max - min + 1)) + min;

    const { email, password, fcmToken } = req.body;
    // Find the user by email
    const findUser = await SignUp.findOne({ email });

    if (!findUser) {
      return res.status(401).json({ message: "User does not exist" });
    }

    const isPasswordValid = await bcrypt.compare(password, findUser.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid password" });
    }
    await SignUp.findByIdAndUpdate(
      findUser._id,
      { otp: generatedOTP, fcmToken: fcmToken },
      { new: true }
    );

    console.log("otp: ", generatedOTP);


    sendOtpMail(email, generatedOTP);

    res.status(200).json({ message: "Login successful" });
  } catch (error) {
    res.status(500).json({ error: error.message, message: "Something went wrong..." });
  }
});

router.post("/verify_otp", async (req, res) => {
  try {
    const { otp, email } = req.body;

    const findUser = await SignUp.findOne({ email, otp });

    if (!findUser) {
      return res.status(401).json({ message: "Invalid OTP or email." });
    }
    const token = jwt.sign(
      { id: findUser._id, email: findUser.email, role: findUser?.type },

      process.env.SECRET_KEY, // Use your secret key
      { expiresIn: "365d" } // Expires in 365 days (1 year)
    );

    res.status(200).json({
      message: "Successfully saved",
      token,
      name: findUser.name || "",
      id: findUser._id || "",

    });

  } catch (error) {
    res
      .status(500)
      .json({ error: error.message, message: "Something went wrong..." });
  }
});

router.post("/verify_email", async (req, res) => {
  try {
    const { email } = req.body;

    const min = 100000;
    const max = 999999;
    const generatedOTP = Math.floor(Math.random() * (max - min + 1)) + min;

    const findUser = await SignUp.findOne({ email });
    await SignUp.findByIdAndUpdate(
      findUser._id,
      { otp: generatedOTP },
      { new: true }
    );

    if (!findUser) {
      return res.status(401).json({ message: "Invalid OTP or email." });
    }
    sendOtpMail(email, generatedOTP);
    res.status(200).json({ message: "Successfully Confirm" });
  } catch (error) {
    res
      .status(500)
      .json({ error: error.message, message: "Something went wrong..." });
  }
});

router.post("/verify_email_otp", async (req, res) => {
  try {
    const { otp, email } = req.body;

    const findUser = await SignUp.findOne({ email, otp });

    if (!findUser) {
      return res.status(401).json({ message: "Invalid OTP or email." });
    }

    const token = jwt.sign(
      { id: findUser._id, email: findUser.email },
      process.env.SECRET_KEY, // Use your secret key
      { expiresIn: "365d" } // Expires in 365 days (1 year)
    );

    res.status(200).json({
      message: "Successfully saved",
      token,
      email: findUser.email || "",
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: error.message, message: "Something went wrong..." });
  }
});

router.post("/create_verify_email_password", async (req, res) => {
  try {
    const findUser = await SignUp.findOne({ email: req.body.email });
    const emailExists = findUser;
    if (emailExists) {
      const hashedPassword = await bcrypt.hash(req.body.password, 10);
      await SignUp.findByIdAndUpdate(
        findUser._id,
        { password: hashedPassword },
        { new: true }
      );
      res
        .status(200)
        .json({ data: req.body.email, message: "Successfully saved" });
    } else {
      res.status(400).json({ message: "Bad request" });
    }
  } catch (error) {
    res
      .status(500)
      .json({ error: error.message, message: "Something went wrong..." });
  }
});

router.post("/update-password", async (req, res) => {
  try {
    const { email, oldPassword, newPassword } = req.body;

    // Find the user by email
    const findUser = await SignUp.findOne({ email });
    if (!findUser) {
      return res.status(401).json({ message: "User does not exist" });
    }

    // Validate the old password
    const isPasswordValid = await bcrypt.compare(
      oldPassword,
      findUser.password
    );
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Old password is incorrect" });
    }

    // Hash the new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password
    findUser.password = hashedNewPassword;
    await findUser.save();

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ error: error.message, message: "Something went wrong..." });
  }
});

// Get All Admin Users with Search and Pagination
router.get("/all", async (req, res) => {
  try {
    const { name, page = 1, limit = 10 } = req.query;

    let query = {};

    if (name) {
      const regexPattern = new RegExp(name, "i"); // Create case-insensitive regex pattern
      query.$or = [
        { name: { $regex: regexPattern } },
        { email: { $regex: regexPattern } },
      ];
    }

    // Calculate the total number of documents for pagination
    const totalDocuments = await SignUp.countDocuments(query);

    // Find users with pagination and search query
    const users = await SignUp.find(query)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .exec();

    res.status(200).json({
      data: users,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalDocuments / limit),
      totalDocuments,
      message: "Successfully fetched",
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: error.message, message: "Something went wrong..." });
  }
});

router.patch("/update/:id", async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (req.body?.password) {
      updateData.password = await bcrypt.hash(req.body.password, 10);
    }
    const response = await SignUp.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
    });
    return res.status(200).json(response);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete("/delete/:id", async (req, res) => {
  try {
    const response = await SignUp.findByIdAndDelete(req.params.id);
    return res.status(200).json(response);
  } catch (err) {
    return res.status(500).json({ error: err });
  }
});

module.exports = router;
