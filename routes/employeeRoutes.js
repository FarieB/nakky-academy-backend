const express = require("express");
const router = express.Router();

const { uploadDocuments, verifyEmployee } = require("../controllers/employeeController");
const protect = require("../middleware/authMiddleware");

router.post("/upload-documents", protect, uploadDocuments);
router.post("/verify/:id", protect, verifyEmployee);

module.exports = router;
