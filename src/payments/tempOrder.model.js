const mongoose = require('mongoose');

const tempOrderSchema = new mongoose.Schema({
    razorpayOrderId: { 
        type: String, 
        required: true, 
        unique: true 
    },
    orderData: { 
        type: Object, 
        required: true 
    },
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    status: { 
        type: String, 
        enum: ['created', 'completed', 'failed'], 
        default: 'created' 
    },
    createdAt: { 
        type: Date, 
        default: Date.now, 
        expires: 900 // 15 minutes TTL
    }
});

module.exports = mongoose.model('TempOrder', tempOrderSchema);
