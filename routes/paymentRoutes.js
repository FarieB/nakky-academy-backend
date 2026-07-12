const express = require("express");

const router = express.Router();

const auth = require("../middleware/authMiddleware");

const paymentController = require("../controllers/paymentController");

// Employer subscribes

router.post(

    "/subscription",

    auth,

    paymentController.createSubscription

);

// PayFast ITN

router.post(

    "/itn",

    paymentController.handleITN

);

module.exports = router;