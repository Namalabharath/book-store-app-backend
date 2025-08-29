const Order = require("./order.model");
const Book = require("../books/book.model");

const createAOrder = async (req, res) => {
  try {
    const { name, email, address, phone, cartItems, paymentMethod } = req.body;
    
    // Validate cart items
    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    // Validate payment method
    const validPaymentMethods = ['cod', 'online'];
    const selectedPaymentMethod = paymentMethod || 'cod';
    
    if (!validPaymentMethods.includes(selectedPaymentMethod)) {
      return res.status(400).json({ message: "Invalid payment method" });
    }
    
    let totalPrice = 0;
    const processedProducts = [];
    
    // Process each cart item and calculate totals
    for (const item of cartItems) {
      // Verify book exists and get current price
      const book = await Book.findById(item._id);
      
      if (!book) {
        return res.status(404).json({ message: `Book not found: ${item.title}` });
      }
      
      const quantity = item.quantity || 1;
      const itemPrice = book.newPrice;
      const itemTotal = itemPrice * quantity;
      totalPrice += itemTotal;
      
      const productData = {
        bookId: book._id,
        quantity: quantity,
        price: itemPrice,
        title: book.title
      };
      
      processedProducts.push(productData);
    }
    
    // Create the order
    const orderData = {
      name,
      email,
      address,
      phone,
      products: processedProducts,
      totalPrice: totalPrice,
      paymentMethod: selectedPaymentMethod,
      paymentStatus: 'pending', // Always pending initially - will be updated to 'paid' after payment verification
      orderStatus: 'pending'
    };

    const newOrder = new Order(orderData);
    const savedOrder = await newOrder.save();
    
    // Populate the book details for response
    await savedOrder.populate('products.bookId');
    
    res.status(200).json({
      message: "Order created successfully",
      order: savedOrder
    });
    
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ message: "Failed to create order" });
  }
};

const getOrderByEmail = async (req, res) => {
  try {
    const {email} = req.params;
    const orders = await Order.find({email}).populate('products.bookId').sort({createdAt: -1});
    
    // Return empty array if no orders found (not an error)
    res.status(200).json(orders || []);
  } catch (error) {
    console.error("Error fetching orders", error);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
}

// Get all orders (admin only)
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().populate('products.bookId').sort({createdAt: -1});
    res.status(200).json(orders);
  } catch (error) {
    console.error("Error fetching all orders", error);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
}

// Update order status (admin only)
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { orderStatus } = req.body;

    // Validate order status
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(orderStatus)) {
      return res.status(400).json({ 
        message: "Invalid order status. Must be one of: " + validStatuses.join(', ') 
      });
    }

    // Find and update the order
    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      { orderStatus },
      { new: true, runValidators: true }
    ).populate('products.bookId');

    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }
    
    res.status(200).json({
      message: "Order status updated successfully",
      order: updatedOrder
    });

  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ message: "Failed to update order status" });
  }
}

module.exports = {
  createAOrder,
  getOrderByEmail,
  getAllOrders,
  updateOrderStatus
};
