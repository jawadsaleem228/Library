const API_BASE = window.location.origin.includes('localhost') ? '/api' : '/api';

const state = {
  token: localStorage.getItem('lms_token'),
  user: JSON.parse(localStorage.getItem('lms_user') || 'null'),
  section: 'dashboard',
  pages: { books: 1, users: 1, issues: 1 },
  limits: { books: 8, users: 8, issues: 8 },
  bookCache: [],
  userCache: []
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

const loader = $('#loader');
const authPage = $('#authPage');
const appPage = $('#appPage');
const modalOverlay = $('#modalOverlay');
const modalTitle = $('#modalTitle');
const modalBody = $('#modalBody');

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  $('#toastContainer').appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

function formatDate(date) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-PK', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
}

function todayPlusDays(days = 14) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

async function apiFetch(endpoint, options = {}) {
  const headers = options.headers || {};
  if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  if (state.token) headers.Authorization = `Bearer ${state.token}`;

  const response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong');
  }
  return data;
}

function setAuth(user, token) {
  state.user = user;
  state.token = token;
  localStorage.setItem('lms_user', JSON.stringify(user));
  localStorage.setItem('lms_token', token);
  renderApp();
}

function clearAuth() {
  state.user = null;
  state.token = null;
  localStorage.removeItem('lms_user');
  localStorage.removeItem('lms_token');
  renderApp();
}

function renderApp() {
  loader.classList.add('hidden');
  if (!state.token || !state.user) {
    appPage.classList.add('hidden');
    authPage.classList.remove('hidden');
    return;
  }

  authPage.classList.add('hidden');
  appPage.classList.remove('hidden');
  $('#currentUserName').textContent = state.user.name;
  $('#roleBadge').textContent = state.user.role;

  const isAdmin = state.user.role === 'admin';
  $$('.admin-only').forEach((el) => el.classList.toggle('hidden', !isAdmin));
  if (!isAdmin && state.section === 'users') switchSection('dashboard');
  else loadSectionData();
}

function switchSection(section) {
  state.section = section;
  $$('.nav-link').forEach((btn) => btn.classList.toggle('active', btn.dataset.section === section));
  $$('.content-section').forEach((sec) => sec.classList.remove('active'));
  $(`#${section}Section`).classList.add('active');

  const titles = {
    dashboard: ['Dashboard', 'College library overview and due alerts'],
    books: ['Books', 'Search and manage college library books'],
    users: ['Users', 'Manage student/admin accounts'],
    issues: ['Issue Books', 'Book issue, return and fine tracking']
  };
  $('#pageTitle').textContent = titles[section][0];
  $('#pageSubtitle').textContent = titles[section][1];
  $('#sidebar').classList.remove('open');
  loadSectionData();
}

function loadSectionData() {
  if (state.section === 'dashboard') loadDashboard();
  if (state.section === 'books') loadBooks();
  if (state.section === 'users') loadUsers();
  if (state.section === 'issues') loadIssues();
}

