const express = require("express");
const router = express.Router();

const { payEmployerSubscription, payEmployeeFee } = require("../controllers/paymentController");
const protect = require("../middleware/authMiddleware");

router.post("/pay-employer", protect, payEmployerSubscription);
router.post("/pay-employee", protect, payEmployeeFee);
router.put("/course/:enrollmentId", protect, payForCourse);

module.exports = router;
