const DriverDetail = require('../models/DriverDetail');
const Ride = require('../models/Ride');
const Payment = require('../models/Payment');
const Wallet = require('../models/Wallet');
const WalletTransaction = require('../models/WalletTransaction');
const User = require('../models/User');

const deg2rad = (deg) => deg * (Math.PI / 180);

const getDistance = (lat1, lon1, lat2, lon2) => {
  const theta = lon1 - lon2;
  let dist = Math.sin(deg2rad(lat1)) * Math.sin(deg2rad(lat2)) + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.cos(deg2rad(theta));
  dist = Math.acos(Math.min(Math.max(dist, -1.0), 1.0));
  dist = dist * (180 / Math.PI); // rad2deg
  const miles = dist * 60 * 1.1515;
  return Math.round(miles * 1.609344 * 100) / 100; // to km, rounded to 2 decimals
};

const getRideVehicleTypeForDriver = (driverVehicleType) => {
  const type = (driverVehicleType || '').toLowerCase();
  if (['sedan', 'suv', 'hatchback', 'car'].includes(type)) {
    return 'Car';
  }
  if (['bike', 'motorcycle'].includes(type)) {
    return 'Bike';
  }
  if (['rickshaw', 'auto', 'auto rickshaw'].includes(type)) {
    return 'Rickshaw';
  }
  return 'Car';
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

  const [data, total] = await Promise.all([
    execQuery,
    model.countDocuments(query)
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    data,
    meta: {
      current_page: page,
      last_page: totalPages,
      per_page: limit,
      total
    }
  };
};

const updateLocation = async (req, res, next) => {
  try {
    const { latitude, longitude, is_available } = req.body;

    const errors = {};
    if (latitude === undefined || latitude === null) errors.latitude = ['The latitude field is required.'];
    if (longitude === undefined || longitude === null) errors.longitude = ['The longitude field is required.'];
    if (is_available === undefined || is_available === null) errors.is_available = ['The is_available field is required.'];

    if (Object.keys(errors).length > 0) {
      return res.status(422).json({ message: 'The given data was invalid.', errors });
    }

    const driverDetail = await DriverDetail.findOneAndUpdate(
      { user_id: req.user._id },
      {
        current_latitude: parseFloat(latitude),
        current_longitude: parseFloat(longitude),
        is_available: Boolean(is_available)
      },
      { new: true, upsert: true }
    );

    res.status(200).json({
      message: 'Location updated successfully.',
      driver_detail: driverDetail
    });

  } catch (err) {
    next(err);
  }
};

const rideRequests = async (req, res, next) => {
  try {
    const driverDetail = await DriverDetail.findOne({ user_id: req.user._id });
    if (!driverDetail) {
      return res.status(404).json({ message: 'Driver details not found.' });
    }

    if (!driverDetail.is_available) {
      return res.status(403).json({
        message: 'You must set yourself as available to see ride requests.'
      });
    }

    const lat = driverDetail.current_latitude ?? 12.9716;
    const lon = driverDetail.current_longitude ?? 77.5946;

    // Map driver vehicle type to allowed customer ride vehicle type
    const rideVehicleType = getRideVehicleTypeForDriver(driverDetail.vehicle_type);

    // Retrieve requested rides matching driver vehicle type
    const rides = await Ride.find({ 
      status: 'requested',
      vehicle_type: rideVehicleType 
    }).populate('customer', 'id name phone');
    const radius = 50; // 50km radius to ensure driver receives requests

    const filteredRequests = rides
      .map(ride => {
        const dist = (ride.pickup_latitude && ride.pickup_longitude)
          ? getDistance(lat, lon, ride.pickup_latitude, ride.pickup_longitude)
          : 0;
        const rideObj = ride.toJSON();
        rideObj.driver_distance_to_pickup = dist;
        return rideObj;
      })
      .filter(ride => ride.driver_distance_to_pickup <= radius)
      .sort((a, b) => a.driver_distance_to_pickup - b.driver_distance_to_pickup);

    res.status(200).json({
      requests: filteredRequests
    });

  } catch (err) {
    next(err);
  }
};

const acceptRide = async (req, res, next) => {
  try {
    const driverDetail = await DriverDetail.findOne({ user_id: req.user._id });
    if (!driverDetail) {
      return res.status(404).json({ message: 'Driver details not found.' });
    }

    if (!driverDetail.is_available) {
      return res.status(422).json({
        message: 'You cannot accept new rides while offline or on another trip.'
      });
    }

    const existingRide = await Ride.findById(req.params.id);
    if (!existingRide) {
      return res.status(404).json({ message: 'Ride request not found.' });
    }

    // Verify driver vehicle compatibility with the ride vehicle type
    const expectedRideVehicleType = getRideVehicleTypeForDriver(driverDetail.vehicle_type);
    if (existingRide.vehicle_type !== expectedRideVehicleType) {
      return res.status(422).json({
        message: 'This ride is for a different vehicle type.'
      });
    }

    const randomSecs = Math.floor(Math.random() * 20) + 30; // 30 to 50 seconds
    const now = new Date();

    // Atomic update to ensure no two drivers accept the same ride concurrently
    const ride = await Ride.findOneAndUpdate(
      {
        _id: req.params.id,
        status: 'requested',
        vehicle_type: expectedRideVehicleType
      },
      {
        driver_id: req.user._id,
        status: 'accepted',
        driver_accepted_at: now,
        estimated_pickup_at: new Date(now.getTime() + randomSecs * 1000)
      },
      { new: true }
    );

    if (!ride) {
      return res.status(422).json({
        message: 'This ride has already been accepted or cancelled.'
      });
    }

    driverDetail.is_available = false;
    await driverDetail.save();

    const populatedRide = await Ride.findById(ride._id).populate(['customer', 'payment']);

    res.status(200).json({
      message: 'Ride request accepted successfully.',
      ride: populatedRide
    });

  } catch (err) {
    next(err);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status || !['waiting_for_customer', 'in_progress', 'completed'].includes(status)) {
      return res.status(422).json({
        message: 'The given data was invalid.',
        errors: {
          status: ['The status is invalid. Must be waiting_for_customer, in_progress, or completed.']
        }
      });
    }

    const ride = await Ride.findOne({
      _id: req.params.id,
      driver_id: req.user._id
    }).populate('payment');

    if (!ride) {
      return res.status(404).json({ message: 'Ride not found.' });
    }

    if (['completed', 'cancelled'].includes(ride.status)) {
      return res.status(422).json({
        message: 'Cannot update the status of a finished or cancelled ride.'
      });
    }

    // Ensure status progression is logical
    if (status === 'waiting_for_customer' && ride.status !== 'accepted') {
      return res.status(422).json({ message: 'Invalid status progression. Must be accepted to pick up customer.' });
    }
    if (status === 'in_progress' && ride.status !== 'waiting_for_customer') {
      return res.status(422).json({ message: 'Invalid status progression. Must be waiting for customer to start.' });
    }
    if (status === 'completed' && ride.status !== 'in_progress') {
      return res.status(422).json({ message: 'Cannot complete a ride that has not started.' });
    }

    ride.status = status;
    if (status === 'waiting_for_customer') {
      ride.pickup_waiting_started_at = new Date();
    }
    await ride.save();

    if (status === 'completed') {
      // Calculate actual ride duration in minutes
      const startTime = ride.pickup_waiting_started_at || ride.driver_accepted_at || ride.createdAt;
      if (startTime) {
        const diffMs = Date.now() - new Date(startTime).getTime();
        ride.duration = Math.max(1, Math.round(diffMs / (1000 * 60)));
        await ride.save();
      }

      // Free driver
      await DriverDetail.findOneAndUpdate(
        { user_id: req.user._id },
        { is_available: true }
      );

      // Complete payment and distribute earnings atomically to prevent duplicates
      if (ride.payment) {
        const updatedPayment = await Payment.findOneAndUpdate(
          { _id: ride.payment._id, is_payout_distributed: { $ne: true } },
          { payment_status: 'completed', is_payout_distributed: true },
          { new: true }
        );

        if (updatedPayment) {
          // 1. Distribute driver earning atomically
          const driverWallet = await Wallet.findOneAndUpdate(
            { user_id: req.user._id },
            { $inc: { balance: updatedPayment.driver_earning } },
            { upsert: true, new: true }
          );
          
          await WalletTransaction.create({
            wallet_id: driverWallet._id,
            user_id: req.user._id,
            type: 'deposit',
            amount: updatedPayment.driver_earning,
            description: `Earnings for Ride #${ride._id}`,
            reference_id: ride._id.toString()
          });

          // 2. Distribute admin commission atomically
          const admin = await User.findOne({ role: 'admin' });
          if (admin) {
            const adminWallet = await Wallet.findOneAndUpdate(
              { user_id: admin._id },
              { $inc: { balance: updatedPayment.admin_commission } },
              { upsert: true, new: true }
            );

            await WalletTransaction.create({
              wallet_id: adminWallet._id,
              user_id: admin._id,
              type: 'deposit',
              amount: updatedPayment.admin_commission,
              description: `Commission for Ride #${ride._id}`,
              reference_id: ride._id.toString()
            });
          }
        }
      }
    }

    const populatedRide = await Ride.findById(ride._id).populate(['customer', 'payment']);

    res.status(200).json({
      message: `Ride status updated to: ${status}.`,
      ride: populatedRide
    });

  } catch (err) {
    next(err);
  }
};

