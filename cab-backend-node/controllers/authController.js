const User = require('../models/User');
const DriverDetail = require('../models/DriverDetail');
const jwt = require('jsonwebtoken');

const generateToken = (user) => {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'cab_booking_jwt_secret_key_12345!', {
    expiresIn: '30d'
  });
};

const register = async (req, res, next) => {
  try {
    const { name, email, phone, password, role, license_number, vehicle_model, vehicle_plate_number, vehicle_color, vehicle_type } = req.body;

    const errors = {};

    // Basic validation
    if (!name) errors.name = ['The name field is required.'];
    if (!email) errors.email = ['The email field is required.'];
    if (!phone) errors.phone = ['The phone field is required.'];
    if (!password || password.length < 6) errors.password = ['The password must be at least 6 characters.'];
    if (!role || !['customer', 'driver'].includes(role)) errors.role = ['The role field is required.'];

    if (Object.keys(errors).length > 0) {
      return res.status(422).json({ message: 'The given data was invalid.', errors });
    }

    // Check unique email and phone
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      errors.email = ['The email has already been taken.'];
    }
    const existingPhone = await User.findOne({ phone });
    if (existingPhone) {
      errors.phone = ['The phone has already been taken.'];
    }

    // Driver specific validation (only if license_number is provided)
    if (role === 'driver' && license_number) {
      if (!vehicle_model) errors.vehicle_model = ['The vehicle model field is required.'];
      if (!vehicle_plate_number) errors.vehicle_plate_number = ['The vehicle plate number field is required.'];
      if (!vehicle_color) errors.vehicle_color = ['The vehicle color field is required.'];
      if (!vehicle_type || !['sedan', 'suv', 'hatchback', 'bike', 'rickshaw'].includes(vehicle_type)) {
        errors.vehicle_type = ['The vehicle type must be sedan, suv, hatchback, bike, or rickshaw.'];
      }

      if (Object.keys(errors).length > 0) {
        return res.status(422).json({ message: 'The given data was invalid.', errors });
      }

      // Check unique license and plate number
      const existingLicense = await DriverDetail.findOne({ license_number });
      if (existingLicense) {
        errors.license_number = ['The license number has already been taken.'];
      }
      const existingPlate = await DriverDetail.findOne({ vehicle_plate_number });
      if (existingPlate) {
        errors.vehicle_plate_number = ['The vehicle plate number has already been taken.'];
      }
    }

    if (Object.keys(errors).length > 0) {
      return res.status(422).json({ message: 'The given data was invalid.', errors });
    }

    // Create user
    const user = new User({
      name,
      email,
      phone,
      password, // Will be hashed in pre-save hook
      role,
      status: 'active'
    });

    await user.save();

    if (role === 'driver' && license_number) {
      const driverDetail = new DriverDetail({
        user_id: user._id,
        license_number,
        vehicle_model,
        vehicle_plate_number,
        vehicle_color,
        vehicle_type,
        is_available: false,
        current_latitude: 12.9716,
        current_longitude: 77.5946,
        rating: 5.0
      });
      await driverDetail.save();
    }

    // Fetch complete user with driver_detail populated
    const populatedUser = await User.findById(user._id).populate({
      path: 'driver_detail',
      populate: { path: 'reviews_count' }
    });
    const token = generateToken(populatedUser);

    res.status(201).json({
      user: populatedUser,
      access_token: token,
      token_type: 'Bearer'
    });

  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const errors = {};
    if (!email) errors.email = ['The email field is required.'];
    if (!password) errors.password = ['The password field is required.'];

    if (Object.keys(errors).length > 0) {
      return res.status(422).json({ message: 'The given data was invalid.', errors });
    }

    const user = await User.findOne({ email }).populate({
      path: 'driver_detail',
      populate: { path: 'reviews_count' }
    });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(422).json({
        message: 'The given data was invalid.',
        errors: {
          email: ['Invalid login credentials.']
        }
      });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({
        message: 'Your account has been suspended by an administrator.'
      });
    }

    const token = generateToken(user);

    res.status(200).json({
      user,
      access_token: token,
      token_type: 'Bearer'
    });
  } catch (err) {
    next(err);
  }
};

const logout = async (req, res, next) => {
  // Since JWT is stateless, client deletes it on their side.
  // We can just return success to match the endpoint.
  res.status(200).json({
    message: 'Logged out successfully.'
  });
};

const me = async (req, res, next) => {
  // req.user is already loaded by the authenticate middleware
  res.status(200).json({
    user: req.user
  });
};

module.exports = {
  register,
  login,
  logout,
  me
};
