// Standalone script for GitHub Actions cron check
require('dotenv').config();

const { initDB, getBirthdaysByMonthDay } = require('./database');
const { initEmail, sendBirthdayReminder } = require('./email');
const { initGemini, generateBirthdayMessage } = require('./gemini');

async function main() {
  initDB();
  initEmail();
  initGemini();

  console.log('\n🔍 Running standalone birthday check...');
  const senderName = process.env.SENDER_NAME || 'Friend';
  const reminderEmail = process.env.REMINDER_EMAIL;

  const now = new Date();
  const istNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const istTomorrow = new Date(istNow);
  istTomorrow.setDate(istTomorrow.getDate() + 1);

  const month = String(istTomorrow.getMonth() + 1).padStart(2, '0');
  const day = String(istTomorrow.getDate()).padStart(2, '0');
  const tomorrowMonthDay = `${month}-${day}`;

  console.log(`📅 Checking for birthdays on ${tomorrowMonthDay} (IST: ${istNow.toLocaleDateString()})`);

  const matches = getBirthdaysByMonthDay(tomorrowMonthDay);

  if (matches.length === 0) {
    console.log('😴 No birthdays tomorrow');
    process.exit(0);
  }

  console.log(`🎂 Found ${matches.length} birthday(s) tomorrow!`);

  for (const person of matches) {
    console.log(`  → Generating message for ${person.name}...`);
    const message = await generateBirthdayMessage(person.name, person.relationship, senderName);
    await sendBirthdayReminder(reminderEmail, person.name, person.dob, person.relationship, message, senderName);
  }

  console.log('✅ Check complete.');
  process.exit(0);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
