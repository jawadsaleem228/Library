# College Library System

A clean and simple college library website with separate frontend and backend folders.

## What is included

- Login and signup
- Admin and user roles
- Dashboard statistics
- Add, edit, delete and search books
- Manage students/users
- Issue and return books
- Due date and late fine tracking
- Book cover image upload
- Responsive clean website design

## Folder Structure

```txt
college-library-system/
  frontend/
    index.html        # Website page structure only
    css/style.css     # Website design only
    js/app.js         # Frontend JavaScript/API calls only

  backend/
    server.js         # Main Express server file
    package.json      # Backend packages and scripts
    .env.example      # Example environment variables
    src/
      config/         # Database connection
      controllers/    # Main backend logic
      middleware/     # Auth, upload and error handling
      models/         # MongoDB schemas
      routes/         # API routes
      utils/          # Token and pagination helpers
    uploads/books/    # Uploaded book cover images
```
