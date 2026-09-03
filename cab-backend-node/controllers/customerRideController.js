const Ride = require('../models/Ride');
const User = require('../models/User');
const DriverDetail = require('../models/DriverDetail');
const Payment = require('../models/Payment');
const Review = require('../models/Review');
const Wallet = require('../models/Wallet');
const WalletTransaction = require('../models/WalletTransaction');

const deg2rad = (deg) => deg * (Math.PI / 180);

const getDistance = (lat1, lon1, lat2, lon2) => {
  const theta = lon1 - lon2;
  let dist = Math.sin(deg2rad(lat1)) * Math.sin(deg2rad(lat2)) + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.cos(deg2rad(theta));
  dist = Math.acos(Math.min(Math.max(dist, -1.0), 1.0));
  dist = dist * (180 / Math.PI); // rad2deg
  const miles = dist * 60 * 1.1515;
  return Math.round(miles * 1.609344 * 100) / 100; // to km, rounded to 2 decimals
};

const paginate = async (query, model, req, populateOpts = []) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 15;
  const skip = (page - 1) * limit;

  let execQuery = model.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit);
  if (populateOpts.length > 0) {
    populateOpts.forEach(opt => {
      execQuery = execQuery.populate(opt);
    });
  }

  const data = await execQuery;
  const total = await model.countDocuments(query);
  const lastPage = Math.ceil(total / limit) || 1;

  return {
    current_page: page,
    data,
    total,
    per_page: limit,
    last_page: lastPage
  };
};

