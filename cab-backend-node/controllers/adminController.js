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
    // Sum completed commissions
    const completedPayments = await Payment.find({ payment_status: 'completed' });
    const totalEarnings = completedPayments.reduce((sum, p) => sum + (p.admin_commission || 0), 0);

    const totalCompletedRides = await Ride.countDocuments({ status: 'completed' });
    const totalUsers = await User.countDocuments();
    // Find active drivers whose user status is not suspended
    const activeDriversDetails = await DriverDetail.find({ is_available: true }).populate('user_id');
    const activeDrivers = activeDriversDetails.filter(d => d.user_id && d.user_id.status !== 'suspended').length;

    res.status(200).json({
      stats: {
        total_earnings: Math.round(totalEarnings * 100) / 100,
        total_completed_rides: totalCompletedRides,
        total_users: totalUsers,
        active_drivers_online: activeDrivers
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
