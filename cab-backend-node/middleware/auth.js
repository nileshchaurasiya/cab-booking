const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthenticated.' });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'cab_booking_jwt_secret_key_12345!');
    } catch (err) {
      return res.status(401).json({ message: 'Unauthenticated.' });
    }

    const user = await User.findById(decoded.id).populate('driver_detail');
    if (!user) {
      return res.status(401).json({ message: 'Unauthenticated.' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ message: 'Your account has been suspended by an administrator.' });
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'This action is unauthorized.' });
    }
    next();
  };
};

module.exports = {
  authenticate,
  restrictTo
};
