const { exec } = require('child_process');

function syncDatabaseToGithub() {
  console.log('🔄 Syncing birthdays.db to GitHub...');
  exec('git add birthdays.db && git commit -m "Auto-sync database" && git push', (error, stdout, stderr) => {
    if (error) {
      console.warn('⚠️ Git sync warning (it is fine if running locally without repo):', error.message);
      return;
    }
    console.log('✅ Database synced to GitHub successfully!');
  });
}

module.exports = { syncDatabaseToGithub };
