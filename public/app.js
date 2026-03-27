// ═══════════════════════════════════════════
// Birthday Reminder — Frontend Logic
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

// Stats
const statTotal = document.querySelector('#stat-total .stat-number');
const statUpcoming = document.querySelector('#stat-upcoming .stat-number');
const statThisMonth = document.querySelector('#stat-this-month .stat-number');

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

  // Close modal on overlay click
  editModal.addEventListener('click', (e) => {
    if (e.target === editModal) closeModal();
  });

  // Close modal on Escape
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
  btn.innerHTML = '<span class="loading"><span class="loading-dot"></span><span class="loading-dot"></span><span class="loading-dot"></span></span>';

  try {
    const res = await fetch(`${API}/api/birthdays`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, dob, relationship }),
    });

    if (!res.ok) throw new Error('Failed to add birthday');

    birthdayForm.reset();
    await loadBirthdays();
    showToast(`🎂 Added ${name}'s birthday!`, 'success');
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add Birthday`;
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
    showToast(`✅ Updated ${name}'s birthday`, 'success');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function handleDelete(id, name) {
  if (!confirm(`Are you sure you want to delete ${name}'s birthday?`)) return;

  try {
    await fetch(`${API}/api/birthdays/${id}`, { method: 'DELETE' });
    await loadBirthdays();
    showToast(`Deleted ${name}'s birthday`, 'success');
  } catch (error) {
    showToast('Failed to delete', 'error');
  }
}

async function handleSearch() {
  const query = searchInput.value.trim();

  try {
    const res = await fetch(`${API}/api/birthdays${query ? `?q=${encodeURIComponent(query)}` : ''}`);
    const data = await res.json();
    renderBirthdays(data);
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
    if (data.success) {
      showToast('✅ Test email sent! Check your inbox', 'success');
    } else {
      showToast(`❌ ${data.error}`, 'error');
    }
  } catch (error) {
    showToast('Failed to send test email', 'error');
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
    if (data.reminders > 0) {
      showToast(`🎂 Found ${data.reminders} birthday(s) tomorrow! Emails sent.`, 'success');
    } else {
      showToast('😴 No birthdays tomorrow', 'success');
    }
  } catch (error) {
    showToast('Failed to check', 'error');
  } finally {
    btn.disabled = false;
  }
}

// ── Render Functions ─────────────────────

function renderBirthdays(birthdays) {
  if (birthdays.length === 0) {
    const isSearching = searchInput.value.trim().length > 0;
    birthdayList.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">${isSearching ? '🔍' : '🎂'}</span>
        <p>${isSearching ? 'No birthdays match your search' : 'No birthdays added yet'}</p>
        ${!isSearching ? '<p class="empty-sub">Add your first birthday using the form</p>' : ''}
      </div>
    `;
    return;
  }

  // Sort by days until next birthday
  const sorted = [...birthdays].sort((a, b) => a.daysUntil - b.daysUntil);

  birthdayList.innerHTML = sorted
    .map((b) => {
      const avatar = getAvatarColor(b.name);
      const initials = getInitials(b.name);
      const formattedDob = formatDate(b.dob);
      const badge = getBadge(b.daysUntil);
      const age = getAge(b.dob);

      return `
        <div class="birthday-item" data-id="${b.id}">
          <div class="birthday-avatar" style="background: ${avatar};">${initials}</div>
          <div class="birthday-info">
            <div class="birthday-name">${escapeHtml(b.name)}</div>
            <div class="birthday-meta">
              <span>${formattedDob}</span>
              ${b.relationship ? `<span class="separator"></span><span>${escapeHtml(b.relationship)}</span>` : ''}
              ${age !== null ? `<span class="separator"></span><span>Age ${age}</span>` : ''}
            </div>
          </div>
          ${badge}
          <div class="birthday-actions">
            <button class="btn-icon" onclick="openEditModal(${b.id})" title="Edit">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn-icon" onclick="handleDelete(${b.id}, '${escapeHtml(b.name).replace(/'/g, "\\'")}')" title="Delete" style="color: var(--accent-red);">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </div>
      `;
    })
    .join('');
}

function renderUpcoming(birthdays) {
  const upcoming = birthdays
    .filter((b) => b.daysUntil <= 30 && b.daysUntil >= 0)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  if (upcoming.length === 0) {
    upcomingList.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">🎈</span>
        <p>No upcoming birthdays in the next 30 days</p>
      </div>
    `;
    return;
  }

  upcomingList.innerHTML = upcoming
    .map((b) => {
      const badgeStyle = getUpcomingStyle(b.daysUntil);
      const label =
        b.daysUntil === 0
          ? 'TODAY!'
          : b.daysUntil === 1
          ? 'Tomorrow'
          : `${b.daysUntil} days`;

      return `
        <div class="upcoming-item">
          <div class="upcoming-days" style="background: ${badgeStyle.bg}; color: ${badgeStyle.color};">
            <span class="upcoming-days-number">${b.daysUntil}</span>
            <span class="upcoming-days-label">${b.daysUntil === 1 ? 'day' : 'days'}</span>
          </div>
          <div class="birthday-info">
            <div class="birthday-name">${escapeHtml(b.name)}</div>
            <div class="birthday-meta">
              <span>${formatDate(b.dob)}</span>
              ${b.relationship ? `<span class="separator"></span><span>${escapeHtml(b.relationship)}</span>` : ''}
            </div>
          </div>
        </div>
      `;
    })
    .join('');
}

