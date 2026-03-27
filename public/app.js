// ═══════════════════════════════════════════
// Birthday Reminder — Frontend Logic (Clean UI)
// ═══════════════════════════════════════════

const API = '';

// ── State ────────────────────────────────
let allBirthdays = [];
let editingId = null;

// ── DOM Elements ─────────────────────────
const birthdayForm = document.getElementById('birthday-form');
const editForm = document.getElementById('edit-form');
const editModal = document.getElementById('edit-modal');
const searchInput = document.getElementById('search-input');
const birthdayList = document.getElementById('birthday-list');
const upcomingList = document.getElementById('upcoming-list');
const toast = document.getElementById('toast');

const statTotal = document.getElementById('stat-total');
const statUpcoming = document.getElementById('stat-upcoming');
const statThisMonth = document.getElementById('stat-this-month');

// ── Initialize ───────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadBirthdays();
  setupEventListeners();
});

function setupEventListeners() {
  birthdayForm.addEventListener('submit', handleAddBirthday);
  editForm.addEventListener('submit', handleEditBirthday);
  searchInput.addEventListener('input', debounce(handleSearch, 300));

  document.getElementById('btn-test-email').addEventListener('click', handleTestEmail);
  document.getElementById('btn-check-now').addEventListener('click', handleCheckNow);
  document.getElementById('btn-close-modal').addEventListener('click', closeModal);
  document.getElementById('btn-cancel-edit').addEventListener('click', closeModal);

  editModal.addEventListener('click', (e) => {
    if (e.target === editModal) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}

// ── API Calls ────────────────────────────

async function loadBirthdays() {
  try {
    const res = await fetch(`${API}/api/birthdays`);
    allBirthdays = await res.json();
    renderBirthdays(allBirthdays);
    renderUpcoming(allBirthdays);
    updateStats(allBirthdays);
  } catch (error) {
    showToast('Failed to load birthdays', 'error');
  }
}

async function handleAddBirthday(e) {
  e.preventDefault();

  const name = document.getElementById('input-name').value.trim();
  const dob = document.getElementById('input-dob').value;
  const relationship = document.getElementById('input-relationship').value.trim();

  if (!name || !dob) return;

  const btn = document.getElementById('btn-submit');
  btn.disabled = true;
  btn.textContent = 'Saving...';

  try {
    const res = await fetch(`${API}/api/birthdays`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, dob, relationship }),
    });

    if (!res.ok) throw new Error('Failed to add contact');

    birthdayForm.reset();
    await loadBirthdays();
    showToast(`Added ${name}`);
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Add Contact';
  }
}