const rideHistory = async (req, res, next) => {
  try {
    const paginatedRides = await paginate(
      { driver_id: req.user._id },
      Ride,
      req,
      ['customer', 'payment', 'reviews']
    );
    res.status(200).json(paginatedRides);
  } catch (err) {
    next(err);
  }
};

const registerVehicle = async (req, res, next) => {
  try {
    const { license_number, vehicle_model, vehicle_plate_number, vehicle_color, vehicle_type } = req.body;

    const errors = {};
    if (!license_number) errors.license_number = ['The license number field is required.'];
    if (!vehicle_model) errors.vehicle_model = ['The vehicle model field is required.'];
    if (!vehicle_plate_number) errors.vehicle_plate_number = ['The vehicle plate number field is required.'];
    if (!vehicle_color) errors.vehicle_color = ['The vehicle color field is required.'];
    if (!vehicle_type || !['sedan', 'suv', 'hatchback', 'bike', 'rickshaw'].includes(vehicle_type)) {
      errors.vehicle_type = ['The vehicle type must be sedan, suv, hatchback, bike, or rickshaw.'];
    }

    if (Object.keys(errors).length > 0) {
      return res.status(422).json({ message: 'The given data was invalid.', errors });
    }

    // Check unique
    const existingLicense = await DriverDetail.findOne({ license_number });
    if (existingLicense) {
      return res.status(422).json({
        message: 'The given data was invalid.',
        errors: { license_number: ['The license number has already been taken.'] }
      });
    }

    const existingPlate = await DriverDetail.findOne({ vehicle_plate_number });
    if (existingPlate) {
      return res.status(422).json({
        message: 'The given data was invalid.',
        errors: { vehicle_plate_number: ['The vehicle plate number has already been taken.'] }
      });
    }

    const detail = new DriverDetail({
      user_id: req.user._id,
      license_number,
      vehicle_model,
      vehicle_plate_number,
      vehicle_color,
      vehicle_type,
      is_available: false
    });

    await detail.save();

    res.status(201).json({
      message: 'Vehicle registered successfully.',
      driver_detail: detail
    });

  } catch (err) {
    next(err);
  }
};

