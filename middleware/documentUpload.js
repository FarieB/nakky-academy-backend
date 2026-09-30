const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, "private-documents");
  },

  filename(req, file, cb) {
    const extension = path.extname(file.originalname);

    cb(
      null,
      `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`
    );
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB per file
  },
});

module.exports = upload;