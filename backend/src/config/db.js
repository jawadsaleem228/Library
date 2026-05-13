// MongoDB connection file. Uses MONGO_URI first, or constructs a URI from DB_HOST / DB_NAME.
const mongoose = require('mongoose');

function buildMongoUri() {
  if (process.env.MONGO_URI) {
    return process.env.MONGO_URI;
  }

  const host = process.env.DB_HOST || '127.0.0.1:27017';
  const dbName = process.env.DB_NAME || 'college_library_system';

  if (process.env.DB_USER && process.env.DB_PASSWORD) {
    const password = encodeURIComponent(process.env.DB_PASSWORD);
    return `mongodb://${process.env.DB_USER}:${password}@${host}/${dbName}`;
  }

  return `mongodb://${host}/${dbName}`;
}

async function connectDB() {
  try {
    const mongoUri = buildMongoUri();
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
}

module.exports = connectDB;
