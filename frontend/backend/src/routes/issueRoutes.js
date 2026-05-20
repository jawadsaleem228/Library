const express = require('express');
const { protect, adminOnly } = require('../middleware/auth');
const { getIssues, issueBook, returnBook, deleteIssue } = require('../controllers/issueController');

const router = express.Router();

router.get('/', protect, getIssues);
router.post('/', protect, adminOnly, issueBook);
router.patch('/:id/return', protect, adminOnly, returnBook);
router.delete('/:id', protect, adminOnly, deleteIssue);

module.exports = router;
