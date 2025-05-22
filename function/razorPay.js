const dotenv = require('dotenv')
dotenv.config()
const crypto = require('crypto');

// const secret = process.env.RAZOR_SECRET_KEY

exports.verifySignature = (orderId, paymentId, signature, secret) => {
    // console.log("orderId: ", orderId);
    // console.log("orderId: ", paymentId);
    // console.log("orderId: ", signature);
    // console.log("orderId: ", secret);
    const dataString = `${orderId}|${paymentId}`;
    const generatedSignature = crypto.createHmac('sha256', secret).update(dataString).digest('hex');
    // console.log("signature: ", signature);
    // console.log("generatedSignature: ", generatedSignature);
    return generatedSignature === signature;
}


/* exports.verifySignature = (razorpay_payment_id, order_id, razorpay_signature) => {
    console.log("getting in : ", razorpay_payment_id);
    console.log("getting in order_id : ", order_id);
    console.log("getting in razorpay_signature : ", razorpay_signature);


    const dataString = `${order_id}|${razorpay_payment_id}`;
    const generatedSignature = crypto.createHmac('sha256', secret).update(dataString).digest('hex');

    return generatedSignature === signature;




      const dataString = `${order_id}|${razorpay_payment_id}`;
      const generatedSignature = crypto.createHmac('sha256', secret).update(dataString).digest('hex');
      console.log("dataString: ", dataString);
      console.log("generatedSignature: ", generatedSignature);
  
      console.log("razorpay_signature: ", razorpay_signature);
      return generatedSignature === razorpay_signature; 

} */