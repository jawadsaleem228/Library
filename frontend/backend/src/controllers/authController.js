const User = require('../models/User');
const generateToken = require('../utils/token');

// SIGNUP
exports.signup = async (req, res, next) => {
  try {
    // ❌ role hata diya
    const { name, email, password, phone, department } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        message: 'Name, email and password are required.'
      });
    }

    // Check existing user
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        message: 'User already exists.'
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,

      // ✅ Har signup user hoga
      role: 'user',

      phone,
      department
    });

    // Response
    res.status(201).json({
      message: 'Account created successfully.',
      token: generateToken(user._id, user.role),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (err) {
    console.log(err);

    res.status(500).json({
      message: err.message
    });
  }
};


// LOGIN
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required.'
      });
    }

    // Find user
    const user = await User.findOne({ email }).select('+password');

    // Check user/password
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        message: 'Invalid email or password.'
      });
    }

    // Check active account
    if (!user.isActive) {
      return res.status(403).json({
        message: 'Your account is inactive. Contact admin.'
      });
    }

    // Success response
    res.json({
      message: 'Login successful.',
      token: generateToken(user._id, user.role),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (err) {
    console.log(err);

    res.status(500).json({
      message: err.message
    });
  }
};


// PROFILE
exports.profile = async (req, res) => {
  res.json({ user: req.user });
};