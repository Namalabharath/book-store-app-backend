const mongoose =  require('mongoose');

const orderSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email:{
        type: String,
        required: true,
    },
    address: {
        city: {
            type: String,
            required: true,
        },
        country: String,
        state: String,
        zipcode: String,
    },
    phone: {
        type: Number,
        //required: true,
    },
    // New structure with products array
    products: [
        {
            bookId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Book',
                required: true,
            },
            quantity: {
                type: Number,
                required: true,
                min: 1,
                default: 1
            },
            price: {
                type: Number,
                required: true
            },
            title: {
                type: String,
                required: true
            }
        }
    ],
    totalPrice: {
        type: Number,
        required: true,
    }
}, {
    timestamps: true,
})

const Order =  mongoose.model('Order', orderSchema);

module.exports = Order;