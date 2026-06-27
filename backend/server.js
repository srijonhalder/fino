const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const connectDatabase = require("./src/config/database");
const { createApp } = require("./src/app");
const {
  checkExpiredCampaigns,
} = require("./src/services/deadlineChecker.service");
const {
  checkAndFinalize,
} = require("./src/services/proposalFinalizer.service");
const {
  checkPendingBusinesses,
} = require("./src/services/proposalCreator.service");
const { sendVoteReminders } = require("./src/services/notification.service");

const app = createApp();
const PORT = process.env.PORT || 5000;

connectDatabase();

app.listen(PORT, () => {
  console.log(
    `🚀 Fino server running on port ${PORT} in ${process.env.NODE_ENV} mode`,
  );

  checkExpiredCampaigns();
  setInterval(checkExpiredCampaigns, 6 * 60 * 60 * 1000);

  checkAndFinalize();
  checkPendingBusinesses();
  sendVoteReminders();
  setInterval(checkAndFinalize, 5 * 60 * 1000);
  setInterval(checkPendingBusinesses, 5 * 60 * 1000);
  setInterval(sendVoteReminders, 30 * 60 * 1000);
  console.log(
    "⚖️  Governance cron jobs scheduled (finalize: 5min, proposals: 5min, reminders: 30min)",
  );
});

module.exports = app;
