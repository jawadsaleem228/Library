const Book = require('../models/Book');
const User = require('../models/User');
const IssuedBook = require('../models/IssuedBook');
const { getPagination, buildPagination } = require('../utils/pagination');

async function refreshLateStatuses() {
  await IssuedBook.updateMany(
    { status: 'issued', dueDate: { $lt: new Date() } },
    { $set: { status: 'late' } }
  );
}

exports.getIssues = async (req, res, next) => {
  try {
    await refreshLateStatuses();

    const { status = '', search = '' } = req.query;
    const { page, limit, skip } = getPagination(req.query);

    const filter = {};
    if (req.user.role !== 'admin') filter.user = req.user._id;
    if (status) filter.status = status;

    let query = IssuedBook.find(filter)
      .populate('book', 'title author category coverImage')
      .populate('user', 'name email role department')
      .populate('issuedBy', 'name email')
      .sort({ createdAt: -1 });

    let items = await query;

    if (search) {
      const value = search.toLowerCase();
      items = items.filter((item) =>
        item.book?.title?.toLowerCase().includes(value) ||
        item.book?.author?.toLowerCase().includes(value) ||
        item.user?.name?.toLowerCase().includes(value) ||
        item.user?.email?.toLowerCase().includes(value)
      );
    }

    const total = items.length;
    const data = items.slice(skip, skip + limit).map((item) => {
      const obj = item.toObject();
      if (obj.status !== 'returned') obj.fineAmount = item.calculateFine(new Date());
      return obj;
    });

    res.json({ data, pagination: buildPagination(total, page, limit) });
  } catch (error) {
    next(error);
  }
};

exports.issueBook = async (req, res, next) => {
  try {
    const { bookId, userId, dueDate, notes } = req.body;
    if (!bookId || !userId || !dueDate) {
      return res.status(400).json({ message: 'Book, user and due date are required.' });
    }

    const [book, user] = await Promise.all([Book.findById(bookId), User.findById(userId)]);
    if (!book) return res.status(404).json({ message: 'Book not found.' });
    if (!user || !user.isActive) return res.status(404).json({ message: 'User not found or inactive.' });
    if (book.availableCopies <= 0) return res.status(400).json({ message: 'Book is not available.' });

    const due = new Date(dueDate);
    if (Number.isNaN(due.getTime()) || due <= new Date()) {
      return res.status(400).json({ message: 'Due date must be a future date.' });
    }

    const alreadyIssued = await IssuedBook.findOne({ book: book._id, user: user._id, status: { $in: ['issued', 'late'] } });
    if (alreadyIssued) return res.status(400).json({ message: 'This user already has this book.' });

    const issued = await IssuedBook.create({
      book: book._id,
      user: user._id,
      issuedBy: req.user._id,
      dueDate: due,
      notes
    });

    book.availableCopies -= 1;
    await book.save();

    const populated = await issued.populate([
      { path: 'book', select: 'title author category coverImage' },
      { path: 'user', select: 'name email role department' },
      { path: 'issuedBy', select: 'name email' }
    ]);

    res.status(201).json({ message: 'Book issued successfully.', issuedBook: populated });
  } catch (error) {
    next(error);
  }
};

exports.returnBook = async (req, res, next) => {
  try {
    const issue = await IssuedBook.findById(req.params.id).populate('book');
    if (!issue) return res.status(404).json({ message: 'Issue record not found.' });
    if (issue.status === 'returned') return res.status(400).json({ message: 'Book is already returned.' });

    issue.returnDate = new Date();
    issue.fineAmount = issue.calculateFine(issue.returnDate);
    issue.status = 'returned';
    await issue.save();

    const book = await Book.findById(issue.book._id);
    if (book) {
      book.availableCopies = Math.min(book.availableCopies + 1, book.totalCopies);
      await book.save();
    }

    res.json({ message: `Book returned successfully. Fine: Rs. ${issue.fineAmount}`, issue });
  } catch (error) {
    next(error);
  }
};

exports.deleteIssue = async (req, res, next) => {
  try {
    const issue = await IssuedBook.findById(req.params.id);
    if (!issue) return res.status(404).json({ message: 'Issue record not found.' });
    if (issue.status !== 'returned') return res.status(400).json({ message: 'Only returned issue records can be deleted.' });
    await issue.deleteOne();
    res.json({ message: 'Issue record deleted.' });
  } catch (error) {
    next(error);
  }
};
