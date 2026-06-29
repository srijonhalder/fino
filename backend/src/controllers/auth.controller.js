const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { StrKey } = require('@stellar/stellar-sdk');
const User = require('../models/User');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { adminKeypair } = require('../config/stellar');

const ADMIN_WALLET = (
  process.env.STELLAR_ADMIN_PUBLIC_ADDRESS ||
  process.env.STELLAR_ADMIN_PUBLIC_KEY ||
  adminKeypair?.publicKey?.() ||
  ''
).trim();

const STELLAR_PUBLIC_KEY_REGEX = /G[A-Z2-7]{55}/;
const EVM_ADDRESS_REGEX = /0x[a-fA-F0-9]{40}/;

const canonicalizeWalletAddress = (walletAddress) => {
  if (typeof walletAddress !== 'string') return '';
  const trimmed = walletAddress.trim();
  if (!trimmed) return '';
  if (/^[gG][a-zA-Z2-7]{55}$/.test(trimmed)) {
    return trimmed.toUpperCase();
  }
  return trimmed;
};

const extractWalletAddress = (value) => {
  if (!value) return '';

  if (typeof value === 'string') {
    const canonical = canonicalizeWalletAddress(value);
    if (isValidWalletAddress(canonical)) return canonical;

    const stellarMatch = canonical.toUpperCase().match(STELLAR_PUBLIC_KEY_REGEX);
    if (stellarMatch?.[0]) return canonicalizeWalletAddress(stellarMatch[0]);

    const evmMatch = canonical.match(EVM_ADDRESS_REGEX);
    if (evmMatch?.[0]) return evmMatch[0];

    if (canonical.startsWith('{') || canonical.startsWith('[')) {
      try {
        return extractWalletAddress(JSON.parse(canonical));
      } catch {
        return '';
      }
    }

    return '';
  }

  if (typeof value === 'object') {
    const directKeys = ['publicKey', 'address', 'walletAddress', 'account', 'key', 'id'];
    for (const key of directKeys) {
      const extracted = extractWalletAddress(value[key]);
      if (extracted) return extracted;
    }

    for (const nestedValue of Object.values(value)) {
      const extracted = extractWalletAddress(nestedValue);
      if (extracted) return extracted;
    }
  }

  return '';
};

const isValidWalletAddress = (walletAddress) => {
  if (typeof walletAddress !== 'string') return false;
  const normalized = canonicalizeWalletAddress(walletAddress);
  if (!normalized) return false;
  const isEvm = /^0x[a-fA-F0-9]{40}$/.test(normalized);
  const isStellar = StrKey.isValidEd25519PublicKey(normalized);
  return isEvm || isStellar;
};

