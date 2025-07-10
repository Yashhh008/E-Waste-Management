const mongoose = require('mongoose');

const pickupRequestSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [{
    type: {
      type: String,
      required: true,
      enum: ['computer', 'mobile', 'tv', 'printer', 'other']
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    description: String
  }],
  status: {
    type: String,
    enum: ['pending', 'assigned', 'in-progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  recycler: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  pickupDate: {
    type: Date,
    required: true
  },
  pickupTime: {
    type: String,
    required: true
  },
  address: {
    street: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    state: {
      type: String,
      required: true
    },
    zipCode: {
      type: String,
      required: true
    },
    country: {
      type: String,
      required: true
    }
  },
  notes: String,
  thankYouMessage: String,
  userFeedback: {
    rating: { type: Number, min: 1, max: 5 },
    comment: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp before saving
pickupRequestSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('PickupRequest', pickupRequestSchema); 