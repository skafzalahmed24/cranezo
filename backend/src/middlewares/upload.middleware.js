const multer = require('multer');
const path = require('path');
const fs = require('fs');

const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // the apps and the admin panel shrink pictures to this size before uploading
const MAX_PDF_BYTES = 5 * 1024 * 1024;

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

// Multer upload instance: nothing bigger than a PDF is accepted at all (no videos, no big files)
const upload = multer({
  storage,
  limits: {
    fileSize: MAX_PDF_BYTES + 1024
  }
});

/** What the file really is, from its first bytes (the declared type can be anything) */
const sniff = (filePath) => {
  const fd = fs.openSync(filePath, 'r');
  const buf = Buffer.alloc(12);
  fs.readSync(fd, buf, 0, 12, 0);
  fs.closeSync(fd);
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image';
  if (buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image';
  if (buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') return 'image';
  if (buf.slice(0, 4).toString() === '%PDF') return 'pdf';
  return null;
};

/** Pictures up to 2 MB, PDF documents up to 5 MB, nothing else. Rejected files are deleted. */
const checkFiles = (files) => {
  for (const file of files) {
    const kind = sniff(file.path);
    if (!kind) return 'Only pictures (JPG, PNG, WebP) and PDF documents can be uploaded. Videos are not allowed.';
    if (kind === 'image' && file.size > MAX_IMAGE_BYTES) return 'The picture is too big. Pictures can be up to 2 MB.';
    if (kind === 'pdf' && file.size > MAX_PDF_BYTES) return 'The PDF is too big. Documents can be up to 5 MB.';
  }
  return null;
};

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
    const problem = checkFiles(req.files || []);
    if (problem) {
      (req.files || []).forEach((f) => fs.unlink(f.path, () => {}));
      return res.status(400).json({ status: 0, success: false, message: problem, timestamp: new Date().toISOString() });
    }
    next();
  });
};

module.exports = {
  upload,
  uploadAny
};
