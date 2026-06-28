const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      unique: true,
      sparse: true, // Allow multiple null emails (wallet-only users)
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // Never return password in queries by default
    },
    isWalletUser: {
      type: Boolean,
      default: false,
    },
    phone: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: {
        values: ['investor', 'business_owner', 'admin'],
        message: 'Role must be investor, business_owner, or admin',
      },
      default: 'investor',
    },

    // KYC fields
    kycStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    },
    aadhaarHash: {
      type: String, // Store hash of Aadhaar number, never plain text
    },
    aadhaarLastFour: {
      type: String, // Last 4 digits for display
    },
    panNumber: {
      type: String,
      uppercase: true,
      trim: true,
    },
    selfieUrl: {
      type: String, // Cloudinary URL
    },

    // Stellar wallet address
    walletAddress: {
      type: String, // G... (56 characters)
      trim: true,
    },

    // Bank details (for future use)
    bankDetails: {
      accountNumber: { type: String },
      ifscCode: { type: String },
      bankName: { type: String },
    },

    // Account status
    isActive: {
      type: Boolean,
      default: true,
    },

    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
  }
);

// ──────────────────────────────────────────
// Pre-save hook: Hash password before saving
// ──────────────────────────────────────────
userSchema.pre('save', async function () {
  // Only hash if password is modified (avoid re-hashing on profile updates)
  if (!this.isModified('password')) return;

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// ──────────────────────────────────────────
// Instance method: Compare password
// ──────────────────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ──────────────────────────────────────────
// Instance method: Return user without sensitive fields
// ──────────────────────────────────────────
userSchema.methods.toSafeObject = function () {
  const user = this.toObject();
  delete user.password;
  delete user.aadhaarHash;
  delete user.__v;
  return user;
};

// Indexes (email index already created by `unique: true` in schema)
userSchema.index({ walletAddress: 1 });
userSchema.index({ role: 1 });

const User = mongoose.model('User', userSchema);

module.exports = User;
