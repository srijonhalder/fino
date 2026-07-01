const { Resend } = require('resend');

let resend = null;
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
}
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

/**
 * Base send email function (fire and forget — never throws)
 */
const sendEmail = async (to, subject, htmlContent) => {
  if (!resend) {
    console.warn(`⚠️  Email skipped (no RESEND_API_KEY): ${subject} → ${to}`);
    return;
  }
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html: htmlContent,
    });
    console.log(`📧 Email sent to ${to}: ${subject}`);
  } catch (error) {
    console.error(`❌ Email failed to ${to}:`, error.message);
    // Never throw — email failures should not crash the app
  }
};

// ──────────────────────────────────────────
// Email template functions
// ──────────────────────────────────────────

const sendWelcomeEmail = (userEmail, userName) => {
  sendEmail(
    userEmail,
    'Welcome to Fino! 🎉',
    `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <h1 style="color:#2563EB">Welcome to Fino, ${userName}!</h1>
      <p>Thank you for joining Fino — India's platform for fractional business investments.</p>
      <p>Next steps:</p>
      <ol>
        <li>Complete your KYC verification</li>
        <li>Connect your MetaMask wallet</li>
        <li>Start exploring local businesses to invest in</li>
      </ol>
      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" style="display:inline-block;background:#2563EB;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;margin-top:16px">Go to Dashboard</a>
      <p style="margin-top:24px;color:#6B7280;font-size:14px">— Team Fino</p>
    </div>`
  );
};

const sendKYCApprovedEmail = (userEmail, userName) => {
  sendEmail(
    userEmail,
    'KYC Verified ✅',
    `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <h1 style="color:#059669">KYC Verified!</h1>
      <p>Hi ${userName},</p>
      <p>Your KYC verification has been approved. You can now invest in businesses on Fino!</p>
      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/businesses" style="display:inline-block;background:#059669;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;margin-top:16px">Browse Businesses</a>
    </div>`
  );
};

const sendInvestmentConfirmationEmail = (userEmail, userName, businessName, amountINR, tokens) => {
  sendEmail(
    userEmail,
    `Investment Confirmed — ${businessName}`,
    `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <h1 style="color:#2563EB">Investment Confirmed! 🎉</h1>
      <p>Hi ${userName},</p>
      <p>Your investment in <strong>${businessName}</strong> has been confirmed.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:8px;border-bottom:1px solid #eee"><strong>Amount</strong></td><td style="padding:8px;border-bottom:1px solid #eee">₹${amountINR}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee"><strong>Tokens Received</strong></td><td style="padding:8px;border-bottom:1px solid #eee">${tokens}</td></tr>
      </table>
      <p>You will receive dividends proportional to your token holdings when the business distributes revenue.</p>
    </div>`
  );
};

const sendDividendReceivedEmail = (userEmail, userName, businessName, amountXLM, month) => {
  sendEmail(
    userEmail,
    `Dividend Received — ${businessName}`,
    `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <h1 style="color:#059669">Dividend Received! 💰</h1>
      <p>Hi ${userName},</p>
      <p>You have received a dividend payment from <strong>${businessName}</strong> for ${month}.</p>
      <p style="font-size:24px;font-weight:bold;color:#059669">${amountXLM} XLM</p>
      <p>Check your MetaMask wallet for the incoming transaction.</p>
    </div>`
  );
};

const sendFundingGoalReachedEmail = (ownerEmail, ownerName, businessName, totalRaised) => {
  sendEmail(
    ownerEmail,
    `Funding Goal Reached! — ${businessName}`,
    `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <h1 style="color:#059669">Congratulations, ${ownerName}! 🎉</h1>
      <p>Your business <strong>${businessName}</strong> has reached its funding goal!</p>
      <p style="font-size:24px;font-weight:bold;color:#059669">₹${totalRaised} raised</p>
      <p>The escrowed funds will be released to your wallet. You can now begin operations and start sharing revenue with your investors.</p>
    </div>`
  );
};

const sendNewApplicationEmail = (adminEmail, businessName, ownerName) => {
  sendEmail(
    adminEmail,
    `New Business Application — ${businessName}`,
    `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <h1 style="color:#F59E0B">New Application Received</h1>
      <p>A new business application has been submitted:</p>
      <ul>
        <li><strong>Business:</strong> ${businessName}</li>
        <li><strong>Owner:</strong> ${ownerName}</li>
      </ul>
      <p>Please review and approve/reject from the admin panel.</p>
      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin" style="display:inline-block;background:#F59E0B;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;margin-top:16px">Go to Admin Panel</a>
    </div>`
  );
};

const sendRefundEmail = (investorEmail, investorName, businessName, refundAmountXLM) => {
  sendEmail(
    investorEmail,
    `Investment Refunded — ${businessName}`,
    `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <h1 style="color:#EF4444">Investment Refunded</h1>
      <p>Hi ${investorName},</p>
      <p>Unfortunately, <strong>${businessName}</strong> did not reach its funding goal before the deadline.</p>
      <p>Your investment of <strong>${refundAmountXLM} XLM</strong> has been refunded to your wallet.</p>
      <p>We encourage you to explore other businesses on Fino!</p>
      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/businesses" style="display:inline-block;background:#2563EB;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;margin-top:16px">Browse Businesses</a>
    </div>`
  );
};

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendKYCApprovedEmail,
  sendInvestmentConfirmationEmail,
  sendDividendReceivedEmail,
  sendFundingGoalReachedEmail,
  sendNewApplicationEmail,
  sendRefundEmail,
};
