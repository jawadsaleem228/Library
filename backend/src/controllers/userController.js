const User = require('../models/User');
const IssuedBook = require('../models/IssuedBook');
const { getPagination, buildPagination } = require('../utils/pagination');

exports.getUsers = async (req, res, next) => {
  try {
    const { search = '', role = '' } = req.query;
    const { page, limit, skip } = getPagination(req.query);

    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } }
      ];
    }
    if (role) filter.role = role;

    const [users, total] = await Promise.all([
      User.find(filter).select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(filter)
    ]);

    res.json({ data: users, pagination: buildPagination(total, page, limit) });
  } catch (error) {
    next(error);
  }
};

exports.createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, phone, department } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required.' });
    }
    const user = await User.create({ name, email, password, role, phone, department });
    res.status(201).json({ message: 'User added successfully.', user: { ...user.toObject(), password: undefined } });
  } catch (error) {
    next(error);
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('+password');
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const editableFields = ['name', 'email', 'role', 'phone', 'department', 'isActive'];
    editableFields.forEach((field) => {
      if (req.body[field] !== undefined) user[field] = req.body[field];
    });
    if (req.body.password) user.password = req.body.password;

    await user.save();
    const clean = user.toObject();
    delete clean.password;
    res.json({ message: 'User updated successfully.', user: clean });
  } catch (error) {
    next(error);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const activeIssue = await IssuedBook.findOne({ user: user._id, status: { $in: ['issued', 'late'] } });
    if (activeIssue) return res.status(400).json({ message: 'This user has an issued book. Return it first.' });

    await user.deleteOne();
    res.json({ message: 'User deleted successfully.' });
  } catch (error) {
    next(error);
  }
};
