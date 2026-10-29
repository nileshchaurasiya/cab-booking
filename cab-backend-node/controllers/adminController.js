const User = require('../models/User');
const Ride = require('../models/Ride');
const Payment = require('../models/Payment');
const DriverDetail = require('../models/DriverDetail');

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

const dashboard = async (req, res, next) => {
  try {
    // Sum completed commissions only for rides that actually exist in the database
    const completedRides = await Ride.find({ status: 'completed' }).select('_id');
    const completedRideIds = completedRides.map(r => r._id);

    const completedPayments = await Payment.find({
      ride_id: { $in: completedRideIds },
      payment_status: 'completed'
    });
    const totalEarnings = completedPayments.reduce((sum, p) => sum + (p.admin_commission || 0), 0);

    const totalCompletedRides = await Ride.countDocuments({ status: 'completed' });
    const totalUsers = await User.countDocuments();

    // Find active drivers: either available OR currently on an active trip
    const activeDriverUsers = await User.find({ role: 'driver', status: { $ne: 'suspended' } }).select('_id');
    const activeDriverUserIds = activeDriverUsers.map(u => u._id);

    // Drivers currently on a trip
    const busyDriverIds = await Ride.distinct('driver_id', {
      driver_id: { $in: activeDriverUserIds },
      status: { $in: ['accepted', 'arrived', 'waiting_for_customer', 'in_progress'] }
    });

    // Drivers available
    const availableDriverUserIds = await DriverDetail.distinct('user_id', {
      user_id: { $in: activeDriverUserIds },
      is_available: true
    });

    const allOnlineDrivers = new Set([
      ...busyDriverIds.map(id => id.toString()),
      ...availableDriverUserIds.map(id => id.toString())
    ]);

    res.status(200).json({
      stats: {
        total_earnings: Math.round(totalEarnings * 100) / 100,
        total_completed_rides: totalCompletedRides,
        total_users: totalUsers,
        active_drivers_online: allOnlineDrivers.size
      }
    });

  } catch (err) {
    next(err);
  }
};

const users = async (req, res, next) => {
  try {
    const { role, status, search } = req.query;

    const query = {};

    if (role) {
      query.role = role;
    }

    if (status) {
      query.status = status;
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex }
      ];
    }

    const paginatedUsers = await paginate(query, User, req, ['driver_detail']);

    // If fetching drivers, attach active ride and true shift status
    if (role === 'driver' || !role) {
      const driverUserIds = paginatedUsers.data
        .filter(u => u.role === 'driver')
        .map(u => u._id);

      const activeRides = await Ride.find({
        driver_id: { $in: driverUserIds },
        status: { $in: ['accepted', 'arrived', 'waiting_for_customer', 'in_progress'] }
      }).select('driver_id status pickup_address dropoff_address fare id');

      const activeRideByDriver = {};
      activeRides.forEach(r => {
        if (r.driver_id) {
          activeRideByDriver[r.driver_id.toString()] = r;
        }
      });

      paginatedUsers.data = paginatedUsers.data.map(u => {
        const userObj = u.toJSON ? u.toJSON() : u;
        if (userObj.role === 'driver') {
          const activeTrip = activeRideByDriver[userObj.id];
          userObj.active_trip = activeTrip || null;
          if (activeTrip) {
            userObj.shift_status = 'on_trip';
          } else if (userObj.driver_detail?.is_available) {
            userObj.shift_status = 'available';
          } else {
            userObj.shift_status = 'offline';
          }
        }
        return userObj;
      });
    }

    res.status(200).json(paginatedUsers);

  } catch (err) {
    next(err);
  }
};

const updateUserStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!status || !['active', 'suspended'].includes(status)) {
      return res.status(422).json({
        message: 'The given data was invalid.',
        errors: {
          status: ['The status must be active or suspended.']
        }
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(422).json({
        message: 'You cannot update your own account status.'
      });
    }

    user.status = status;
    await user.save();

    // If driver is suspended, automatically force them offline in database
    if (user.role === 'driver' && status === 'suspended') {
      await DriverDetail.findOneAndUpdate(
        { user_id: user._id },
        { is_available: false }
      );
    }

    res.status(200).json({
      message: `User account status updated to: ${status}.`,
      user
    });

  } catch (err) {
    next(err);
  }
};

const rides = async (req, res, next) => {
  try {
    const { status, driver_id, customer_id } = req.query;

    const query = {};

    if (status) {
      query.status = status;
    }

    if (driver_id) {
      query.driver_id = driver_id;
    }

    if (customer_id) {
      query.customer_id = customer_id;
    }

    const paginatedRides = await paginate(
      query,
      Ride,
      req,
      [
        { path: 'customer', select: 'id name phone' },
        { path: 'driver', select: 'id name phone' },
        'payment'
      ]
    );

    res.status(200).json(paginatedRides);

  } catch (err) {
    next(err);
  }
};

const deleteDriver = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Driver not found.' });
    }

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(422).json({
        message: 'You cannot delete your own account.'
      });
    }

    if (user.role !== 'driver') {
      return res.status(422).json({
        message: 'Only driver accounts can be removed through this endpoint.'
      });
    }

    // Check if driver has active rides in progress
    const activeRide = await Ride.findOne({
      driver_id: user._id,
      status: { $in: ['accepted', 'arrived', 'waiting_for_customer', 'in_progress'] }
    });

    if (activeRide) {
      return res.status(422).json({
        message: 'Cannot delete driver account with an active ride in progress.'
      });
    }

    // Delete associated driver_detail if it exists
    await DriverDetail.findOneAndDelete({ user_id: user._id });

    // Delete the user account
    await User.findByIdAndDelete(user._id);

    res.status(200).json({
      message: 'Driver account and all associated data removed successfully.'
    });

  } catch (err) {
    next(err);
  }
};

module.exports = {
  dashboard,
  users,
  updateUserStatus,
  deleteDriver,
  rides
};