/**
 * Generate JWT token
 */
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res) => {
  try {
    const { name, email, password, phone, role, walletAddress } = req.body;

    // Check if email already exists (on a DIFFERENT user)
    const existingEmailUser = await User.findOne({ email });
    if (existingEmailUser) {
      // If this is the same wallet user upgrading, allow it
      if (!walletAddress || existingEmailUser.walletAddress?.toLowerCase() !== walletAddress.toLowerCase()) {
        return errorResponse(res, 'Email already registered. Please log in.', 400);
      }
    }

    // If a walletAddress is provided, check if there's an existing wallet-only user to upgrade
    if (walletAddress) {
      const walletUser = await User.findOne({ walletAddress: { $regex: new RegExp(`^${walletAddress}$`, 'i') } });
      if (walletUser && walletUser.isWalletUser) {
        // Upgrade wallet-only user → business_owner with full credentials
        walletUser.name = name;
        walletUser.email = email;
        walletUser.password = password; // pre-save hook will hash it
        walletUser.phone = phone || walletUser.phone;
        walletUser.role = role || 'business_owner';
        walletUser.isWalletUser = false;
        walletUser.kycStatus = 'pending'; // Business owners need KYC
        await walletUser.save();

        const token = generateToken(walletUser);
        return successResponse(
          res,
          { user: walletUser.toSafeObject(), token },
          'Account upgraded to business owner! Please complete KYC.',
          200
        );
      }
      // A non-wallet-only account already owns this wallet — refuse to create a second
      // account on the same wallet. walletAddress has no unique DB constraint, and letting
      // this through creates duplicate User docs sharing one wallet, which double/triple
      // counts that wallet's on-chain token balance wherever dividend shares are computed.
      if (walletUser && !walletUser.isWalletUser) {
        return errorResponse(res, 'This wallet is already linked to another account. Please log in instead.', 400);
      }
    }

    // Create brand-new user
    const user = await User.create({
      name,
      email,
      password,
      phone,
      role: role || 'investor',
      walletAddress: walletAddress || undefined,
    });

    // Generate JWT
    const token = generateToken(user);
    const userData = user.toSafeObject();

    return successResponse(
      res,
      { user: userData, token },
      'Registration successful! Welcome to Fino.',
      201
    );
  } catch (error) {
    console.error('Register error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user with password field included
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return errorResponse(res, 'Invalid email or password.', 401);
    }

    if (!user.isActive) {
      return errorResponse(res, 'Your account has been deactivated. Contact support.', 401);
    }

    // Compare passwords
    const isPasswordMatch = await user.comparePassword(password);
    if (!isPasswordMatch) {
      return errorResponse(res, 'Invalid email or password.', 401);
    }

    // Update last login time
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    // Generate JWT
    const token = generateToken(user);

    // Return user data and token
    const userData = user.toSafeObject();

    return successResponse(
      res,
      { user: userData, token },
      'Login successful!'
    );
  } catch (error) {
    console.error('Login error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * @desc    Get current logged-in user profile
 * @route   GET /api/auth/me
 * @access  Private (requires JWT)
 */
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return errorResponse(res, 'User not found.', 404);
    }

    return successResponse(res, { user: user.toSafeObject() }, 'User profile retrieved.');
  } catch (error) {
    console.error('GetMe error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * @desc    Logout user (client-side token deletion)
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logout = async (req, res) => {
  return successResponse(res, null, 'Logged out successfully. Please delete your token.');
};

/**
 * @desc    Connect wallet — auto-login/register by wallet address
 * @route   POST /api/auth/wallet-connect
 * @access  Public
 */
const walletConnect = async (req, res) => {
  try {
    const walletAddress = extractWalletAddress(req.body?.walletAddress);

    if (!isValidWalletAddress(walletAddress)) {
      return errorResponse(res, 'Valid wallet address is required.', 400);
    }

    // Check if this is the admin wallet
    if (walletAddress.toLowerCase() === ADMIN_WALLET.toLowerCase()) {
      let admin = await User.findOne({ role: 'admin' });
      if (!admin) {
        admin = await User.create({
          name: process.env.ADMIN_NAME || 'Fino Admin',
          email: process.env.ADMIN_EMAIL || 'admin@fino.local',
          walletAddress,
          role: 'admin',
          kycStatus: 'verified',
          isWalletUser: false,
          password: crypto.randomBytes(32).toString('hex'),
        });
      }
      // Keep admin wallet aligned with configured admin address
      if (!admin.walletAddress || admin.walletAddress !== walletAddress) {
        admin.walletAddress = walletAddress;
        await admin.save({ validateBeforeSave: false });
      }
      admin.lastLogin = new Date();
      await admin.save({ validateBeforeSave: false });
      const token = generateToken(admin);
      return successResponse(res, { user: admin.toSafeObject(), token, isAdmin: true }, 'Admin wallet connected!');
    }

    // Find existing user by wallet address
    let user = await User.findOne({ walletAddress: { $regex: new RegExp(`^${walletAddress}$`, 'i') } });

    if (!user) {
      // New wallet - return flag for frontend to show signup modal
      return successResponse(res, { isNewUser: true, walletAddress }, 'New wallet detected. Please complete signup.');
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });
    const token = generateToken(user);
    return successResponse(res, { user: user.toSafeObject(), token, isAdmin: false }, 'Wallet connected!');
  } catch (error) {
    console.error('Wallet connect error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * @desc    Complete wallet signup for new users
 * @route   POST /api/auth/wallet-signup
 * @access  Public
 */
const walletSignup = async (req, res) => {
  try {
    const walletAddress = extractWalletAddress(req.body?.walletAddress);
    const { name, email } = req.body;

    if (!isValidWalletAddress(walletAddress)) {
      return errorResponse(res, 'Valid wallet address is required.', 400);
    }

    if (!name || name.trim().length < 2) {
      return errorResponse(res, 'Name is required (at least 2 characters).', 400);
    }

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return errorResponse(res, 'Valid email address is required.', 400);
    }

    // Check if wallet already registered
    const existingWalletUser = await User.findOne({ walletAddress: { $regex: new RegExp(`^${walletAddress}$`, 'i') } });
    if (existingWalletUser) {
      return errorResponse(res, 'This wallet is already registered. Please use wallet connect.', 400);
    }

    // Check if email already exists
    const existingEmailUser = await User.findOne({ email: email.toLowerCase() });
    if (existingEmailUser) {
      return errorResponse(res, 'This email is already registered.', 400);
    }

    // Create new wallet user
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase(),
      walletAddress,
      role: 'investor',
      kycStatus: 'verified', // Wallet users are auto-verified
      isWalletUser: true,
      password: crypto.randomBytes(32).toString('hex'), // Random unusable password
    });

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });
    
    const token = generateToken(user);
    return successResponse(res, { user: user.toSafeObject(), token }, 'Account created successfully!');
  } catch (error) {
    console.error('Wallet signup error:', error);
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  register,
  login,
  getMe,
  logout,
  walletConnect,
  walletSignup,
};
