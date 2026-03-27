require('dotenv').config();
const { initDB, addBirthday } = require('./database');
const { syncDatabaseToGithub } = require('./sync');

initDB();

addBirthday('Vedant', '1995-01-15', 'college friend who always reminds me of his birthday');
syncDatabaseToGithub();

console.log('✅ Added Vedant (Jan 15) to the database and synced to GitHub.');
