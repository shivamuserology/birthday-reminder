const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'birthdays.db');

let db;

function initDB() {
  db = new Database(DB_PATH);

  // Enable WAL mode for better performance
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS birthdays (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      dob TEXT NOT NULL,
      relationship TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('✅ Database initialized');
  return db;
}

function getDB() {
  if (!db) initDB();
  return db;
}

// Add a new birthday
function addBirthday(name, dob, relationship = '') {
  const stmt = getDB().prepare(
    'INSERT INTO birthdays (name, dob, relationship) VALUES (?, ?, ?)'
  );
  return stmt.run(name, dob, relationship);
}

// Get all birthdays
function getAllBirthdays() {
  return getDB().prepare('SELECT * FROM birthdays ORDER BY name ASC').all();
}

// Get a single birthday by ID
function getBirthdayById(id) {
  return getDB().prepare('SELECT * FROM birthdays WHERE id = ?').get(id);
}

// Update a birthday
function updateBirthday(id, name, dob, relationship) {
  const stmt = getDB().prepare(
    'UPDATE birthdays SET name = ?, dob = ?, relationship = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  );
  return stmt.run(name, dob, relationship, id);
}

// Delete a birthday
function deleteBirthday(id) {
  return getDB().prepare('DELETE FROM birthdays WHERE id = ?').run(id);
}

// Search birthdays by name
function searchBirthdays(query) {
  return getDB()
    .prepare('SELECT * FROM birthdays WHERE name LIKE ? ORDER BY name ASC')
    .all(`%${query}%`);
}

// Find birthdays matching a specific month-day (MM-DD format)
function getBirthdaysByMonthDay(monthDay) {
  // dob is stored as YYYY-MM-DD, we match on the MM-DD part
  return getDB()
    .prepare(
      "SELECT * FROM birthdays WHERE substr(dob, 6, 5) = ?"
    )
    .all(monthDay);
}

// Get upcoming birthdays within the next N days
function getUpcomingBirthdays(days = 30) {
  const all = getAllBirthdays();
  const now = new Date();

  // Convert to IST
  const istNow = new Date(
    now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
  );

  return all
    .map((b) => {
      const [_, month, day] = b.dob.split('-').map(Number);
      const nextBirthday = new Date(istNow.getFullYear(), month - 1, day);

      // If the birthday has already passed this year, use next year
      if (nextBirthday < istNow) {
        nextBirthday.setFullYear(istNow.getFullYear() + 1);
      }

      const diffMs = nextBirthday - istNow;
      const daysUntil = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      return { ...b, daysUntil, nextBirthday: nextBirthday.toISOString() };
    })
    .filter((b) => b.daysUntil <= days && b.daysUntil >= 0)
    .sort((a, b) => a.daysUntil - b.daysUntil);
}

module.exports = {
  initDB,
  getDB,
  addBirthday,
  getAllBirthdays,
  getBirthdayById,
  updateBirthday,
  deleteBirthday,
  searchBirthdays,
  getBirthdaysByMonthDay,
  getUpcomingBirthdays,
};
