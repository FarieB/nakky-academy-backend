const crypto = require("crypto");
const Enrollment = require("../models/Enrollment");


// ==============================
// INITIATE PAYMENT
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

    // Prevent paying twice
    if (enrollment.paymentStatus === "paid") {
      return res.status(400).json({
        message: "Course already paid"
      });
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
// VERIFY PAYFAST SIGNATURE
// ==============================
const verifySignature = (data, passphrase) => {
  const pfData = { ...data };
  delete pfData.signature;

  const queryString = Object.keys(pfData)
    .map(key => `${key}=${encodeURIComponent(pfData[key])}`)
    .join("&");

  const generatedSignature = crypto
    .createHash("md5")
    .update(queryString + `&passphrase=${passphrase}`)
    .digest("hex");

  return generatedSignature === data.signature;
};


// ==============================
// PAYFAST WEBHOOK (ITN)
// ==============================
exports.payfastNotify = async (req, res) => {
  try {
    const data = req.body;

    // 🔐 Verify signature
    const isValid = verifySignature(data, process.env.PAYFAST_PASSPHRASE);

    if (!isValid) {
      return res.status(400).send("Invalid signature");
    }

    const { m_payment_id, payment_status, amount_gross } = data;

    const enrollment = await Enrollment.findById(m_payment_id)
      .populate("course");

    if (!enrollment) {
      return res.status(404).send("Enrollment not found");
    }

    // Prevent duplicate processing
    if (enrollment.paymentStatus === "paid") {
      return res.status(200).send("Already processed");
    }

    // Validate amount
    const expectedAmount = enrollment.course.price.toFixed(2);

    if (parseFloat(amount_gross).toFixed(2) !== expectedAmount) {
      return res.status(400).send("Invalid payment amount");
    }

    // Handle payment status
    if (payment_status === "COMPLETE") {
      enrollment.paymentStatus = "paid";
    } else if (payment_status === "FAILED") {
      enrollment.paymentStatus = "failed";
    } else if (payment_status === "CANCELLED") {
      enrollment.paymentStatus = "cancelled";
    }

    await enrollment.save();

    res.status(200).send("OK");

  } catch (err) {
    console.error(err);
    res.status(500).send("Error");
  }
};
