const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ==========================================
// CREATE UPLOAD DIRECTORY
// ==========================================

const uploadDirectory = "uploads/proofs";

if (!fs.existsSync(uploadDirectory)) {
    fs.mkdirSync(uploadDirectory, {
        recursive: true
    });
}


// ==========================================
// STORAGE CONFIGURATION
// ==========================================

const storage = multer.diskStorage({

    destination: (req, file, cb) => {

        cb(null, uploadDirectory);

    },

    filename: (req, file, cb) => {

        const uniqueName =
            `${Date.now()}-${Math.round(Math.random() * 1E9)}`;

        const extension =
            path.extname(file.originalname);

        cb(
            null,
            `proof-${uniqueName}${extension}`
        );

    }

});


// ==========================================
// FILE FILTER
// ==========================================

const fileFilter = (req, file, cb) => {

    const allowedTypes = [

        "image/jpeg",

        "image/png",

        "image/jpg",

        "application/pdf"

    ];

    if (allowedTypes.includes(file.mimetype)) {

        cb(null, true);

    } else {

        cb(
            new Error(
                "Only JPG, JPEG, PNG and PDF files are allowed."
            ),
            false
        );

    }

};


// ==========================================
// MULTER CONFIGURATION
// ==========================================

const upload = multer({

    storage,

    fileFilter,

    limits: {

        fileSize: 5 * 1024 * 1024

    }

});


module.exports = upload;