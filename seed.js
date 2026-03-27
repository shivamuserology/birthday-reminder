// Seed script — populates the database with sample birthdays
require('dotenv').config();
const {
  initDB,
  addBirthday,
  getAllBirthdays,
} = require('./database');

initDB();

// Check if already seeded
const existing = getAllBirthdays();
if (existing.length > 0) {
  console.log(`Database already has ${existing.length} entries. Skipping seed.`);
  process.exit(0);
}

const birthdays = [
  // TOMORROW — March 28 — this will trigger tonight's 11:30 PM reminder
  { name: 'Rahul Sharma', dob: '1995-03-28', relationship: 'college friend' },

  // More sample data
  { name: 'Ananya Gupta', dob: '1997-04-15', relationship: 'school friend' },
  { name: 'Vikram Mehta', dob: '1993-05-22', relationship: 'work colleague' },
  { name: 'Priya Patel', dob: '1996-06-10', relationship: 'cousin' },
  { name: 'Arjun Reddy', dob: '1994-08-03', relationship: 'childhood friend' },
  { name: 'Neha Kapoor', dob: '1998-09-17', relationship: 'sister' },
  { name: 'Rohan Joshi', dob: '1995-11-30', relationship: 'gym buddy' },
  { name: 'Kavita Iyer', dob: '1992-12-25', relationship: 'manager' },
  { name: 'Amit Singh', dob: '1990-01-14', relationship: 'neighbor' },
  { name: 'Sneha Das', dob: '1999-02-08', relationship: 'team lead' },
];

console.log('🌱 Seeding database...\n');

for (const b of birthdays) {
  addBirthday(b.name, b.dob, b.relationship);
  console.log(`  ✅ Added ${b.name} (${b.dob}) — ${b.relationship}`);
}

console.log(`\n🎂 Done! Added ${birthdays.length} birthdays.`);
console.log('📌 Rahul Sharma\'s birthday is TOMORROW (March 28) — you\'ll get a reminder at 11:30 PM tonight!\n');

process.exit(0);
