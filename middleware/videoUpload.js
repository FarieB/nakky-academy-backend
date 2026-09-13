const multer = require("multer");
const path = require("path");
const fs = require("fs");

/**
 * ============================================================
 * VIDEO UPLOAD CONFIGURATION
 * ============================================================
 *
 * Uploaded videos are stored locally in:
 *
 * uploads/videos/
 *
 * The controller will associate the uploaded file with the
 * correct Course → Module → Lesson.
 */

// Make sure the upload directory exists
const uploadDirectory = path.join(
  __dirname,
  "..",
  "uploads",
  "videos"
);

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, {
    recursive: true,
  });
}

/**
 * ============================================================
 * STORAGE
 * ============================================================
 */

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirectory);
  },

  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();

    const baseName = path
      .basename(file.originalname, extension)
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .replace(/-+/g, "-")
      .substring(0, 80);

    const uniqueName =
      `${Date.now()}-${Math.round(Math.random() * 1e9)}-${baseName}${extension}`;

    cb(null, uniqueName);
  },
});

/**
 * ============================================================
 * ALLOWED VIDEO TYPES
 * ============================================================
 *
 * We support the most common formats you are likely to use.
 */

const allowedVideoMimeTypes = [
  "video/mp4",
  "video/mpeg",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-matroska",
  "video/webm",
];

/**
 * ============================================================
 * FILE FILTER
 * ============================================================
 */

const fileFilter = (req, file, cb) => {
  const extension = path
    .extname(file.originalname)
    .toLowerCase();

  const allowedExtensions = [
    ".mp4",
    ".mpeg",
    ".mpg",
    ".mov",
    ".avi",
    ".mkv",
    ".webm",
  ];

  const validMimeType =
    allowedVideoMimeTypes.includes(file.mimetype);

  const validExtension =
    allowedExtensions.includes(extension);

  if (validMimeType || validExtension) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid video format. Allowed formats: MP4, MPEG, MOV, AVI, MKV and WEBM."
      ),
      false
    );
  }
};

/**
 * ============================================================
 * MULTER INSTANCE
 * ============================================================
 *
 * Maximum video size:
 *
 * 500 MB
 *
 * This can be increased later if necessary.
 */

const upload = multer({
  storage,

  fileFilter,

  limits: {
    fileSize: 500 * 1024 * 1024,
  },
});

module.exports = upload;