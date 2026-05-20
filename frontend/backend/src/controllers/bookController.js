const fs = require('fs');
const path = require('path');
const Book = require('../models/Book');
const IssuedBook = require('../models/IssuedBook');
const { getPagination, buildPagination } = require('../utils/pagination');

function coverPath(fileName) {
  return path.join(__dirname, '../../uploads/books', fileName);
}

exports.getBooks = async (req, res, next) => {
  try {
    const { search = '', category = '', status = '' } = req.query;
    const { page, limit, skip } = getPagination(req.query);

    const filter = {};
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { isbn: { $regex: search, $options: 'i' } }
      ];
    }
    if (category) filter.category = { $regex: category, $options: 'i' };
    if (status === 'available') filter.availableCopies = { $gt: 0 };
    if (status === 'issued') filter.availableCopies = 0;

    const [books, total] = await Promise.all([
      Book.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Book.countDocuments(filter)
    ]);

    res.json({ data: books, pagination: buildPagination(total, page, limit) });
  } catch (error) {
    next(error);
  }
};

exports.createBook = async (req, res, next) => {
  try {
    const payload = {
      ...req.body,
      totalCopies: Number(req.body.totalCopies || 1),
      availableCopies: Number(req.body.availableCopies || req.body.totalCopies || 1),
      createdBy: req.user._id
    };

    if (req.file) payload.coverImage = `/uploads/books/${req.file.filename}`;

    if (payload.availableCopies > payload.totalCopies) {
      return res.status(400).json({ message: 'Available copies cannot be greater than total copies.' });
    }

    const book = await Book.create(payload);
    res.status(201).json({ message: 'Book added successfully.', book });
  } catch (error) {
    next(error);
  }
};

exports.updateBook = async (req, res, next) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: 'Book not found.' });

    const issuedCount = await IssuedBook.countDocuments({ book: book._id, status: { $in: ['issued', 'late'] } });
    const totalCopies = req.body.totalCopies !== undefined ? Number(req.body.totalCopies) : book.totalCopies;
    const availableCopies = req.body.availableCopies !== undefined ? Number(req.body.availableCopies) : book.availableCopies;

    if (availableCopies > totalCopies) {
      return res.status(400).json({ message: 'Available copies cannot be greater than total copies.' });
    }
    if (totalCopies < issuedCount) {
      return res.status(400).json({ message: `Total copies cannot be less than issued copies (${issuedCount}).` });
    }

    Object.assign(book, req.body, { totalCopies, availableCopies });

    if (req.file) {
      if (book.coverImage) {
        const oldName = path.basename(book.coverImage);
        const oldPath = coverPath(oldName);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      book.coverImage = `/uploads/books/${req.file.filename}`;
    }

    await book.save();
    res.json({ message: 'Book updated successfully.', book });
  } catch (error) {
    next(error);
  }
};

exports.deleteBook = async (req, res, next) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: 'Book not found.' });

    const activeIssue = await IssuedBook.findOne({ book: book._id, status: { $in: ['issued', 'late'] } });
    if (activeIssue) return res.status(400).json({ message: 'This book is currently issued. Return it first.' });

    if (book.coverImage) {
      const filePath = coverPath(path.basename(book.coverImage));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await book.deleteOne();
    res.json({ message: 'Book deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

exports.getCategories = async (req, res, next) => {
  try {
    const categories = await Book.distinct('category');
    res.json({ categories: categories.filter(Boolean).sort() });
  } catch (error) {
    next(error);
  }
};
