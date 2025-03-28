const mongoose = require('mongoose')



const TransactionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Types.ObjectId,
        ref: 'User', // Reference to the User model
    },
    razorpay_payment_id: {
        type: String
    },
    transactionType: {
        // wallet or booking
        type: String,
        default: 'wallet'
    },
    payment: {
        type: Number
    },
    order_id: {
        type: String
    },
    paymentError: {
        type: String
    },
    paymentStatus: {
        type: String,
        default: 'pending'
    },
    type: {
        type: String,
        enum: ['credit', 'debit', 'withdraw', 'winning'],
    },
    amountType: {
        type: String,
        enum: ['realAmount', 'bonusAmount', 'gstDeduct', 'tdsDeduct', 'referral'],
        // required: true
    },
    transaction_id: {
        type: Number
    },
    transaction_purpose: {
        type: String,
    },
    pay_amount: {
        type: Number,
    },
    pay_date: {
        type: Date,
    },
    refund_at: {
        type: Date,
    },
    refundId: {
        type: String
    },
    description: { type: String },
    gstAmountDeduct:{
        type: Number
    },
    afterGstAmountDeduct:{
        type: Number
    },
}, { timestamps: true })

/* TransactionSchema.index({userId: 1, auctionId: 1}, {unique: true})

module.exports = mongoose.model('Transaction', TransactionSchema) */

const Transaction = mongoose.model('Transaction', TransactionSchema)
module.exports = Transaction