const updateVehicle = async (req, res, next) => {
  try {
    const detail = await DriverDetail.findOne({ user_id: req.user._id });
    if (!detail) {
      return res.status(404).json({ message: 'Vehicle details not found.' });
    }

    const { license_number, vehicle_model, vehicle_plate_number, vehicle_color, vehicle_type } = req.body;

    const errors = {};
    if (!license_number) errors.license_number = ['The license number field is required.'];
    if (!vehicle_model) errors.vehicle_model = ['The vehicle model field is required.'];
    if (!vehicle_plate_number) errors.vehicle_plate_number = ['The vehicle plate number field is required.'];
    if (!vehicle_color) errors.vehicle_color = ['The vehicle color field is required.'];
    if (!vehicle_type || !['sedan', 'suv', 'hatchback', 'bike', 'rickshaw'].includes(vehicle_type)) {
      errors.vehicle_type = ['The vehicle type must be sedan, suv, hatchback, bike, or rickshaw.'];
    }

    if (Object.keys(errors).length > 0) {
      return res.status(422).json({ message: 'The given data was invalid.', errors });
    }

    // Check unique excluding this detail
    const existingLicense = await DriverDetail.findOne({ license_number, _id: { $ne: detail._id } });
    if (existingLicense) {
      return res.status(422).json({
        message: 'The given data was invalid.',
        errors: { license_number: ['The license number has already been taken.'] }
      });
    }

    const existingPlate = await DriverDetail.findOne({ vehicle_plate_number, _id: { $ne: detail._id } });
    if (existingPlate) {
      return res.status(422).json({
        message: 'The given data was invalid.',
        errors: { vehicle_plate_number: ['The vehicle plate number has already been taken.'] }
      });
    }

    detail.license_number = license_number;
    detail.vehicle_model = vehicle_model;
    detail.vehicle_plate_number = vehicle_plate_number;
    detail.vehicle_color = vehicle_color;
    detail.vehicle_type = vehicle_type;
    await detail.save();

    res.status(200).json({
      message: 'Vehicle details updated successfully.',
      driver_detail: detail
    });

  } catch (err) {
    next(err);
  }
};

