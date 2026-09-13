const multer = require("multer");
const path = require("path");
const fs = require("fs");

// -------------------------------------------------------
// UPLOAD DIRECTORY
// -------------------------------------------------------

const uploadDir = path.join(__dirname, "../uploads/course-materials");

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, {
        recursive: true
    });
}

// -------------------------------------------------------
// STORAGE
// -------------------------------------------------------

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },

    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();

        const baseName = path
            .basename(file.originalname, ext)
            .replace(/[^a-zA-Z0-9_-]/g, "_");

        const uniqueName =
            `${Date.now()}-${Math.round(Math.random() * 1E9)}-${baseName}${ext}`;

        cb(null, uniqueName);
    }
});

// -------------------------------------------------------
// FILE FILTER
// -------------------------------------------------------

const fileFilter = (req, file, cb) => {

    const allowedMimeTypes = [
        "application/pdf",

        "audio/mpeg",
        "audio/mp3",
        "audio/wav",
        "audio/x-wav",
        "audio/mp4",
        "audio/x-m4a",
        "audio/aac",
        "audio/ogg",
        "audio/opus",
        "audio/webm",
        "audio/flac"
    ];

    const allowedExtensions = [
        ".pdf",
        ".mp3",
        ".wav",
        ".m4a",
        ".aac",
        ".ogg",
        ".opus",
        ".webm",
        ".flac"
    ];

    const ext = path.extname(file.originalname).toLowerCase();

    if (
        allowedMimeTypes.includes(file.mimetype) ||
        allowedExtensions.includes(ext)
    ) {
        cb(null, true);
    } else {
        cb(
            new Error(
                "Invalid file type. Only PDF and audio files are allowed."
            )
        );
    }
};

// -------------------------------------------------------
// MULTER
// -------------------------------------------------------

const upload = multer({
    storage,
    fileFilter,

    limits: {
        fileSize: 100 * 1024 * 1024 // 100 MB
    }
});

module.exports = upload;