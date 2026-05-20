// IssuedBook model: stores issue date, due date, return status and late fine.
const mongoose = require('mongoose');

const issuedBookSchema = new mongoose.Schema(
  {
    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book',
      required: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    issueDate: {
      type: Date,
      default: Date.now
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required']
    },
    returnDate: {
      type: Date
    },
    status: {
      type: String,
      enum: ['issued', 'returned', 'late'],
      default: 'issued'
    },
    finePerDay: {
      type: Number,
      default: () => Number(process.env.FINE_PER_DAY || 20)
    },
    fineAmount: {
      type: Number,
      default: 0
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    }
  },
  { timestamps: true }
);

issuedBookSchema.methods.calculateFine = function (endDate = new Date()) {
  const due = new Date(this.dueDate);
  const returned = new Date(endDate);
  if (returned <= due) return 0;
  const diffMs = returned.getTime() - due.getTime();
  const lateDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return lateDays * this.finePerDay;
};

module.exports = mongoose.model('IssuedBook', issuedBookSchema);
