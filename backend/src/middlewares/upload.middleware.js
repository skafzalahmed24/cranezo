const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadsDir = path.join(__dirname, '../public/uploads');

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${cleanBase}-${uniqueSuffix}${ext}`);
  }
});

// Multer upload instance with 50MB limit per file
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024
  }
});

// Express wrapper middleware supporting any field names
const uploadAny = (req, res, next) => {
  upload.any()(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        status: 0,
        message: `Upload error: ${err.message}`,
        timestamp: new Date().toISOString()
      });
    } else if (err) {
      return res.status(400).json({
        status: 0,
        message: err.message || 'File upload failed.',
        timestamp: new Date().toISOString()
      });
    }
    next();
  });
};

module.exports = {
  upload,
  uploadAny
};
