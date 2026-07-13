const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({

destination(req, file, cb) {
cb(null, "uploads/videos");
},

filename(req, file, cb) {
cb(null, Date.now() + path.extname(file.originalname));
}

});

const upload = multer({
storage,
limits: { fileSize: 500 * 1024 * 1024 } // 500MB
});

module.exports = upload;