async function handleEditBirthday(e) {
  e.preventDefault();

  const id = document.getElementById('edit-id').value;
  const name = document.getElementById('edit-name').value.trim();
  const dob = document.getElementById('edit-dob').value;
  const relationship = document.getElementById('edit-relationship').value.trim();

  try {
    const res = await fetch(`${API}/api/birthdays/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, dob, relationship }),
    });

    if (!res.ok) throw new Error('Failed to update');

    closeModal();
    await loadBirthdays();
    showToast(`Updated ${name}`);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function handleDelete(id, name) {
  if (!confirm(`Are you sure you want to delete ${name}?`)) return;

  try {
    await fetch(`${API}/api/birthdays/${id}`, { method: 'DELETE' });
    await loadBirthdays();
    showToast(`Deleted ${name}`);
  } catch (error) {
    showToast('Failed to delete', 'error');
  }
}

async function handleSearch() {
  const query = searchInput.value.trim();
  try {
    const res = await fetch(`${API}/api/birthdays${query ? '?q=' + encodeURIComponent(query) : ''}`);
    renderBirthdays(await res.json());
  } catch (error) {
    console.error('Search error:', error);
  }
}

async function handleTestEmail() {
  const btn = document.getElementById('btn-test-email');
  btn.disabled = true;
  try {
    const res = await fetch(`${API}/api/test-email`, { method: 'POST' });
    const data = await res.json();
    if (data.success) showToast('Test email triggered', 'success');
    else showToast('Failed test email', 'error');
  } catch (error) {
    showToast('Failed to test email', 'error');
  } finally {
    btn.disabled = false;
  }
}

async function handleCheckNow() {
  const btn = document.getElementById('btn-check-now');
  btn.disabled = true;
  try {
    const res = await fetch(`${API}/api/check-birthdays`, { method: 'POST' });
    const data = await res.json();
    if (data.reminders > 0) showToast(`Found ${data.reminders} tomorrow. Emails sent.`, 'success');
    else showToast('No birthdays tomorrow.', 'success');
  } catch (error) {
    showToast('Failed to check', 'error');
  } finally {
    btn.disabled = false;
  }
}

// ── Render Functions ─────────────────────

function renderBirthdays(birthdays) {
  if (birthdays.length === 0) {
    birthdayList.innerHTML = `
      <div class="empty-state">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        <p>Directory empty</p>
        <div class="sub">No contacts added yet.</div>
      </div>
    `;
    return;
  }

  const sorted = [...birthdays].sort((a, b) => a.daysUntil - b.daysUntil);

  birthdayList.innerHTML = sorted.map(b => {
    const initials = getInitials(b.name);
    const badge = b.daysUntil === 0 ? '<span class="badge badge-tomorrow">Today</span>' : (b.daysUntil <= 7 ? `<span class="badge badge-upcoming">${b.daysUntil} days</span>` : '');
    
    return `
      <div class="list-item">
        <div class="avatar">${initials}</div>
        <div class="item-info">
          <div class="item-title">${escapeHtml(b.name)}</div>
          <div class="item-meta">
            <span>${formatDate(b.dob)}</span>
            ${b.relationship ? `<span class="dot"></span><span>${escapeHtml(b.relationship)}</span>` : ''}
          </div>
        </div>
        ${badge}
        <div style="display:flex;gap:4px;">
          <button class="btn-icon" onclick="openEditModal(${b.id})" title="Edit">
             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-icon" onclick="handleDelete(${b.id}, '${escapeHtml(b.name).replace(/'/g, "\\'")}')" title="Delete">
             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--destructive);"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function renderUpcoming(birthdays) {
  const upcoming = birthdays.filter(b => b.daysUntil <= 30 && b.daysUntil >= 0).sort((a, b) => a.daysUntil - b.daysUntil);

  if (upcoming.length === 0) {
    upcomingList.innerHTML = `
      <div class="empty-state">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        <p>No upcoming</p>
        <div class="sub">Next 30 days are clear.</div>
      </div>
    `;
    return;
  }

  upcomingList.innerHTML = upcoming.map(b => {
    const initials = getInitials(b.name);
    return `
      <div class="list-item">
        <div class="avatar">${initials}</div>
        <div class="item-info">
          <div class="item-title">${escapeHtml(b.name)}</div>
          <div class="item-meta">
            <span>${b.daysUntil === 0 ? 'Today' : (b.daysUntil === 1 ? 'Tomorrow' : b.daysUntil + ' days')}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function updateStats(birthdays) {
  statTotal.textContent = birthdays.length;
  statUpcoming.textContent = birthdays.filter(b => b.daysUntil <= 30 && b.daysUntil >= 0).length;
  const currentMonth = new Date().getMonth() + 1;
  statThisMonth.textContent = birthdays.filter(b => parseInt(b.dob.split('-')[1]) === currentMonth).length;
}

// ── Helpers ──────────────────────────────

function openEditModal(id) {
  const b = allBirthdays.find(b => b.id === id);
  if (!b) return;
  document.getElementById('edit-id').value = b.id;
  document.getElementById('edit-name').value = b.name;
  document.getElementById('edit-dob').value = b.dob;
  document.getElementById('edit-relationship').value = b.relationship || '';
  editModal.classList.add('active');
}

function closeModal() {
  editModal.classList.remove('active');
}

function getInitials(name) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function formatDate(dob) {
  const [year, month, day] = dob.split('-');
  return `${month}/${day}/${year}`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}

function showToast(message) {
  toast.textContent = message;
  toast.className = 'toast show';
  setTimeout(() => toast.classList.remove('show'), 3000);
}
