require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const path = require('path');

const {
  initDB,
  addBirthday,
  getAllBirthdays,
  getBirthdayById,
  updateBirthday,
  deleteBirthday,
  searchBirthdays,
  getBirthdaysByMonthDay,
  getUpcomingBirthdays,
} = require('./database');
const { initEmail, sendBirthdayReminder, sendTestEmail } = require('./email');
const { initGemini, generateBirthdayMessage } = require('./gemini');
const { syncDatabaseToGithub } = require('./sync');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize services
initDB();
initEmail();
initGemini();

// ─────────────────────────────────────────────
// API Routes
// ─────────────────────────────────────────────

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get all birthdays
app.get('/api/birthdays', (req, res) => {
  try {
    const { q } = req.query;
    const birthdays = q ? searchBirthdays(q) : getAllBirthdays();

    // Enrich with days-until info
    const enriched = birthdays.map((b) => {
      const now = new Date(
        new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
      );
      const [_, month, day] = b.dob.split('-').map(Number);
      const nextBday = new Date(now.getFullYear(), month - 1, day);
      if (nextBday < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
        nextBday.setFullYear(now.getFullYear() + 1);
      }
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const daysUntil = Math.ceil((nextBday - today) / (1000 * 60 * 60 * 24));
      return { ...b, daysUntil };
    });

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get upcoming birthdays
app.get('/api/birthdays/upcoming', (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const upcoming = getUpcomingBirthdays(days);
    res.json(upcoming);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add a birthday
app.post('/api/birthdays', (req, res) => {
  try {
    const { name, dob, relationship } = req.body;
    if (!name || !dob) {
      return res.status(400).json({ error: 'Name and date of birth are required' });
    }
    const result = addBirthday(name.trim(), dob, (relationship || '').trim());
    const newBirthday = getBirthdayById(result.lastInsertRowid);
    res.status(201).json(newBirthday);
    syncDatabaseToGithub();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a birthday
app.put('/api/birthdays/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, dob, relationship } = req.body;
    if (!name || !dob) {
      return res.status(400).json({ error: 'Name and date of birth are required' });
    }
    updateBirthday(parseInt(id), name.trim(), dob, (relationship || '').trim());
    const updated = getBirthdayById(parseInt(id));
    res.json(updated);
    syncDatabaseToGithub();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a birthday
app.delete('/api/birthdays/:id', (req, res) => {
  try {
    const { id } = req.params;
    deleteBirthday(parseInt(id));
    res.json({ success: true });
    syncDatabaseToGithub();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────
// Birthday Check & Email Logic
// ─────────────────────────────────────────────

async function checkAndSendReminders() {
  console.log('\n🔍 Running birthday check...');

  const senderName = process.env.SENDER_NAME || 'Friend';
  const reminderEmail = process.env.REMINDER_EMAIL || process.env.GMAIL_USER;

  // Get tomorrow's date in IST
  const now = new Date();
  const istNow = new Date(
    now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
  );
  const istTomorrow = new Date(istNow);
  istTomorrow.setDate(istTomorrow.getDate() + 1);

  const month = String(istTomorrow.getMonth() + 1).padStart(2, '0');
  const day = String(istTomorrow.getDate()).padStart(2, '0');
  const tomorrowMonthDay = `${month}-${day}`;

  console.log(
    `📅 Checking for birthdays on ${tomorrowMonthDay} (IST: ${istNow.toLocaleDateString()})`
  );

  const matches = getBirthdaysByMonthDay(tomorrowMonthDay);

  if (matches.length === 0) {
    console.log('😴 No birthdays tomorrow');
    return { checked: true, reminders: 0 };
  }

  console.log(`🎂 Found ${matches.length} birthday(s) tomorrow!`);

  const results = [];

  for (const person of matches) {
    console.log(`  → Generating message for ${person.name}...`);

    const message = await generateBirthdayMessage(
      person.name,
      person.relationship,
      senderName
    );

    const emailResult = await sendBirthdayReminder(
      reminderEmail,
      person.name,
      person.dob,
      person.relationship,
      message,
      senderName
    );

    results.push({
      name: person.name,
      email: emailResult.success ? 'sent' : 'failed',
      error: emailResult.error || null,
    });
  }

  console.log(`✅ Birthday check complete. Sent ${results.filter((r) => r.email === 'sent').length}/${results.length} reminders.\n`);

  return { checked: true, reminders: results.length, results };
}

// API endpoint to manually trigger check (also used by external cron services)
app.post('/api/check-birthdays', async (req, res) => {
  try {
    const result = await checkAndSendReminders();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send test email
app.post('/api/test-email', async (req, res) => {
  try {
    const recipientEmail = process.env.REMINDER_EMAIL || process.env.GMAIL_USER;
    const senderName = process.env.SENDER_NAME || 'Friend';
    const result = await sendTestEmail(recipientEmail, senderName);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────
// Cron Job — 11:30 PM IST daily
// ─────────────────────────────────────────────

// node-cron with timezone support
cron.schedule('30 23 * * *', () => {
  console.log('⏰ Cron triggered at 11:30 PM IST');
  checkAndSendReminders().catch(console.error);
}, {
  timezone: 'Asia/Kolkata',
});

console.log('⏰ Cron scheduled: 11:30 PM IST daily');

// ─────────────────────────────────────────────
// Start Server
// ─────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n🎂 Birthday Reminder is running on http://localhost:${PORT}`);
  console.log(`📧 Reminders will be sent to: ${process.env.REMINDER_EMAIL || '(not configured)'}`);
  console.log('');
});
