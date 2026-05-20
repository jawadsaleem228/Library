const express = require('express');
const upload = require('../middleware/upload');
const { protect, adminOnly } = require('../middleware/auth');
const { getBooks, createBook, updateBook, deleteBook, getCategories } = require('../controllers/bookController');

const router = express.Router();

router.get('/', protect, getBooks);
router.get('/categories', protect, getCategories);
router.post('/', protect, adminOnly, upload.single('coverImage'), createBook);
router.put('/:id', protect, adminOnly, upload.single('coverImage'), updateBook);
router.delete('/:id', protect, adminOnly, deleteBook);

module.exports = router;
