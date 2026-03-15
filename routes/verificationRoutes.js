const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");
const upload = require("../middleware/documentUpload");

const {

submitVerification,
getVerifications,
approveVerification,
rejectVerification

} = require("../controllers/verificationController");


// Candidate submits verification
router.post(
"/submit",
protect,
upload.fields([
{ name: "idDocument", maxCount: 1 },
{ name: "policeClearance", maxCount: 1 }
]),
submitVerification
);


// Admin routes
router.get("/", protect, adminOnly, getVerifications);

router.put("/approve/:id", protect, adminOnly, approveVerification);

router.put("/reject/:id", protect, adminOnly, rejectVerification);


module.exports = router;