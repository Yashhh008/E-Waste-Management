const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const { auth, checkRole } = require('../middleware/auth');
const Recycler = require('../models/Recycler');
const User = require('../models/User');

// @route   POST api/recyclers
// @desc    Create or update recycler profile
// @access  Private
router.post('/', [
  auth,
  checkRole(['recycler']),
  [
    check('businessName', 'Business name is required').not().isEmpty(),
    check('services', 'At least one service is required').isArray({ min: 1 }),
    check('acceptedItems', 'At least one accepted item type is required').isArray({ min: 1 })
  ]
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    let recycler = await Recycler.findOne({ user: req.user.id });

    if (recycler) {
      // Update existing profile
      recycler = await Recycler.findOneAndUpdate(
        { user: req.user.id },
        { $set: req.body },
        { new: true }
      );
      return res.json(recycler);
    }

    // Create new profile
    recycler = new Recycler({
      user: req.user.id,
      ...req.body
    });

    await recycler.save();
    res.json(recycler);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/recyclers/me
// @desc    Get current recycler's profile
// @access  Private
router.get('/me', [auth, checkRole(['recycler'])], async (req, res) => {
  try {
    const recycler = await Recycler.findOne({ user: req.user.id });
    
    if (!recycler) {
      return res.status(404).json({ message: 'Recycler profile not found' });
    }

    res.json(recycler);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/recyclers
// @desc    Get all verified recyclers
// @access  Public
router.get('/', async (req, res) => {
  try {
    const recyclers = await Recycler.find({ isVerified: true })
      .populate('user', ['name', 'email', 'phone'])
      .select('-certifications.documentUrl');
    res.json(recyclers);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/recyclers/:id
// @desc    Get recycler by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const recycler = await Recycler.findById(req.params.id)
      .populate('user', ['name', 'email', 'phone'])
      .select('-certifications.documentUrl');
    
    if (!recycler) {
      return res.status(404).json({ message: 'Recycler not found' });
    }

    res.json(recycler);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Recycler not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   PUT api/recyclers/verify/:id
// @desc    Verify a recycler
// @access  Private (Admin only)
router.put('/verify/:id', [auth, checkRole(['admin'])], async (req, res) => {
  try {
    const recycler = await Recycler.findById(req.params.id);
    
    if (!recycler) {
      return res.status(404).json({ message: 'Recycler not found' });
    }

    recycler.isVerified = true;
    await recycler.save();
    
    res.json(recycler);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router; 