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

## How to run

### 1. Open backend folder

```bash
cd college-library-system/backend
```

### 2. Install packages

```bash
npm install
```

### 3. Create `.env` file

Copy `.env.example` and rename it to `.env`.

For Windows PowerShell:

```powershell
copy .env.example .env
```

For Mac/Linux:

```bash
cp .env.example .env
```

### 4. Start MongoDB

Use local MongoDB or MongoDB Atlas. Default local database name is:

```txt
college_library_system
```

### 5. Add demo data

```bash
npm run seed
```

Demo admin login:

```txt
Email: admin@library.com
Password: admin123
```

Demo student login:

```txt
Email: student@library.com
Password: student123
```

### 6. Start website

```bash
npm run dev
```

Open this URL:

```txt
http://localhost:5000
```

## Important notes

- Do not put all code in `index.html`. This project is already separated into frontend and backend folders.
- Frontend design is in `frontend/css/style.css`.
- Frontend actions/API calls are in `frontend/js/app.js`.
- Backend routes and database logic are in `backend/src`.
- Do not upload `backend/.env` to GitHub because it contains secrets.
- `node_modules` is not included in this ZIP. Run `npm install` to create it again.

## Viva explanation

This is a full-stack College Library System. The frontend is built using HTML, CSS and JavaScript. The backend is built using Node.js and Express.js. MongoDB stores users, books and issue records. JWT is used for login security and bcrypt is used for password hashing. Admin can manage books, users and issue/return records. Students can view books and their own issued book records.