const nearbyDrivers = async (req, res, next) => {
  try {
    const { latitude, longitude, radius } = req.query;

    if (!latitude || !longitude) {
      return res.status(422).json({
        message: 'The given data was invalid.',
        errors: {
          latitude: ['The latitude field is required.'],
          longitude: ['The longitude field is required.']
        }
      });
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    const rad = parseFloat(radius) || 10; // Default 10km

    // Get all online drivers
    const drivers = await DriverDetail.find({ is_available: true }).populate('user', 'id name phone');

    // Filter by Haversine formula
    const filteredDrivers = drivers
      .map(driver => {
        const dist = getDistance(lat, lon, driver.current_latitude, driver.current_longitude);
        // We convert Mongoose document to JSON, attach distance, and return
        const driverObj = driver.toJSON();
        driverObj.distance = dist;
        return driverObj;
      })
      .filter(driver => driver.distance <= rad)
      .sort((a, b) => a.distance - b.distance);

    res.status(200).json({
      drivers: filteredDrivers
    });

  } catch (err) {
    next(err);
  }
};

const store = async (req, res, next) => {
  try {
    const { pickup_address, dropoff_address, pickup_latitude, pickup_longitude, dropoff_latitude, dropoff_longitude, payment_method, scheduled_at, vehicle_type, distance } = req.body;

    const errors = {};
    if (!pickup_address) errors.pickup_address = ['The pickup address field is required.'];
    if (!dropoff_address) errors.dropoff_address = ['The dropoff address field is required.'];
    if (!pickup_latitude) errors.pickup_latitude = ['The pickup latitude field is required.'];
    if (!pickup_longitude) errors.pickup_longitude = ['The pickup longitude field is required.'];
    if (!dropoff_latitude) errors.dropoff_latitude = ['The dropoff latitude field is required.'];
    if (!dropoff_longitude) errors.dropoff_longitude = ['The dropoff longitude field is required.'];
    if (distance === undefined || distance === null) errors.distance = ['The distance field is required.'];

    if (Object.keys(errors).length > 0) {
      return res.status(422).json({ message: 'The given data was invalid.', errors });
    }

    let distanceKm = parseFloat(distance);
    if (isNaN(distanceKm) || distanceKm <= 0) {
      distanceKm = getDistance(
        parseFloat(pickup_latitude),
        parseFloat(pickup_longitude),
        parseFloat(dropoff_latitude),
        parseFloat(dropoff_longitude)
      );
      if (distanceKm <= 0) distanceKm = 1.0;
    }

    // Normalize vehicle rate
    const vehicleInput = (vehicle_type || 'car').toLowerCase();
    let rate = parseInt(process.env.VEHICLE_RATE_CAR) || 30;
    let normalizedVehicleType = 'Car';

    if (vehicleInput === 'bike') {
      rate = parseInt(process.env.VEHICLE_RATE_BIKE) || 10;
      normalizedVehicleType = 'Bike';
    } else if (['rickshaw', 'auto rickshaw', 'auto'].includes(vehicleInput)) {
      rate = parseInt(process.env.VEHICLE_RATE_RICKSHAW) || 20;
      normalizedVehicleType = 'Rickshaw';
    }

    // Map customer vehicle type to driver vehicle types
    const vehicleTypeMap = {
      'Car': ['sedan', 'suv', 'hatchback'],
      'Bike': ['bike'],
      'Rickshaw': ['rickshaw']
    };

    const matchingDriverTypes = vehicleTypeMap[normalizedVehicleType] || ['sedan', 'suv', 'hatchback'];

    // Check if any available driver exists for the requested vehicle type
    const availableDriverCount = await DriverDetail.countDocuments({
      is_available: true,
      vehicle_type: { $in: matchingDriverTypes }
    });

    if (availableDriverCount === 0) {
      // Find which vehicle types actually have available drivers
      const allAvailableDrivers = await DriverDetail.find({ is_available: true }).select('vehicle_type');
      const activeTypes = new Set(allAvailableDrivers.map(d => d.vehicle_type));

      // Reverse map driver types back to customer-friendly names
      const availableForCustomer = [];
      if (['sedan', 'suv', 'hatchback'].some(t => activeTypes.has(t))) availableForCustomer.push('Car');
      if (activeTypes.has('bike')) availableForCustomer.push('Bike');
      if (activeTypes.has('rickshaw')) availableForCustomer.push('Rickshaw');

      let suggestion = '';
      if (availableForCustomer.length > 0) {
        suggestion = ` Currently available: ${availableForCustomer.join(', ')}.`;
      } else {
        suggestion = ' No drivers are currently active. Please try again later.';
      }

      return res.status(422).json({
        message: `Driver is not available. No ${normalizedVehicleType} drivers are currently active.${suggestion}`,
        errors: {
          vehicle_type: [`Driver is not available. No ${normalizedVehicleType} drivers are currently active.`]
        }
      });
    }

    const estimatedFare = Math.round(distanceKm * rate * 100) / 100;
    const estimatedDuration = Math.ceil((distanceKm / 30) * 60);

    const paymentMethod = payment_method || 'cash';
    let wallet = null;

    if (paymentMethod === 'wallet') {
      wallet = await Wallet.findOneAndUpdate(
        { user_id: req.user._id, balance: { $gte: estimatedFare } },
        { $inc: { balance: -estimatedFare } },
        { new: true }
      );

      if (!wallet) {
        const existingWallet = await Wallet.findOne({ user_id: req.user._id });
        const currentBal = existingWallet ? existingWallet.balance : 0;
        return res.status(422).json({
          message: `Insufficient wallet balance (₹${currentBal.toFixed(2)}). Required: ₹${estimatedFare.toFixed(2)}. Please recharge your wallet.`
        });
      }
    }

    const commissionPercent = parseInt(process.env.COMMISSION_PERCENTAGE) || 10;
    const adminCommission = Math.round(estimatedFare * (commissionPercent / 100) * 100) / 100;
    const driverEarning = Math.round((estimatedFare - adminCommission) * 100) / 100;

    try {
      const ride = new Ride({
        customer_id: req.user._id,
        pickup_address,
        dropoff_address,
        pickup_latitude: parseFloat(pickup_latitude),
        pickup_longitude: parseFloat(pickup_longitude),
        dropoff_latitude: parseFloat(dropoff_latitude),
        dropoff_longitude: parseFloat(dropoff_longitude),
        status: 'requested',
        vehicle_type: normalizedVehicleType,
        fare: estimatedFare,
        distance: distanceKm,
        duration: estimatedDuration,
        scheduled_at: scheduled_at ? new Date(scheduled_at) : null
      });

      await ride.save();

      const payment = new Payment({
        ride_id: ride._id,
        payment_method: paymentMethod,
        payment_status: paymentMethod === 'wallet' ? 'completed' : 'pending',
        amount: estimatedFare,
        admin_commission: adminCommission,
        driver_earning: driverEarning,
        is_payout_distributed: false
      });

      await payment.save();

      if (paymentMethod === 'wallet' && wallet) {
        await WalletTransaction.create({
          wallet_id: wallet._id,
          user_id: req.user._id,
          type: 'payment',
          amount: estimatedFare,
          description: `Fare for Ride #${ride._id}`,
          reference_id: ride._id.toString()
        });
      }

      // Populate and return
      const populatedRide = await Ride.findById(ride._id).populate('payment');

      res.status(201).json({
        message: 'Ride requested successfully. Searching for nearby drivers...',
        ride: populatedRide
      });
    } catch (err) {
      // Rollback deducted wallet balance if ride or payment creation fails
      if (paymentMethod === 'wallet' && wallet) {
        await Wallet.findOneAndUpdate(
          { _id: wallet._id },
          { $inc: { balance: estimatedFare } }
        );
      }
      throw err;
    }

  } catch (err) {
    next(err);
  }
};

const index = async (req, res, next) => {
  try {
    const paginatedRides = await paginate(
      { customer_id: req.user._id },
      Ride,
      req,
      [
        { path: 'driver', select: 'id name phone', populate: { path: 'driver_detail' } },
        'payment',
        'reviews'
      ]
    );
    res.status(200).json(paginatedRides);
  } catch (err) {
    next(err);
  }
};

const show = async (req, res, next) => {
  try {
    const ride = await Ride.findOne({
      _id: req.params.id,
      customer_id: req.user._id
    }).populate([
      { path: 'driver', select: 'id name phone', populate: { path: 'driver_detail' } },
      'payment',
      'reviews'
    ]);

    if (!ride) {
      return res.status(404).json({ message: 'Ride not found.' });
    }

    res.status(200).json(ride);
  } catch (err) {
    next(err);
  }
};

const cancel = async (req, res, next) => {
  try {
    const ride = await Ride.findOne({
      _id: req.params.id,
      customer_id: req.user._id
    }).populate('payment');

    if (!ride) {
      return res.status(404).json({ message: 'Ride not found.' });
    }

    if (!['requested', 'accepted', 'waiting_for_customer'].includes(ride.status)) {
      return res.status(422).json({
        message: 'Cannot cancel a ride that is already in progress, completed, or cancelled.'
      });
    }

    ride.status = 'cancelled';
    await ride.save();

    // Refund wallet if payment method was wallet and completed
    if (ride.payment && ride.payment.payment_method === 'wallet' && ride.payment.payment_status === 'completed') {
      let wallet = await Wallet.findOne({ user_id: req.user._id });
      if (wallet) {
        wallet.balance = parseFloat((wallet.balance + ride.fare).toFixed(2));
        await wallet.save();
      }

      await WalletTransaction.create({
        wallet_id: wallet ? wallet._id : null,
        user_id: req.user._id,
        type: 'refund',
        amount: ride.fare,
        description: `Refund for Ride #${ride._id}`,
        reference_id: ride._id.toString()
      });

      ride.payment.payment_status = 'refunded';
      await ride.payment.save();
    } else if (ride.payment) {
      ride.payment.payment_status = 'failed';
      await ride.payment.save();
    }

    if (ride.driver_id) {
      await DriverDetail.findOneAndUpdate(
        { user_id: ride.driver_id },
        { is_available: true }
      );
    }

    res.status(200).json({
      message: 'Ride cancelled successfully.',
      ride
    });

  } catch (err) {
    next(err);
  }
};

const rate = async (req, res, next) => {
  try {
    const ride = await Ride.findOne({
      _id: req.params.id,
      customer_id: req.user._id
    });

    if (!ride) {
      return res.status(404).json({ message: 'Ride not found.' });
    }

    if (ride.status !== 'completed') {
      return res.status(422).json({
        message: 'You can only review completed rides.'
      });
    }

    if (!ride.driver_id) {
      return res.status(422).json({
        message: 'Cannot rate a ride with no driver assigned.'
      });
    }

    const existingReview = await Review.findOne({ ride_id: ride._id });
    if (existingReview) {
      return res.status(422).json({
        message: 'You have already reviewed this ride.'
      });
    }

    const { rating, comment } = req.body;
    if (!rating) {
      return res.status(422).json({
        message: 'The given data was invalid.',
        errors: {
          rating: ['The rating field is required.']
        }
      });
    }

    const review = new Review({
      ride_id: ride._id,
      reviewer_id: req.user._id,
      reviewee_id: ride.driver_id,
      rating: parseInt(rating),
      comment: comment || null
    });

    await review.save();

    // Recalculate average rating
    const reviews = await Review.find({ reviewee_id: ride.driver_id });
    const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    await DriverDetail.findOneAndUpdate(
      { user_id: ride.driver_id },
      { rating: Math.round(avg * 100) / 100 }
    );

    res.status(201).json({
      message: 'Review submitted successfully.',
      review
    });

  } catch (err) {
    next(err);
  }
};

module.exports = {
  nearbyDrivers,
  store,
  index,
  show,
  cancel,
  rate
};