function updateStats(birthdays) {
  statTotal.textContent = birthdays.length;

  const upcoming30 = birthdays.filter((b) => b.daysUntil <= 30 && b.daysUntil >= 0);
  statUpcoming.textContent = upcoming30.length;

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const thisMonth = birthdays.filter((b) => {
    const month = parseInt(b.dob.split('-')[1]);
    return month === currentMonth;
  });
  statThisMonth.textContent = thisMonth.length;
}

// ── Modal ────────────────────────────────

function openEditModal(id) {
  const birthday = allBirthdays.find((b) => b.id === id);
  if (!birthday) return;

  document.getElementById('edit-id').value = birthday.id;
  document.getElementById('edit-name').value = birthday.name;
  document.getElementById('edit-dob').value = birthday.dob;
  document.getElementById('edit-relationship').value = birthday.relationship || '';

  editModal.classList.add('active');
}

function closeModal() {
  editModal.classList.remove('active');
}

// ── Helpers ──────────────────────────────

function getAvatarColor(name) {
  const colors = [
    'linear-gradient(135deg, #f59e0b, #d97706)',
    'linear-gradient(135deg, #ec4899, #be185d)',
    'linear-gradient(135deg, #3b82f6, #1d4ed8)',
    'linear-gradient(135deg, #10b981, #059669)',
    'linear-gradient(135deg, #8b5cf6, #6d28d9)',
    'linear-gradient(135deg, #ef4444, #b91c1c)',
    'linear-gradient(135deg, #06b6d4, #0891b2)',
    'linear-gradient(135deg, #f97316, #c2410c)',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name) {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function formatDate(dob) {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const [year, month, day] = dob.split('-').map(Number);
  return `${months[month - 1]} ${day}, ${year}`;
}

function getAge(dob) {
  const [year] = dob.split('-').map(Number);
  if (year < 1900) return null;
  const now = new Date();
  return now.getFullYear() - year;
}

function getBadge(daysUntil) {
  if (daysUntil === 0) {
    return '<span class="birthday-badge badge-today">🎂 Today!</span>';
  }
  if (daysUntil === 1) {
    return '<span class="birthday-badge badge-tomorrow">Tomorrow</span>';
  }
  if (daysUntil <= 7) {
    return `<span class="birthday-badge badge-week">${daysUntil} days</span>`;
  }
  if (daysUntil <= 30) {
    return `<span class="birthday-badge badge-month">${daysUntil} days</span>`;
  }
  return '';
}

function getUpcomingStyle(daysUntil) {
  if (daysUntil === 0) {
    return { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' };
  }
  if (daysUntil === 1) {
    return { bg: 'rgba(236, 72, 153, 0.15)', color: '#ec4899' };
  }
  if (daysUntil <= 7) {
    return { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' };
  }
  return { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981' };
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

function showToast(message, type = 'success') {
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}
