// Email module using Resend API (free tier: 100 emails/day, 3000/month)
// No Gmail App Password, no domain setup needed

const RESEND_API_URL = 'https://api.resend.com/emails';

let apiKey = null;

function initEmail() {
  apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.warn('⚠️  RESEND_API_KEY not set — emails will not be sent');
    return;
  }
  console.log('✅ Resend email configured');
}

async function sendEmail(to, subject, htmlContent, textContent) {
  if (!apiKey) {
    console.warn('⚠️  Email not configured — skipping send');
    return { success: false, error: 'Email not configured' };
  }

  const payload = {
    from: 'Birthday Reminder <onboarding@resend.dev>',
    to: [to],
    subject: subject,
    html: htmlContent,
    text: textContent,
  };

  try {
    const res = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (res.ok) {
      console.log(`📧 Email sent to ${to}: ${subject} (id: ${data.id})`);
      return { success: true, id: data.id };
    } else {
      console.error(`❌ Resend error (${res.status}):`, JSON.stringify(data));
      return { success: false, error: data.message || JSON.stringify(data) };
    }
  } catch (error) {
    console.error('❌ Email send failed:', error.message);
    return { success: false, error: error.message };
  }
}

async function sendBirthdayReminder(
  recipientEmail,
  birthdayPerson,
  dob,
  relationship,
  personalizedMessage,
  senderName
) {
  const dobDate = new Date(dob + 'T00:00:00');
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const birthdayStr = `${monthNames[dobDate.getMonth()]} ${dobDate.getDate()}`;

  const now = new Date();
  const birthYear = dobDate.getFullYear();
  const turningAge = now.getFullYear() - birthYear;

  const htmlEmail = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#0f0f23;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    
    <div style="background:linear-gradient(135deg,#f59e0b,#ec4899);border-radius:16px 16px 0 0;padding:32px;text-align:center;">
      <div style="font-size:48px;margin-bottom:8px;">🎂</div>
      <h1 style="color:#fff;margin:0;font-size:24px;font-weight:700;">Birthday Reminder!</h1>
      <p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:14px;">Don't forget to wish them!</p>
    </div>
    
    <div style="background:#1a1a3e;padding:32px;border-radius:0 0 16px 16px;">
      
      <div style="margin-bottom:24px;">
        <p style="color:#e2e8f0;font-size:16px;line-height:1.6;margin:0;">
          Hey ${senderName},
        </p>
        <p style="color:#e2e8f0;font-size:16px;line-height:1.6;margin:12px 0;">
          Just a heads up — <strong style="color:#f59e0b;">${birthdayPerson}</strong>'s birthday is <strong style="color:#ec4899;">tomorrow (${birthdayStr})</strong>! 🎉
        </p>
        ${relationship ? `<p style="color:#94a3b8;font-size:14px;margin:8px 0 0;">Relationship: ${relationship}</p>` : ''}
        ${birthYear > 1900 ? `<p style="color:#94a3b8;font-size:14px;margin:4px 0 0;">They'll be turning ${turningAge} 🎈</p>` : ''}
      </div>
      
      <div style="border-top:1px solid rgba(255,255,255,0.1);margin:24px 0;"></div>
      
      <div style="margin-bottom:8px;">
        <p style="color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px;">
          ✨ Personalized message — ready to forward
        </p>
        <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:24px;">
          <p style="color:#e2e8f0;font-size:15px;line-height:1.8;margin:0;white-space:pre-line;">${personalizedMessage}</p>
        </div>
      </div>
      
    </div>
    
    <div style="text-align:center;padding:16px;">
      <p style="color:#475569;font-size:12px;margin:0;">Sent by Birthday Reminder App 🎂</p>
    </div>
    
  </div>
</body>
</html>`;

  const plainText = `Hey ${senderName},

Just a heads up — ${birthdayPerson}'s birthday is tomorrow (${birthdayStr})! 🎉
${relationship ? `Relationship: ${relationship}` : ''}
${birthYear > 1900 ? `They'll be turning ${turningAge}` : ''}

---

Personalized message (ready to forward):

${personalizedMessage}

---
Sent by Birthday Reminder App 🎂`;

  return sendEmail(
    recipientEmail,
    `🎂 Reminder: ${birthdayPerson}'s Birthday is Tomorrow!`,
    htmlEmail,
    plainText
  );
}

async function sendTestEmail(recipientEmail, senderName) {
  const html = `
    <div style="font-family:'Segoe UI',sans-serif;max-width:500px;margin:0 auto;padding:32px;background:#1a1a3e;border-radius:16px;text-align:center;">
      <div style="font-size:48px;margin-bottom:16px;">✅</div>
      <h2 style="color:#e2e8f0;margin:0 0 12px;">Email Works!</h2>
      <p style="color:#94a3b8;font-size:14px;line-height:1.6;">
        Hey ${senderName}! Your Birthday Reminder app is all set up. 
        You'll receive birthday reminders at 11:30 PM IST, one day before each birthday.
      </p>
    </div>
  `;
  const text = `Hey ${senderName}! Your Birthday Reminder app is all set up. You'll receive birthday reminders at 11:30 PM IST, one day before each birthday.`;

  return sendEmail(
    recipientEmail,
    '✅ Birthday Reminder — Test Email',
    html,
    text
  );
}

module.exports = { initEmail, sendBirthdayReminder, sendTestEmail };
