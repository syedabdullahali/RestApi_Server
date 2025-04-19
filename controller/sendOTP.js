require("dotenv").config()
const APIKEY = process.env.api_key_2Factor
// const TwoFactor = new (require('2factor'))(process.env.api_key_2Factor)
const TwoFactor = new (require('2factor'))(APIKEY)
var axios = require('axios');


exports.sendOTP = async (mobile) => {
    try {
        const formattedMobile = `${mobile}`;
        const templateName = "WonByBid";

        console.log(`Sending OTP to ${formattedMobile} using template "${templateName}"`);

        const sessionId = await TwoFactor.sendOTP(formattedMobile, { template: templateName });

        console.log("OTP sent successfully. Session ID:", sessionId);
        return sessionId;
    } catch (error) {
        console.error("Failed to send OTP:", error);
        return error;
    }
};

exports.verifyOTPFactor = async (sessionId, otp) => {
    try {
      console.log(`🔍 Verifying OTP for session: ${sessionId}`);
      const response = await TwoFactor.verifyOTP(sessionId, otp);
      console.log("✅ OTP Response:", response);
  
      if (response !== "OTP Matched") {
        return { success: false, message: `OTP verification failed: ${response}` };
      }
  
      return { success: true, message: response };
    } catch (error) {
      return { success: false, message: `OTP verification failed: ${error}` };
    }
  };
  
exports.urlSendTestOtp = async (mobile) => {
    try {
        var config = {
            method: 'get',
            maxBodyLength: Infinity,
            url: `https://2factor.in/API/V1/${APIKEY}/SMS/+91${mobile}/AUTOGEN/OTP1`,
            headers: {}
        };

        const response = await axios(config);
        // console.log("response: ", response.data);
        return response.data; // Return actual response data
    } catch (error) {
        console.log("error: ", error);
        throw error; // Ensure the error is propagated
    }
};

exports.urlVerifyOtp = async (sessionId, otp) => {
    try {
        const config = {
            method: 'get',
            maxBodyLength: Infinity,
            url: `https://2factor.in/API/V1/${APIKEY}/SMS/VERIFY/${sessionId}/${otp}`,
            headers: {}
        };

        const response = await axios(config);
        // console.log("Response: ", response.data);
        return response.data; // Return the actual data
    } catch (error) {
        console.log("Error: ", error.message);
        throw error; // Ensure the error is propagated
    }
};
