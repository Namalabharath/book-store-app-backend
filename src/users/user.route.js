const express =  require('express');
const User = require('./user.model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const router =  express.Router();

const JWT_SECRET = process.env.JWT_SECRET_KEY

// Admin emails - can be moved to environment variables
const ADMIN_EMAILS = process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(',') : [];

// Helper function to generate JWT token
const generateToken = (user) => {
    return jwt.sign(
        {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role
        },
        JWT_SECRET,
        { expiresIn: "24h" }
    );
};

// User Registration
router.post("/register", async (req, res) => {
    const { username, email, password } = req.body;
    
    try {
        // Check if user already exists
        const existingUser = await User.findOne({ 
            $or: [{ email }, { username }] 
        });
        
        if (existingUser) {
            return res.status(400).json({ 
                message: "User with this email or username already exists" 
            });
        }

        // Determine role based on email
        const role = ADMIN_EMAILS.includes(email.toLowerCase()) ? 'admin' : 'user';

        // Create new user (password will be hashed by the pre-save hook)
        const newUser = new User({
            username,
            email: email.toLowerCase(),
            password, // Raw password - will be hashed by pre-save hook
            role
        });

        await newUser.save();

        // Generate token
        const token = generateToken(newUser);

        res.status(201).json({
            message: "User registered successfully",
            token,
            user: {
                id: newUser._id,
                username: newUser.username,
                email: newUser.email,
                role: newUser.role
            }
        });

    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ message: "Failed to register user" });
    }
});

// User Login
router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        // Find user by email
        const user = await User.findOne({ email: email.toLowerCase() });
        
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid password" });
        }

        // Generate token
        const token = generateToken(user);

        res.status(200).json({
            message: "Login successful",
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        res.status(500).json({ message: "Failed to login" });
    }
});

// Get User Profile
router.get("/profile", async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ message: "No token provided" });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error("Profile fetch error:", error);
        res.status(403).json({ message: "Invalid token" });
    }
});

module.exports = router;