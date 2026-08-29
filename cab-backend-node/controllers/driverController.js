const DriverDetail = require('../models/DriverDetail');
const Ride = require('../models/Ride');
const Payment = require('../models/Payment');

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
  if (['sedan', 'suv', 'hatchback'].includes(driverVehicleType)) {
    return 'Car';
  }
  if (driverVehicleType === 'bike') {
    return 'Bike';
  }
  if (driverVehicleType === 'rickshaw') {
    return 'Rickshaw';
  }
  return null;
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

const updateLocation = async (req, res, next) => {
  try {
    const { latitude, longitude, is_available } = req.body;

    if (latitude === undefined || longitude === undefined || is_available === undefined) {
      return res.status(422).json({
        message: 'The given data was invalid.',
        errors: {
          latitude: latitude === undefined ? ['The latitude field is required.'] : [],
          longitude: longitude === undefined ? ['The longitude field is required.'] : [],
          is_available: is_available === undefined ? ['The is available field is required.'] : []
        }
      });
    }

    const driverDetail = await DriverDetail.findOne({ user_id: req.user._id });
    if (!driverDetail) {
      return res.status(404).json({ message: 'Driver details not found.' });
    }

    driverDetail.current_latitude = parseFloat(latitude);
    driverDetail.current_longitude = parseFloat(longitude);
    driverDetail.is_available = !!is_available;
    await driverDetail.save();

    res.status(200).json({
      message: 'Location and availability updated successfully.',
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

    const lat = driverDetail.current_latitude;
    const lon = driverDetail.current_longitude;

    if (lat === null || lon === null) {
      return res.status(422).json({
        message: 'Update your current location before retrieving ride requests.'
      });
    }

    // Map driver vehicle type to allowed customer ride vehicle type
    const rideVehicleType = getRideVehicleTypeForDriver(driverDetail.vehicle_type);

    // Retrieve requested rides matching driver vehicle type
    const rides = await Ride.find({ 
      status: 'requested',
      vehicle_type: rideVehicleType 
    }).populate('customer', 'id name phone');
    const radius = 15; // 15km

    const filteredRequests = rides
      .map(ride => {
        const dist = getDistance(lat, lon, ride.pickup_latitude, ride.pickup_longitude);
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

    const ride = await Ride.findById(req.params.id);
    if (!ride) {
      return res.status(404).json({ message: 'Ride request not found.' });
    }

    if (ride.status !== 'requested') {
      return res.status(422).json({
        message: 'This ride has already been accepted or cancelled.'
      });
    }

    // Verify driver vehicle compatibility with the ride vehicle type
    const expectedRideVehicleType = getRideVehicleTypeForDriver(driverDetail.vehicle_type);
    if (ride.vehicle_type !== expectedRideVehicleType) {
      return res.status(422).json({
        message: 'This ride is for a different vehicle type.'
      });
    }

    ride.driver_id = req.user._id;
    ride.status = 'accepted';
    ride.driver_accepted_at = new Date();
    const randomMins = Math.floor(Math.random() * 3) + 1; // 1, 2, or 3 mins
    ride.estimated_pickup_at = new Date(Date.now() + randomMins * 60 * 1000);
    await ride.save();

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
    if (!status || !['arrived', 'waiting_for_customer', 'in_progress', 'completed'].includes(status)) {
      return res.status(422).json({
        message: 'The given data was invalid.',
        errors: {
          status: ['The status is invalid. Must be arrived, waiting_for_customer, in_progress, or completed.']
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
    if (status === 'arrived' && ride.status !== 'accepted') {
      return res.status(422).json({ message: 'Invalid status progression. Must be accepted to arrive.' });
    }
    if (status === 'waiting_for_customer' && ride.status !== 'arrived') {
      return res.status(422).json({ message: 'Invalid status progression. Must be arrived to pick up customer.' });
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
      // Free driver
      await DriverDetail.findOneAndUpdate(
        { user_id: req.user._id },
        { is_available: true }
      );

      // Complete payment
      if (ride.payment) {
        ride.payment.payment_status = 'completed';
        await ride.payment.save();
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

module.exports = {
  updateLocation,
  rideRequests,
  acceptRide,
  updateStatus,
  rideHistory,
  registerVehicle,
  updateVehicle,
  deleteVehicle
};
