const Book = require('../models/Book');
const User = require('../models/User');
const IssuedBook = require('../models/IssuedBook');

exports.getStats = async (req, res, next) => {
  try {
    const [totalBooks, usersCount, activeIssues, returnedCount] = await Promise.all([
      Book.countDocuments(),
      User.countDocuments({ isActive: true }),
      IssuedBook.countDocuments({ status: { $in: ['issued', 'late'] } }),
      IssuedBook.countDocuments({ status: 'returned' })
    ]);

    const availableAgg = await Book.aggregate([
      { $group: { _id: null, availableBooks: { $sum: '$availableCopies' }, totalCopies: { $sum: '$totalCopies' } } }
    ]);

    const today = new Date();
    const lateBooks = await IssuedBook.countDocuments({
      status: { $in: ['issued', 'late'] },
      dueDate: { $lt: today }
    });

    res.json({
      totalBooks,
      totalCopies: availableAgg[0]?.totalCopies || 0,
      issuedBooks: activeIssues,
      availableBooks: availableAgg[0]?.availableBooks || 0,
      usersCount,
      returnedCount,
      lateBooks
    });
  } catch (error) {
    next(error);
  }
};
