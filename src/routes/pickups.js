const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const { auth, checkRole } = require('../middleware/auth');
const PickupRequest = require('../models/PickupRequest');
const User = require('../models/User');

// @route   GET api/pickups/recycler/available
// @desc    Get available pickup requests for recyclers
// @access  Private
router.get('/recycler/available', [auth, checkRole(['recycler'])], async (req, res) => {
  try {
    const pickups = await PickupRequest.find({ status: 'pending' })
      .populate('user', ['name', 'email', 'phone'])
      .sort({ createdAt: -1 });
    console.log('Available pickups for recycler:', pickups.length);
    res.json(pickups);
  } catch (err) {
    console.error('Get Available Pickups Error:', err);
    res.status(500).json({ message: 'Server error while fetching available pickup requests' });
  }
});

// @route   GET api/pickups
// @desc    Get all pickup requests for a user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const pickups = await PickupRequest.find({ user: req.user.id })
      .sort({ createdAt: -1 });
    res.json(pickups);
  } catch (err) {
    console.error('Get Pickups Error:', err);
    res.status(500).json({ message: 'Server error while fetching pickup requests' });
  }
});

// @route   POST api/pickups
// @desc    Create a pickup request
// @access  Private
router.post('/', [
  auth,
  [
    check('items', 'At least one item is required').isArray({ min: 1 }),
    check('pickupDate', 'Pickup date is required').not().isEmpty(),
    check('pickupTime', 'Pickup time is required').not().isEmpty(),
    check('address', 'Address is required').not().isEmpty()
  ]
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg });
  }

  try {
    const newPickup = new PickupRequest({
      user: req.user.id,
      ...req.body
    });

    const pickup = await newPickup.save();
    
    // Add pickup to user's pickups array
    await User.findByIdAndUpdate(req.user.id, {
      $push: { pickups: pickup._id }
    });

    res.json(pickup);
  } catch (err) {
    console.error('Create Pickup Error:', err);
    res.status(500).json({ message: 'Server error while creating pickup request' });
  }
});

// @route   GET api/pickups/:id
// @desc    Get pickup request by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const pickup = await PickupRequest.findById(req.params.id);
    
    if (!pickup) {
      return res.status(404).json({ message: 'Pickup request not found' });
    }

    // Check if user owns the pickup request or is a recycler
    if (pickup.user.toString() !== req.user.id && req.user.role !== 'recycler') {
      return res.status(401).json({ message: 'Not authorized' });
    }

    res.json(pickup);
  } catch (err) {
    console.error('Get Pickup Error:', err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Pickup request not found' });
    }
    res.status(500).json({ message: 'Server error while fetching pickup request' });
  }
});

// @route   PUT api/pickups/:id
// @desc    Update pickup request status
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const pickup = await PickupRequest.findById(req.params.id);
    
    if (!pickup) {
      return res.status(404).json({ message: 'Pickup request not found' });
    }

    const { status, thankYouMessage, userFeedback } = req.body;

    // Allow recyclers to update status and thank you message
    if (req.user.role === 'recycler') {
      if (status) pickup.status = status;
      if (status === 'assigned') {
        pickup.recycler = req.user.id;
      }
      if (status === 'completed' && thankYouMessage) {
        pickup.thankYouMessage = thankYouMessage;
      }
    }

    // Allow users to submit feedback for completed pickups
    if (req.user.role === 'user' && userFeedback && pickup.status === 'completed' && pickup.user.toString() === req.user.id) {
      pickup.userFeedback = userFeedback;
    }

    await pickup.save();
    res.json(pickup);
  } catch (err) {
    console.error('Update Pickup Error:', err);
    res.status(500).json({ message: 'Server error while updating pickup request' });
  }
});

// @route   GET api/pickups/recycler/accepted
// @desc    Get accepted pickup requests for a recycler
// @access  Private
router.get('/recycler/accepted', [auth, checkRole(['recycler'])], async (req, res) => {
  try {
    const pickups = await PickupRequest.find({ 
      recycler: req.user.id,
      status: { $in: ['assigned', 'in-progress', 'completed'] }
    })
      .populate('user', ['name', 'email', 'phone'])
      .sort({ updatedAt: -1 });
    res.json(pickups);
  } catch (err) {
    console.error('Get Accepted Pickups Error:', err);
    res.status(500).json({ message: 'Server error while fetching accepted pickup requests' });
  }
});

module.exports = router; 