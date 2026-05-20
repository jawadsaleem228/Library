// Error handler: sends clean backend error messages to frontend.
function errorHandler(err, req, res, next) {
  console.error(err);

  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map((item) => item.message).join(', ');
    return res.status(400).json({ message });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({ message: `${field} already exists` });
  }

  return res.status(err.statusCode || 500).json({
    message: err.message || 'Server error. Please try again.'
  });
}

module.exports = errorHandler;
