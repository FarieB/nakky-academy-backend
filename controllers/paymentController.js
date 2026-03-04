const axios = require("axios");
const crypto = require("crypto");
const Enrollment = require("../models/Enrollment");
const Course = require("../models/Course");

// ==============================
// STUDENT: Initiate Course Payment
// ==============================
exports.initiateCoursePayment = async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.enrollmentId)
      .populate("course");

    if (!enrollment) {
      return res.status(404).json({ message: "Enrollment not found" });
    }

    if (enrollment.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const paymentData = {
      merchant_id: process.env.PAYFAST_MERCHANT_ID,
      merchant_key: process.env.PAYFAST_MERCHANT_KEY,
      return_url: process.env.PAYFAST_RETURN_URL,
      cancel_url: process.env.PAYFAST_CANCEL_URL,
      notify_url: process.env.PAYFAST_NOTIFY_URL,

      name_first: req.user.name,
      email_address: req.user.email,
      m_payment_id: enrollment._id.toString(),
      amount: enrollment.course.price.toFixed(2),
      item_name: enrollment.course.title
    };

    const queryString = Object.keys(paymentData)
      .map(key => `${key}=${encodeURIComponent(paymentData[key])}`)
      .join("&");

    const signature = crypto
      .createHash("md5")
      .update(queryString + `&passphrase=${process.env.PAYFAST_PASSPHRASE}`)
      .digest("hex");

    const paymentUrl = `https://sandbox.payfast.co.za/eng/process?${queryString}&signature=${signature}`;

    res.json({ paymentUrl });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ==============================
// PAYFAST ITN (Webhook)
// ==============================
exports.payfastNotify = async (req, res) => {
  try {
    const { m_payment_id, payment_status } = req.body;

    if (payment_status === "COMPLETE") {
      const enrollment = await Enrollment.findById(m_payment_id);

      if (enrollment) {
        enrollment.paymentStatus = "paid";
        await enrollment.save();
      }
    }

    res.status(200).send("OK");

  } catch (err) {
    res.status(500).send("Error");
  }
};
