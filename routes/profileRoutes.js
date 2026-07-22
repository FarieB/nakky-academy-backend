const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
  updateWorkerProfile,
  searchWorkers
} = require("../controllers/profileController");

// ==============================
// Update worker profile
// ==============================
router.put("/worker", protect, updateWorkerProfile);

// ==============================
// Search workers
// ==============================
router.get("/search", protect, searchWorkers);

// ==============================
// Returns single candidate
// ==============================
router.get(
  "/candidate/:id",
  protect,
  getCandidateById
);

// Candidate
router.post("/candidate", protect, createCandidateProfile);
router.get("/candidate", protect, getCandidateProfile);
router.put("/candidate", protect, updateCandidateProfile);
router.put("/candidate/activate", protect, activateCandidateProfile);
router.put("/candidate/deactivate", protect, deactivateCandidateProfile);

// Employer
router.post("/employer", protect, createEmployerProfile);
router.get("/employer", protect, getEmployerProfile);
router.put("/employer", protect, updateEmployerProfile);
router.put("/employer/activate", protect, activateEmployerProfile);
router.put("/employer/deactivate", protect, deactivateEmployerProfile);

// Search
router.get("/search", protect, searchCandidates);
router.get("/candidate/:candidateId/contact", protect, getCandidateContact);
router.post("/candidate/:candidateId/save", protect, saveCandidate);
router.delete("/candidate/:candidateId/save", protect, removeSavedCandidate);

// Admin
router.get("/admin/candidates", protect, getAllCandidates);
router.get("/admin/employers", protect, getAllEmployers);
router.put("/admin/candidate/:candidateId/verify", protect, verifyCandidate);
router.put("/admin/candidate/:candidateId/reject", protect, rejectCandidate);
router.get("/admin/stats", protect, getRecruitmentStats);

module.exports = router;