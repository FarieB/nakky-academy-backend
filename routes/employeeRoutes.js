const express = require("express");
const router = express.Router();

const {
  uploadDocuments,
  verifyEmployee
} = require("../controllers/employeeController");

const protect = require("../middleware/authMiddleware");

// Employee uploads documents
router.post("/upload-documents", protect, uploadDocuments);

// Admin verifies employee
router.put("/verify/:id", protect, verifyEmployee);

module.exports = router;
