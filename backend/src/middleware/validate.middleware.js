const { body, validationResult } = require('express-validator');
const { errorResponse } = require('../utils/apiResponse');
const { StrKey } = require('@stellar/stellar-sdk');

const isValidWalletAddress = (walletAddress) => {
  if (typeof walletAddress !== 'string') return false;
  const normalized = walletAddress.trim();
  if (!normalized) return false;
  const isEvm = /^0x[a-fA-F0-9]{40}$/.test(normalized);
  const isStellar = StrKey.isValidEd25519PublicKey(normalized);
  return isEvm || isStellar;
};

/**
 * Process validation results — call after validation rules
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
    }));
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errorMessages,
    });
  }
  next();
};

/**
 * Validation rules for user registration
 */
const registerValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2 })
    .withMessage('Name must be at least 2 characters'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/\d/)
    .withMessage('Password must contain at least 1 number'),
  body('phone')
    .optional({ values: 'falsy' })
    .trim()
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Please provide a valid 10-digit Indian phone number'),
  body('role')
    .optional({ values: 'falsy' })
    .isIn(['investor', 'business_owner'])
    .withMessage('Role must be investor or business_owner'),
  body('walletAddress')
    .optional({ values: 'falsy' })
    .custom((value) => isValidWalletAddress(value))
    .withMessage('Invalid wallet address. Use Stellar (G...) format.'),
  validate,
];

/**
 * Validation rules for login
 */
const loginValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  validate,
];

module.exports = {
  validate,
  registerValidation,
  loginValidation,
};