const deleteVehicle = async (req, res, next) => {
  try {
    const detail = await DriverDetail.findOne({ user_id: req.user._id });
    if (!detail) {
      return res.status(404).json({ message: 'Vehicle details not found.' });
    }

    await DriverDetail.findByIdAndDelete(detail._id);

    res.status(200).json({
      message: 'Vehicle details removed successfully.'
    });

  } catch (err) {
    next(err);
  }
};

const cancelRide = async (req, res, next) => {
  try {
    const ride = await Ride.findOne({
      _id: req.params.id,
      driver_id: req.user._id
    }).populate('payment');

    if (!ride) {
      return res.status(404).json({ message: 'Ride not found.' });
    }

    if (['completed', 'cancelled'].includes(ride.status)) {
      return res.status(422).json({
        message: 'Cannot cancel a ride that is already completed or cancelled.'
      });
    }

    ride.status = 'cancelled';
    await ride.save();

    // Refund wallet if payment method was wallet and completed
    if (ride.payment && ride.payment.payment_method === 'wallet' && ride.payment.payment_status === 'completed') {
      let wallet = await Wallet.findOne({ user_id: ride.customer_id });
      if (wallet) {
        wallet.balance = parseFloat((wallet.balance + ride.fare).toFixed(2));
        await wallet.save();
      }

      await WalletTransaction.create({
        wallet_id: wallet ? wallet._id : null,
        user_id: ride.customer_id,
        type: 'refund',
        amount: ride.fare,
        description: `Refund for Ride #${ride._id} (Driver cancelled)`,
        reference_id: ride._id.toString()
      });

      ride.payment.payment_status = 'refunded';
      await ride.payment.save();
    } else if (ride.payment) {
      ride.payment.payment_status = 'failed';
      await ride.payment.save();
    }

    // Mark driver as available again
    await DriverDetail.findOneAndUpdate(
      { user_id: req.user._id },
      { is_available: true }
    );

    res.status(200).json({ message: 'Ride cancelled successfully.', ride });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  updateLocation,
  rideRequests,
  acceptRide,
  updateStatus,
  cancelRide,
  rideHistory,
  registerVehicle,
  updateVehicle,
  deleteVehicle
};
