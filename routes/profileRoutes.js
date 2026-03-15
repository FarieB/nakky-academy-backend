const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
  updateWorkerProfile,
  getWorkerProfile,
  searchWorkers
} = require("../controllers/profileController");


// Update worker profile
router.put("/worker", protect, updateWorkerProfile);


// View worker profile
router.get("/worker/:id", protect, getWorkerProfile);


// Search workers
router.get("/search", protect, searchWorkers);


module.exports = router;