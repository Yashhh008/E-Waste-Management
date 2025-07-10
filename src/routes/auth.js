const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const Recycler = require('../models/Recycler');

// @route   POST api/auth/register
// @desc    Register user
// @access  Public
router.post('/register', [
  check('name', 'Name is required').not().isEmpty(),
  check('email', 'Please include a valid email').isEmail(),
  check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { name, email, password, role, phone, address, businessName, acceptedItems, services } = req.body;

    // Check if user exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user
    user = new User({
      name,
      email,
      password,
      role: role || 'user',
      phone,
      address
    });

    // Save user
    await user.save();

    // If recycler, create recycler profile
    if (role === 'recycler') {
      if (!businessName || !acceptedItems || !services) {
        return res.status(400).json({ message: 'Missing recycler profile fields' });
      }
      const recycler = new Recycler({
        user: user._id,
        businessName,
        acceptedItems,
        services
      });
      await recycler.save();
    }

    // Create JWT payload
    const payload = {
      user: {
        id: user.id,
        role: user.role
      }
    };

    // Sign token
    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '24h' },
      (err, token) => {
        if (err) {
          console.error('JWT Sign Error:', err);
          return res.status(500).json({ message: 'Error creating authentication token' });
        }
        res.json({ 
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
          }
        });
      }
    );
  } catch (err) {
    console.error('Registration Error:', err);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', [
  check('email', 'Please include a valid email').isEmail(),
  check('password', 'Password is required').exists()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { email, password } = req.body;

    // Check if user exists
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Create JWT payload
    const payload = {
      user: {
        id: user.id,
        role: user.role
      }
    };

    // Sign token
    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '24h' },
      (err, token) => {
        if (err) {
          console.error('JWT Sign Error:', err);
          return res.status(500).json({ message: 'Error creating authentication token' });
        }
        res.json({ 
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
          }
        });
      }
    );
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// @route   GET api/auth/user
// @desc    Get user data
// @access  Private
router.get('/user', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let recyclerProfile = null;
    if (user.role === 'recycler') {
      recyclerProfile = await Recycler.findOne({ user: user._id });
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      address: user.address,
      ...(user.role === 'recycler' && recyclerProfile
        ? {
            businessName: recyclerProfile.businessName,
            acceptedItems: recyclerProfile.acceptedItems,
            services: recyclerProfile.services
          }
        : {})
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error while fetching user data' });
  }
});

// @route   PUT api/auth/user
// @desc    Update user profile
// @access  Private
router.put('/user', auth, async (req, res) => {
  try {
    const { name, phone, address, businessName, businessType, businessLicense } = req.body;
    
    // Update user fields
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { 
        name,
        phone,
        address
      },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // If user is a recycler, update recycler profile
    if (user.role === 'recycler') {
      await Recycler.findOneAndUpdate(
        { user: user._id },
        {
          businessName,
          businessType,
          businessLicense
        },
        { new: true }
      );
    }

    res.json(user);
  } catch (err) {
    console.error('Update Profile Error:', err);
    res.status(500).json({ message: 'Server error while updating profile' });
  }
});

module.exports = router; 