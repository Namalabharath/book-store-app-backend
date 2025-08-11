const Order = require("./order.model");
const Book = require("../books/book.model");

const createAOrder = async (req, res) => {
  try {
    console.log("=== ORDER CREATION DEBUG ===");
    console.log("Received order data:", JSON.stringify(req.body, null, 2));
    
    const { name, email, address, phone, cartItems } = req.body;
    
    console.log("Extracted cartItems:", cartItems);
    console.log("CartItems type:", typeof cartItems);
    console.log("CartItems length:", cartItems ? cartItems.length : "undefined");
    
    // Validate cart items
    if (!cartItems || cartItems.length === 0) {
      console.log("Cart is empty or undefined:", cartItems);
      return res.status(400).json({ message: "Cart is empty" });
    }
    
    console.log("Processing cart items:", cartItems);
    
    let totalPrice = 0;
    const processedProducts = [];
    
    // Process each cart item and calculate totals
    for (const item of cartItems) {
      console.log("Processing cart item:", item); // Debug log
      
      // Verify book exists and get current price
      const book = await Book.findById(item._id);
      console.log("Found book:", book ? book.title : "NOT FOUND"); // Debug log
      
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
      
      console.log("Adding product to order:", productData); // Debug log
      processedProducts.push(productData);
    }
    
    // Create the order
    const orderData = {
      name,
      email,
      address,
      phone,
      products: processedProducts,
      totalPrice: totalPrice
    };

    console.log("Final order data to save:", orderData); // Debug log

    const newOrder = new Order(orderData);
    console.log("Order before saving:", newOrder.toObject()); // Debug log
    
    const savedOrder = await newOrder.save();
    console.log("Order after saving:", savedOrder.toObject()); // Debug log
    
    console.log("Saved order:", savedOrder); // Debug log
    
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
    if(!orders || orders.length === 0) {
      return res.status(404).json({ message: "No orders found for this email" });
    }
    res.status(200).json(orders);
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

module.exports = {
  createAOrder,
  getOrderByEmail,
  getAllOrders
};