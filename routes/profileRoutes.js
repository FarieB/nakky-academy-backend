const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const documentUpload = require("../middleware/documentUpload");

const {
    getEmployerContact,
} = require(
    "../controllers/profileController"
);

const {
  createCandidateProfile,
  getCandidateProfile,
  updateCandidateProfile,
  adminActivateCandidate,
  adminDeactivateCandidate,
  getCandidateById,
  uploadDocuments,
  uploadCandidateProfileDocuments,
  viewCandidateDocument,

  createEmployerProfile,
  getEmployerProfile,
  updateEmployerProfile,
  activateEmployerProfile,
  deactivateEmployerProfile,
  adminActivateEmployer,
  adminDeactivateEmployer,

  searchCandidates,
  getCandidateContact,
  getEmployerContact,
  saveCandidate,
  getSavedCandidates,
  removeSavedCandidate,

  getAllCandidates,
  getAdminCandidateById,
  getAllEmployers,
  getAdminEmployerById,
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
router.get("/candidate/:id", protect, getCandidateById);
router.get(
  "/candidate/:candidateId/document/:type",
  protect,
  viewCandidateDocument
);

router.get(
  "/candidate/:candidateId/document/:type/:index",
  protect,
  viewCandidateDocument
);
router.post(
    "/candidate/upload-documents",
    protect,
    uploadDocuments
);
router.post(
  "/candidate/profile-documents",
  protect,
  documentUpload.fields([
    {
      name: "idDocument",
      maxCount: 1,
    },
    {
      name: "policeClearance",
      maxCount: 1,
    },
    {
      name: "cv",
      maxCount: 1,
    },
    {
      name: "qualifications",
      maxCount: 20,
    },
    {
      name: "references",
      maxCount: 20,
    },
  ]),
  uploadCandidateProfileDocuments
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
router.get(
  "/employer/:employerId/contact",
  protect,
  getEmployerContact
);

// Saved Profiles Engine
router.get("/saved-candidates", protect, getSavedCandidates);
router.post("/candidate/:candidateId/save", protect, saveCandidate);
router.delete("/candidate/:candidateId/save", protect, removeSavedCandidate);



// ======================================
// ADMIN CHANNELS
// ======================================
router.get("/admin/candidates", protect, getAllCandidates);
router.get(
  "/admin/candidate/:candidateId",
  protect,
  getAdminCandidateById
);
router.get("/admin/employers", protect, getAllEmployers);
router.get(
  "/admin/employer/:employerId",
  protect,
  getAdminEmployerById
);
router.put("/admin/candidate/:candidateId/verify", protect, verifyCandidate);
router.put("/admin/candidate/:candidateId/reject", protect, rejectCandidate);
router.put(
  "/admin/candidate/:candidateId/activate",
  protect,
  adminActivateCandidate
);

router.put(
  "/admin/candidate/:candidateId/deactivate",
  protect,
  adminDeactivateCandidate
);

router.put(
  "/admin/employer/:employerId/activate",
  protect,
  adminActivateEmployer
);

router.put(
  "/admin/employer/:employerId/deactivate",
  protect,
  adminDeactivateEmployer
);
router.get("/admin/stats", protect, getRecruitmentStats);

router.get(
    "/presence/:userId",
    protect,
    getUserPresence
);

module.exports = router;
