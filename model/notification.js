const mongoose = require('mongoose')

const itemSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Reference to the User model
        required: true,
    },
    name: String,
    description: String,
    linkPath: { type: String },
    price: Number,
    notficationParamObj:Object,
    type: [{ type: String, enum: ["internal", "external"] }],
    isRead: { type: Boolean, default: true },

}, { timestamps: true });

module.exports = mongoose.model('notification', itemSchema);
