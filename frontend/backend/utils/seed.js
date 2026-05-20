const dotenv = require('dotenv');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Book = require('../src/models/Book');
const IssuedBook = require('../src/models/IssuedBook');

dotenv.config();

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

async function seed() {
  try {
    await mongoose.connect(buildMongoUri());
    console.log('MongoDB connected for seeding.');

    await Promise.all([User.deleteMany(), Book.deleteMany(), IssuedBook.deleteMany()]);

    const admin = await User.create({
      name: 'Library Admin',
      email: 'admin@library.com',
      password: 'admin123',
      role: 'admin',
      phone: '03000000000',
      department: 'Library Office'
    });

    const student = await User.create({
      name: 'Demo Student',
      email: 'student@library.com',
      password: 'student123',
      role: 'user',
      phone: '03111111111',
      department: 'Information Sciences'
    });

    await Book.insertMany([
      {
        title: 'Database System Concepts',
        author: 'Abraham Silberschatz',
        category: 'Database',
        isbn: '9780073523323',
        totalCopies: 5,
        availableCopies: 5,
        shelf: 'DB-01',
        description: 'Core concepts of DBMS, SQL, transactions and normalization.',
        createdBy: admin._id
      },
      {
        title: 'Clean Code',
        author: 'Robert C. Martin',
        category: 'Programming',
        isbn: '9780132350884',
        totalCopies: 3,
        availableCopies: 3,
        shelf: 'CS-02',
        description: 'Best practices for writing readable and maintainable code.',
        createdBy: admin._id
      },
      {
        title: 'Artificial Intelligence: A Modern Approach',
        author: 'Stuart Russell',
        category: 'Artificial Intelligence',
        isbn: '9780134610993',
        totalCopies: 4,
        availableCopies: 4,
        shelf: 'AI-01',
        description: 'A complete AI textbook covering search, reasoning and learning.',
        createdBy: admin._id
      },
      {
        title: 'Computer Networking',
        author: 'James F. Kurose',
        category: 'Networking',
        isbn: '9780133594140',
        totalCopies: 2,
        availableCopies: 2,
        shelf: 'NW-04',
        description: 'Networking concepts with internet protocols and applications.',
        createdBy: admin._id
      }
    ]);

    console.log('\n✅ Seed completed successfully.');
    console.log('Admin Login: admin@library.com / admin123');
    console.log('User Login : student@library.com / student123\n');
    await mongoose.disconnect();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

seed();
