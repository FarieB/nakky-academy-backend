const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
  createCandidateProfile,
  getCandidateProfile,
  updateCandidateProfile,
  activateCandidateProfile,
  deactivateCandidateProfile,
  getCandidateById,
  uploadDocuments,

  createEmployerProfile,
  getEmployerProfile,
  updateEmployerProfile,
  activateEmployerProfile,
  deactivateEmployerProfile,

  searchCandidates,
  getCandidateContact,
  saveCandidate,
  getSavedCandidates,
  removeSavedCandidate,

  getAllCandidates,
  getAllEmployers,
  verifyCandidate,
  rejectCandidate,
  getRecruitmentStats,
  getUserPresence
} = require("../controllers/profileController");

// ======================================
// CANDIDATE PROFILE MANAGEMENT
// ======================================
router.post("/candidate", protect, createCandidateProfile);
router.get("/candidate", protect, getCandidateProfile);
router.put("/candidate", protect, updateCandidateProfile);
router.put("/candidate/activate", protect, activateCandidateProfile);
router.put("/candidate/deactivate", protect, deactivateCandidateProfile);
router.get("/candidate/:id", protect, getCandidateById);
router.post(
    "/candidate/upload-documents",
    protect,
    uploadDocuments
);

// ======================================
// EMPLOYER PROFILE MANAGEMENT
// ======================================
router.post("/employer", protect, createEmployerProfile);
router.get("/employer", protect, getEmployerProfile);
router.put("/employer", protect, updateEmployerProfile);
router.put("/employer/activate", protect, activateEmployerProfile);
router.put("/employer/deactivate", protect, deactivateEmployerProfile);

// ======================================
// SEARCH & INTERACTIONS
// ======================================
router.get("/search", protect, searchCandidates);
router.get("/candidate/:candidateId/contact", protect, getCandidateContact);

// Saved Profiles Engine
router.get("/saved-candidates", protect, getSavedCandidates);
router.post("/candidate/:candidateId/save", protect, saveCandidate);
router.delete("/candidate/:candidateId/save", protect, removeSavedCandidate);



// ======================================
// ADMIN CHANNELS
// ======================================
router.get("/admin/candidates", protect, getAllCandidates);
router.get("/admin/employers", protect, getAllEmployers);
router.put("/admin/candidate/:candidateId/verify", protect, verifyCandidate);
router.put("/admin/candidate/:candidateId/reject", protect, rejectCandidate);
router.get("/admin/stats", protect, getRecruitmentStats);

router.get(
    "/presence/:userId",
    protect,
    getUserPresence
);

module.exports = router;
