const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { verifyUserToken } = require('../middleware/verifyAdminToken');
const TempOrder = require('./tempOrder.model');
const Order = require('../orders/order.model');
const Book = require('../books/book.model');

const router = express.Router();

// Initialize Razorpay
const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Helper function to create actual order
const createActualOrder = async (orderData) => {
    try {
        let totalPrice = 0;
        const processedProducts = [];
        
        if (!orderData.cartItems || !Array.isArray(orderData.cartItems)) {
            throw new Error('Cart items not found or invalid');
        }
        
        // Process each cart item
        for (const item of orderData.cartItems) {
            const book = await Book.findById(item._id);
            if (!book) {
                throw new Error(`Book not found: ${item.title}`);
            }
            
            const quantity = item.quantity || 1;
            const itemPrice = book.newPrice;
            const itemTotal = itemPrice * quantity;
            totalPrice += itemTotal;
            
            processedProducts.push({
                bookId: book._id,
                quantity: quantity,
                price: itemPrice,
                title: book.title
            });
        }

        // Create order
        const finalOrderData = {
            name: orderData.name,
            email: orderData.email,
            address: orderData.address,
            phone: orderData.phone,
            products: processedProducts,
            totalPrice: orderData.totalPrice, // Use the total from frontend (includes any charges)
            paymentMethod: orderData.paymentMethod || 'online',
            paymentStatus: orderData.paymentStatus || 'paid',
            razorpayPaymentId: orderData.paymentId,
            razorpayOrderId: orderData.razorpayOrderId,
            orderStatus: 'pending'
        };

        const newOrder = new Order(finalOrderData);
        const savedOrder = await newOrder.save();
        
        await savedOrder.populate('products.bookId');
        
        return savedOrder;
        
    } catch (error) {
        console.error('Error in createActualOrder:', error);
        throw error;
    }
};

// Create Razorpay Order
router.post('/create-order', verifyUserToken, async (req, res) => {
    try {
        const { amount, currency, orderData } = req.body;
        
        // Validate amount
        if (!amount || amount < 100) { // Minimum 1 rupee
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid amount' 
            });
        }

        // Create Razorpay order
        const razorpayOrder = await razorpayInstance.orders.create({
            amount: amount,
            currency: currency || 'INR',
            receipt: `order_${Date.now()}`,
            notes: {
                user_email: orderData.email,
                user_name: orderData.name
            }
        });

        // Store temporary order data
        const tempOrder = new TempOrder({
            razorpayOrderId: razorpayOrder.id,
            orderData: orderData,
            userId: req.user.id,
            status: 'created'
        });
        await tempOrder.save();

        res.json({
            success: true,
            orderId: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            key: process.env.RAZORPAY_KEY_ID
        });

    } catch (error) {
        console.error('Razorpay order creation error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to create payment order',
            error: error.message 
        });
    }
});

// Verify Payment
router.post('/verify', verifyUserToken, async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            orderData
        } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing payment parameters' 
            });
        }

        // Verify signature
        const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
        hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
        const generatedSignature = hmac.digest('hex');

        if (generatedSignature !== razorpay_signature) {
            return res.status(400).json({ 
                success: false, 
                message: 'Payment verification failed' 
            });
        }

        // Get payment details from Razorpay
        const payment = await razorpayInstance.payments.fetch(razorpay_payment_id);
        
        if (payment.status !== 'captured') {
            return res.status(400).json({ 
                success: false, 
                message: 'Payment not captured' 
            });
        }

        // Create actual order
        const finalOrderData = {
            ...orderData,
            paymentId: razorpay_payment_id,
            razorpayOrderId: razorpay_order_id,
            paymentStatus: 'paid',
            paymentMethod: 'online'
        };

        const order = await createActualOrder(finalOrderData);

        // Clean up temporary order
        await TempOrder.deleteOne({ razorpayOrderId: razorpay_order_id });

        res.json({
            success: true,
            orderId: order._id,
            message: 'Payment verified and order created successfully'
        });

    } catch (error) {
        console.error('Payment verification error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Payment verification failed',
            error: error.message 
        });
    }
});

module.exports = router;