async function loadDashboard() {
  try {
    const [stats, notices] = await Promise.all([
      apiFetch('/dashboard/stats'),
      apiFetch('/notifications')
    ]);

    $('#totalBooks').textContent = stats.totalBooks || 0;
    $('#issuedBooks').textContent = stats.issuedBooks || 0;
    $('#availableBooks').textContent = stats.availableBooks || 0;
    $('#usersCount').textContent = stats.usersCount || 0;

    const container = $('#notificationsList');
    if (!notices.notifications.length) {
      container.innerHTML = `<div class="empty-state">No late or due-soon books right now.</div>`;
      return;
    }
    container.innerHTML = notices.notifications.map((item) => `
      <div class="notification-item">
        <div>
          <strong>${item.title}</strong>
          <small>${item.message}<br>Due: ${formatDate(item.dueDate)}</small>
        </div>
        <span class="status-badge ${item.type === 'late' ? 'late' : 'issued'}">Rs. ${item.fine || 0}</span>
      </div>
    `).join('');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function buildPagination(target, pagination, callbackName) {
  const container = $(`#${target}Pagination`);
  if (!pagination || pagination.pages <= 1) {
    container.innerHTML = '';
    return;
  }
  let buttons = '';
  for (let page = 1; page <= pagination.pages; page++) {
    buttons += `<button class="${page === pagination.page ? 'active' : ''}" onclick="${callbackName}(${page})">${page}</button>`;
  }
  container.innerHTML = buttons;
}

window.goBooksPage = (page) => { state.pages.books = page; loadBooks(); };
window.goUsersPage = (page) => { state.pages.users = page; loadUsers(); };
window.goIssuesPage = (page) => { state.pages.issues = page; loadIssues(); };

async function loadCategories() {
  try {
    const data = await apiFetch('/books/categories');
    const select = $('#bookCategoryFilter');
    const current = select.value;
    select.innerHTML = '<option value="">All Categories</option>' + data.categories.map((cat) => `<option value="${cat}">${cat}</option>`).join('');
    select.value = current;
  } catch (error) {
    // Silent because categories are optional for UI convenience
  }
}

async function loadBooks() {
  try {
    const params = new URLSearchParams({
      page: state.pages.books,
      limit: state.limits.books,
      search: $('#bookSearch').value.trim(),
      status: $('#bookStatusFilter').value,
      category: $('#bookCategoryFilter').value
    });
    const result = await apiFetch(`/books?${params}`);
    state.bookCache = result.data;
    const tbody = $('#booksTable');

    if (!result.data.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty-state">No books found.</td></tr>`;
      buildPagination('books', result.pagination, 'goBooksPage');
      return;
    }

    tbody.innerHTML = result.data.map((book) => {
      const status = book.availableCopies > 0 ? 'available' : 'issued';
      const cover = book.coverImage
        ? `<img class="cover-thumb" src="${book.coverImage}" alt="${book.title}">`
        : `<div class="cover-thumb">${book.title.charAt(0).toUpperCase()}</div>`;
      return `
        <tr>
          <td>
            <div class="book-cell">
              ${cover}
              <div><strong>${book.title}</strong><br><small>ISBN: ${book.isbn || '-'}</small></div>
            </div>
          </td>
          <td>${book.author}</td>
          <td>${book.category}</td>
          <td>${book.availableCopies}/${book.totalCopies}<br><small>Shelf: ${book.shelf || '-'}</small></td>
          <td><span class="status-badge ${status}">${status}</span></td>
          <td class="admin-only">
            <div class="table-actions">
              <button class="small-btn edit" onclick="openBookModal('${book._id}')">Edit</button>
              <button class="small-btn delete" onclick="deleteBook('${book._id}')">Delete</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
    buildPagination('books', result.pagination, 'goBooksPage');
    await loadCategories();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function openModal(title, bodyHtml) {
  modalTitle.textContent = title;
  modalBody.innerHTML = bodyHtml;
  modalOverlay.classList.remove('hidden');
}

function closeModal() {
  modalOverlay.classList.add('hidden');
  modalBody.innerHTML = '';
}

window.openBookModal = (bookId = null) => {
  const book = bookId ? state.bookCache.find((item) => item._id === bookId) : null;
  openModal(book ? 'Edit Book' : 'Add New Book', `
    <form id="bookForm">
      <div class="grid-2">
        <div><label>Book Title</label><input name="title" value="${book?.title || ''}" required></div>
        <div><label>Author</label><input name="author" value="${book?.author || ''}" required></div>
      </div>
      <div class="grid-2">
        <div><label>Category</label><input name="category" value="${book?.category || ''}" required></div>
        <div><label>ISBN</label><input name="isbn" value="${book?.isbn || ''}"></div>
      </div>
      <div class="grid-2">
        <div><label>Total Copies</label><input type="number" name="totalCopies" min="1" value="${book?.totalCopies || 1}" required></div>
        <div><label>Available Copies</label><input type="number" name="availableCopies" min="0" value="${book?.availableCopies ?? 1}" required></div>
      </div>
      <label>Shelf / Rack</label><input name="shelf" value="${book?.shelf || ''}" placeholder="Example: DB-01">
      <label>Description</label><textarea name="description" rows="3">${book?.description || ''}</textarea>
      <label>Cover Image</label><input type="file" name="coverImage" accept="image/*">
      <div class="form-actions">
        <button type="button" class="ghost-btn" onclick="closeModal()">Cancel</button>
        <button type="submit" class="primary-btn">Save Book</button>
      </div>
    </form>
  `);

  $('#bookForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const total = Number(formData.get('totalCopies'));
    const available = Number(formData.get('availableCopies'));
    if (available > total) return showToast('Available copies cannot be greater than total copies.', 'error');
    try {
      await apiFetch(book ? `/books/${book._id}` : '/books', {
        method: book ? 'PUT' : 'POST',
        body: formData
      });
      showToast(book ? 'Book updated successfully' : 'Book added successfully');
      closeModal();
      loadBooks();
      loadDashboard();
    } catch (error) {
      showToast(error.message, 'error');
    }
  });
};

window.deleteBook = async (bookId) => {
  if (!confirm('Delete this book?')) return;
  try {
    await apiFetch(`/books/${bookId}`, { method: 'DELETE' });
    showToast('Book deleted successfully');
    loadBooks();
    loadDashboard();
  } catch (error) {
    showToast(error.message, 'error');
  }
};

async function loadUsers() {
  if (state.user.role !== 'admin') return;
  try {
    const params = new URLSearchParams({
      page: state.pages.users,
      limit: state.limits.users,
      search: $('#userSearch').value.trim(),
      role: $('#userRoleFilter').value
    });
    const result = await apiFetch(`/users?${params}`);
    state.userCache = result.data;
    const tbody = $('#usersTable');

    if (!result.data.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty-state">No users found.</td></tr>`;
      buildPagination('users', result.pagination, 'goUsersPage');
      return;
    }

    tbody.innerHTML = result.data.map((user) => `
      <tr>
        <td><strong>${user.name}</strong><br><small>${user.phone || '-'}</small></td>
        <td>${user.email}</td>
        <td>${user.department || '-'}</td>
        <td><span class="role-badge ${user.role}">${user.role}</span></td>
        <td><span class="status-badge ${user.isActive ? 'active' : 'inactive'}">${user.isActive ? 'active' : 'inactive'}</span></td>
        <td>
          <div class="table-actions">
            <button class="small-btn edit" onclick="openUserModal('${user._id}')">Edit</button>
            <button class="small-btn delete" onclick="deleteUser('${user._id}')">Delete</button>
          </div>
        </td>
      </tr>
    `).join('');
    buildPagination('users', result.pagination, 'goUsersPage');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

window.openUserModal = (userId = null) => {
  const user = userId ? state.userCache.find((item) => item._id === userId) : null;
  openModal(user ? 'Edit User' : 'Add User', `
    <form id="userForm">
      <div class="grid-2">
        <div><label>Name</label><input name="name" value="${user?.name || ''}" required></div>
        <div><label>Email</label><input type="email" name="email" value="${user?.email || ''}" required></div>
      </div>
      <div class="grid-2">
        <div><label>Role</label><select name="role"><option value="user" ${user?.role === 'user' ? 'selected' : ''}>User</option><option value="admin" ${user?.role === 'admin' ? 'selected' : ''}>Admin</option></select></div>
        <div><label>Status</label><select name="isActive"><option value="true" ${user?.isActive !== false ? 'selected' : ''}>Active</option><option value="false" ${user?.isActive === false ? 'selected' : ''}>Inactive</option></select></div>
      </div>
      <div class="grid-2">
        <div><label>Phone</label><input name="phone" value="${user?.phone || ''}"></div>
        <div><label>Department</label><input name="department" value="${user?.department || ''}"></div>
      </div>
      <label>${user ? 'New Password (optional)' : 'Password'}</label>
      <input type="password" name="password" minlength="6" ${user ? '' : 'required'}>
      <div class="form-actions">
        <button type="button" class="ghost-btn" onclick="closeModal()">Cancel</button>
        <button type="submit" class="primary-btn">Save User</button>
      </div>
    </form>
  `);

  $('#userForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = Object.fromEntries(new FormData(event.target));
    form.isActive = form.isActive === 'true';
    if (!form.password) delete form.password;
    try {
      await apiFetch(user ? `/users/${user._id}` : '/users', {
        method: user ? 'PUT' : 'POST',
        body: JSON.stringify(form)
      });
      showToast(user ? 'User updated successfully' : 'User added successfully');
      closeModal();
      loadUsers();
      loadDashboard();
    } catch (error) {
      showToast(error.message, 'error');
    }
  });
};

window.deleteUser = async (userId) => {
  if (state.user.id === userId) return showToast('You cannot delete your own account while logged in.', 'error');
  if (!confirm('Delete this user?')) return;
  try {
    await apiFetch(`/users/${userId}`, { method: 'DELETE' });
    showToast('User deleted successfully');
    loadUsers();
    loadDashboard();
  } catch (error) {
    showToast(error.message, 'error');
  }
};

async function loadIssues() {
  try {
    const params = new URLSearchParams({
      page: state.pages.issues,
      limit: state.limits.issues,
      search: $('#issueSearch').value.trim(),
      status: $('#issueStatusFilter').value
    });
    const result = await apiFetch(`/issues?${params}`);
    const tbody = $('#issuesTable');

    if (!result.data.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No issue records found.</td></tr>`;
      buildPagination('issues', result.pagination, 'goIssuesPage');
      return;
    }

    tbody.innerHTML = result.data.map((item) => `
      <tr>
        <td><strong>${item.book?.title || '-'}</strong><br><small>${item.book?.author || '-'}</small></td>
        <td>${item.user?.name || '-'}<br><small>${item.user?.email || '-'}</small></td>
        <td>${formatDate(item.issueDate)}</td>
        <td>${formatDate(item.dueDate)}</td>
        <td><span class="status-badge ${item.status}">${item.status}</span></td>
        <td>Rs. ${item.fineAmount || 0}</td>
        <td class="admin-only">
          ${item.status !== 'returned'
            ? `<button class="small-btn return" onclick="returnBook('${item._id}')">Return</button>`
            : `<button class="small-btn delete" onclick="deleteIssue('${item._id}')">Delete</button>`}
        </td>
      </tr>
    `).join('');
    buildPagination('issues', result.pagination, 'goIssuesPage');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

window.openIssueModal = async () => {
  try {
    const [books, users] = await Promise.all([
      apiFetch('/books?limit=50&status=available'),
      apiFetch('/users?limit=50&role=user')
    ]);

    openModal('Issue Book', `
      <form id="issueForm">
        <label>Select Book</label>
        <select name="bookId" required>
          <option value="">Choose available book</option>
          ${books.data.map((book) => `<option value="${book._id}">${book.title} — ${book.author} (${book.availableCopies} available)</option>`).join('')}
        </select>
        <label>Select User</label>
        <select name="userId" required>
          <option value="">Choose user</option>
          ${users.data.map((user) => `<option value="${user._id}">${user.name} — ${user.email}</option>`).join('')}
        </select>
        <label>Due Date</label>
        <input type="date" name="dueDate" min="${todayPlusDays(1)}" value="${todayPlusDays(14)}" required>
        <label>Notes</label>
        <textarea name="notes" rows="3" placeholder="Optional note"></textarea>
        <div class="form-actions">
          <button type="button" class="ghost-btn" onclick="closeModal()">Cancel</button>
          <button type="submit" class="primary-btn">Issue Book</button>
        </div>
      </form>
    `);

    $('#issueForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = Object.fromEntries(new FormData(event.target));
      try {
        await apiFetch('/issues', { method: 'POST', body: JSON.stringify(form) });
        showToast('Book issued successfully');
        closeModal();
        loadIssues();
        loadBooks();
        loadDashboard();
      } catch (error) {
        showToast(error.message, 'error');
      }
    });
  } catch (error) {
    showToast(error.message, 'error');
  }
};

window.returnBook = async (issueId) => {
  if (!confirm('Return this book now? Fine will be calculated automatically.')) return;
  try {
    const result = await apiFetch(`/issues/${issueId}/return`, { method: 'PATCH' });
    showToast(result.message);
    loadIssues();
    loadBooks();
    loadDashboard();
  } catch (error) {
    showToast(error.message, 'error');
  }
};

window.deleteIssue = async (issueId) => {
  if (!confirm('Delete this returned issue record?')) return;
  try {
    await apiFetch(`/issues/${issueId}`, { method: 'DELETE' });
    showToast('Issue record deleted');
    loadIssues();
  } catch (error) {
    showToast(error.message, 'error');
  }
};

function debounce(fn, delay = 350) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function initEvents() {
  $$('.auth-tabs button').forEach((button) => {
    button.addEventListener('click', () => {
      $$('.auth-tabs button').forEach((btn) => btn.classList.remove('active'));
      button.classList.add('active');
      const isLogin = button.dataset.authTab === 'login';
      $('#loginForm').classList.toggle('hidden', !isLogin);
      $('#signupForm').classList.toggle('hidden', isLogin);
    });
  });

  $('#loginForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = Object.fromEntries(new FormData(event.target));
    try {
      const data = await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(form) });
      showToast('Login successful');
      setAuth(data.user, data.token);
    } catch (error) {
      showToast(error.message, 'error');
    }
  });

  $('#signupForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = Object.fromEntries(new FormData(event.target));
    try {
      const data = await apiFetch('/auth/signup', { method: 'POST', body: JSON.stringify(form) });
      showToast('Account created successfully');
      setAuth(data.user, data.token);
    } catch (error) {
      showToast(error.message, 'error');
    }
  });

  $$('.nav-link').forEach((button) => button.addEventListener('click', () => switchSection(button.dataset.section)));
  $('#logoutBtn').addEventListener('click', clearAuth);
  $('#menuBtn').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
  $('#themeToggle').addEventListener('click', () => {
    document.body.classList.toggle('dark');
    localStorage.setItem('lms_theme', document.body.classList.contains('dark') ? 'dark' : 'light');
  });

  $('#addBookBtn').addEventListener('click', () => openBookModal());
  $('#addUserBtn').addEventListener('click', () => openUserModal());
  $('#issueBookBtn').addEventListener('click', () => openIssueModal());
  $('#modalClose').addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (event) => { if (event.target === modalOverlay) closeModal(); });

  const reloadBooks = debounce(() => { state.pages.books = 1; loadBooks(); });
  $('#bookSearch').addEventListener('input', reloadBooks);
  $('#bookStatusFilter').addEventListener('change', reloadBooks);
  $('#bookCategoryFilter').addEventListener('change', reloadBooks);

  const reloadUsers = debounce(() => { state.pages.users = 1; loadUsers(); });
  $('#userSearch').addEventListener('input', reloadUsers);
  $('#userRoleFilter').addEventListener('change', reloadUsers);

  const reloadIssues = debounce(() => { state.pages.issues = 1; loadIssues(); });
  $('#issueSearch').addEventListener('input', reloadIssues);
  $('#issueStatusFilter').addEventListener('change', reloadIssues);
}

function init() {
  if (localStorage.getItem('lms_theme') === 'dark') document.body.classList.add('dark');
  initEvents();
  setTimeout(renderApp, 400);
}
const user = JSON.parse(localStorage.getItem("user"));

if (user && user.role !== "admin") {

  document.querySelectorAll(".admin-only").forEach(el => {
    el.style.display = "none";
  });

}
init();
