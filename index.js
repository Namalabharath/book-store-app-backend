const express = require("express");
const app = express();
const cors = require("cors");

const mongoose = require("mongoose");
const port = process.env.PORT || 5000;
require('dotenv').config()

// middleware
app.use(express.json());
app.use(cors({
  origin: ['http://localhost:5173', 'book-store-app-frontend-six.vercel.app','https://book-store-app-frontend-uqnr.onrender.com'],
  credentials: true
}))

// routes
const bookRoutes = require('./src/books/book.route');
const orderRoutes = require('./src/orders/order.route');
 const userRoutes =  require("./src/users/user.route")
 const adminRoutes = require("./src/stats/admin.stats")

app.use("/api/books", bookRoutes)
app.use("/api/orders", orderRoutes)
app.use("/api/auth", userRoutes)
app.use("/api/admin", adminRoutes)

async function main() {
  await mongoose.connect(process.env.DB_URL);
  app.use("/", (req, res) => {
    res.send("Book Store Server is running!");
  });
}

main().then(() => console.log("Mongodb connect successfully!")).catch(err => console.log(err));

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});




//namala150704
//BJruaXS7QWZRh5zb
//mongodb+srv://namala150704:<db_password>@cluster0.xmdad.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
