const express = require("express");

const router = express.Router();

const {
  submitModuleAssignment,
  submitFinalExam,
} = require("../controllers/assessmentController");

const authMiddleware = require("../middleware/authMiddleware");


// ---------------------------------------------------------
// MODULE ASSIGNMENT
// ---------------------------------------------------------

router.post(
  "/courses/:courseId/modules/:moduleId/assignment/submit",
  authMiddleware,
  submitModuleAssignment
);


// ---------------------------------------------------------
// FINAL EXAM
// ---------------------------------------------------------

router.post(
  "/courses/:courseId/final-exam/submit",
  authMiddleware,
  submitFinalExam
);


module.exports = router;