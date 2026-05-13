const IssuedBook = require('../models/IssuedBook');

exports.getNotifications = async (req, res, next) => {
  try {
    const now = new Date();
    const nextTwoDays = new Date();
    nextTwoDays.setDate(now.getDate() + 2);

    const filter = {
      status: { $in: ['issued', 'late'] },
      dueDate: { $lte: nextTwoDays }
    };
    if (req.user.role !== 'admin') filter.user = req.user._id;

    const records = await IssuedBook.find(filter)
      .populate('book', 'title author')
      .populate('user', 'name email')
      .sort({ dueDate: 1 })
      .limit(10);

    const notifications = records.map((record) => {
      const isLate = record.dueDate < now;
      return {
        id: record._id,
        type: isLate ? 'late' : 'due-soon',
        title: isLate ? 'Late book alert' : 'Due date alert',
        message: `${record.book?.title || 'Book'} ${isLate ? 'is late' : 'is due soon'} for ${record.user?.name || 'user'}.`,
        dueDate: record.dueDate,
        fine: record.calculateFine(now)
      };
    });

    res.json({ notifications });
  } catch (error) {
    next(error);
  }
};
