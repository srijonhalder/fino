const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// ──────────────────────────────────────────
// Local disk storage (replaces Cloudinary)
// ──────────────────────────────────────────
const ensureDir = (dir) => {
  const fullPath = path.join(__dirname, '..', '..', 'uploads', dir);
  if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
  return fullPath;
};

const makeStorage = (subDir) =>
  multer.diskStorage({
    destination: (req, file, cb) => cb(null, ensureDir(subDir)),
    filename: (req, file, cb) => {
      const unique = crypto.randomBytes(8).toString('hex');
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${unique}${ext}`);
    },
  });

// After multer runs, rewrite file.path to a public URL path
const rewritePaths = (req, _res, next) => {
  const baseUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
  const fix = (f) => {
    if (f && f.path) {
      const relative = f.path.split('uploads')[1].replace(/\\/g, '/');
      f.path = `${baseUrl}/uploads${relative}`;
    }
  };
  if (req.file) fix(req.file);
  if (req.files) {
    if (Array.isArray(req.files)) req.files.forEach(fix);
    else Object.values(req.files).flat().forEach(fix);
  }
  next();
};

const selfieStorage = makeStorage('selfies');
const businessPhotoStorage = makeStorage('business-photos');
const documentStorage = makeStorage('documents');

// ──────────────────────────────────────────
// File filter
// ──────────────────────────────────────────
const imageFileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, JPG, and PNG images are allowed'), false);
  }
};

const documentFileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, JPG, PNG, and PDF files are allowed'), false);
  }
};

// ──────────────────────────────────────────
// Upload configurations
// ──────────────────────────────────────────
const uploadSelfie = [
  multer({
    storage: selfieStorage,
    fileFilter: imageFileFilter,
    limits: { fileSize: 5 * 1024 * 1024 },
  }).single('selfie'),
  rewritePaths,
];

const uploadDocuments = [
  multer({
    storage: documentStorage,
    fileFilter: documentFileFilter,
    limits: { fileSize: 5 * 1024 * 1024 },
  }).array('documents', 10),
  rewritePaths,
];

const uploadBusinessPhotos = [
  multer({
    storage: businessPhotoStorage,
    fileFilter: imageFileFilter,
    limits: { fileSize: 5 * 1024 * 1024 },
  }).array('photos', 5),
  rewritePaths,
];

// Combined upload for business application (photos + documents)
const uploadBusinessFiles = (req, res, next) => {
  const upload = multer({
    storage: documentStorage,
    fileFilter: documentFileFilter,
    limits: { fileSize: 5 * 1024 * 1024 },
  }).fields([
    { name: 'photos', maxCount: 5 },
    { name: 'documents', maxCount: 10 },
  ]);

  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        success: false,
        message: `Upload error: ${err.message}`,
      });
    }
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
    // Rewrite paths to public URLs
    rewritePaths(req, res, next);
  });
};

module.exports = {
  uploadSelfie,
  uploadDocuments,
  uploadBusinessPhotos,
  uploadBusinessFiles,
};
