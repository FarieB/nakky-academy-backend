const express = require("express");
const router = express.Router();

const {
  uploadDocuments,
  verifyEmployee,
  createOrUpdateProfile
} = require("../controllers/employeeControllers"); // ✅ ensure filename matches

const protect = require("../middleware/authMiddleware");

// ==============================
// Employee uploads documents
// ==============================
router.post("/upload-documents", protect, uploadDocuments);

// ==============================
// Employee creates/updates professional profile
// ==============================
router.post("/profile", protect, createOrUpdateProfile);

// ==============================
// Admin verifies employee
// ==============================
router.put("/verify/:id", protect, verifyEmployee);

module.exports = router;