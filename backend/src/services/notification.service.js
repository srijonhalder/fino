const Notification = require('../models/Notification');
const User = require('../models/User');

/**
 * Notification Service
 * Creates in-app notifications for governance events.
 * 
 * Note: With on-chain voting, we no longer track votes in MongoDB.
 * Notifications are simplified to work with wallet-based users.
 */

/**
 * Create a notification for a single user
 */
const createNotification = async (userId, type, title, message, link = '') => {
  try {
    return await Notification.create({ userId, type, title, message, link });
  } catch (err) {
    console.error('createNotification error:', err.message);
    return null;
  }
};

/**
 * Notify all registered users about a new proposal
 * In the new system, any wallet holder can vote (1-wallet-1-vote)
 */
const notifyUsersAboutNewProposal = async (proposalId, businessName, proposalType) => {
  try {
    // Get all users with connected wallets
    const users = await User.find({ walletAddress: { $exists: true, $ne: null } });

    const notifications = users.map(user => ({
      userId: user._id,
      type: 'new_proposal',
      title: `New Vote: ${businessName || 'Business Proposal'}`,
      message: `A new ${proposalType?.replace('_', ' ')} proposal is open for voting. Cast your vote!`,
      link: `/governance/proposals/${proposalId}`,
    }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
      console.log(`📢 Notified ${notifications.length} users about proposal #${proposalId}`);
    }
  } catch (err) {
    console.error('notifyUsersAboutNewProposal error:', err.message);
  }
};

/**
 * Send vote reminders for proposals ending soon
 * Note: This now requires querying the on-chain contract for active proposals
 */
const sendVoteReminders = async () => {
  try {
    // TODO: Query on-chain for active proposals ending soon
    // For now, this is a placeholder - implement with governance contract query
    console.log('Vote reminders: Would check on-chain for ending proposals');
  } catch (err) {
    console.error('sendVoteReminders error:', err.message);
  }
};

/**
 * Notify users about proposal result
 * @param {number} proposalId - The proposal ID
 * @param {boolean} passed - Whether the proposal passed
 * @param {string} businessName - Name of the business
 */
const notifyProposalResult = async (proposalId, passed, businessName) => {
  try {
    // Get all users with wallets (they could have voted)
    const users = await User.find({ walletAddress: { $exists: true, $ne: null } });

    const type = passed ? 'proposal_passed' : 'proposal_rejected';
    const statusText = passed ? 'APPROVED ✅' : 'REJECTED ❌';

    const notifications = users.map(user => ({
      userId: user._id,
      type,
      title: `Vote Result: ${statusText}`,
      message: `"${businessName || 'Proposal #' + proposalId}" was ${statusText.toLowerCase()} by community vote.`,
      link: `/governance/proposals/${proposalId}`,
    }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }
  } catch (err) {
    console.error('notifyProposalResult error:', err.message);
  }
};

/**
 * Notify business owner about approval/rejection
 */
const notifyBusinessOwner = async (businessId, passed, extraMessage = '') => {
  try {
    const Business = require('../models/Business');
    const business = await Business.findById(businessId);
    if (!business?.ownerId) return;

    const type = passed ? 'business_approved' : 'business_rejected';
    const title = passed ? '🎉 Business Approved!' : '❌ Business Not Approved';
    const message = passed
      ? `Congratulations! "${business.name}" was approved by community vote. Token deployment will begin shortly.`
      : `"${business.name}" was not approved by community governance vote. ${extraMessage}`;

    await Notification.create({
      userId: business.ownerId,
      type,
      title,
      message,
      link: `/businesses/${businessId}`,
    });
  } catch (err) {
    console.error('notifyBusinessOwner error:', err.message);
  }
};

/**
 * Notify about dividend received
 */
const notifyDividendReceived = async (userId, amount, businessName) => {
  try {
    await Notification.create({
      userId,
      type: 'dividend_received',
      title: `💰 Dividend Received`,
      message: `You received ${amount} XLM from "${businessName}".`,
      link: '/dividends',
    });
  } catch (err) {
    console.error('notifyDividendReceived error:', err.message);
  }
};

/**
 * Notify about investment confirmation
 */
const notifyInvestmentConfirmed = async (userId, businessName, tokenAmount) => {
  try {
    await Notification.create({
      userId,
      type: 'investment_confirmed',
      title: `✅ Investment Confirmed`,
      message: `Your investment in "${businessName}" is complete. You received ${tokenAmount} tokens.`,
      link: '/portfolio',
    });
  } catch (err) {
    console.error('notifyInvestmentConfirmed error:', err.message);
  }
};

/**
 * Get user's notifications (paginated)
 */
const getUserNotifications = async (userId, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find({ userId }).sort('-createdAt').skip(skip).limit(limit).lean(),
    Notification.countDocuments({ userId }),
    Notification.countDocuments({ userId, read: false }),
  ]);
  return { notifications, total, unreadCount, page, limit };
};

/**
 * Mark notification as read
 */
const markAsRead = async (notificationId, userId) => {
  return Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { read: true },
    { new: true }
  );
};

/**
 * Mark all notifications as read
 */
const markAllAsRead = async (userId) => {
  return Notification.updateMany({ userId, read: false }, { read: true });
};

/**
 * Get unread count
 */
const getUnreadCount = async (userId) => {
  return Notification.countDocuments({ userId, read: false });
};

module.exports = {
  createNotification,
  notifyUsersAboutNewProposal,
  sendVoteReminders,
  notifyProposalResult,
  notifyBusinessOwner,
  notifyDividendReceived,
  notifyInvestmentConfirmed,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
};
