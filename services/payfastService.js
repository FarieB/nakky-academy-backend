const querystring = require("querystring");
const axios = require("axios");
const payfast = require("../config/payfast");
const crypto = require("crypto");

// ======================================
// Generate PayFast Signature
// ======================================

exports.generateSignature = (data) => {

    let pfOutput = "";

    Object.keys(data)
        .sort()
        .forEach(key => {

            if (
                data[key] !== undefined &&
                data[key] !== null &&
                data[key] !== ""
            ) {

                pfOutput += `${key}=${encodeURIComponent(data[key]).replace(/%20/g, "+")} &`;

            }

        });

    pfOutput = pfOutput.slice(0, -1);

    if (payfast.passphrase) {

        pfOutput += `&passphrase=${encodeURIComponent(payfast.passphrase)}`;

    }

    return crypto
        .createHash("sha256")
        .update(pfOutput)
        .digest("hex");

};

// ======================================
// Generate Payment URL
// ======================================

exports.generatePaymentUrl = (paymentData) => {

    paymentData.signature =
        exports.generateSignature(paymentData);

    const baseUrl = payfast.sandbox
        ? "https://sandbox.payfast.co.za/eng/process"
        : "https://www.payfast.co.za/eng/process";

    return `${baseUrl}?${querystring.stringify(paymentData)}`;

};

// ======================================
// Verify ITN With PayFast
// ======================================

exports.verifyITN = async (payload) => {

    const verifyUrl = payfast.sandbox
        ? "https://sandbox.payfast.co.za/eng/query/validate"
        : "https://www.payfast.co.za/eng/query/validate";

    try {

        const response = await axios.post(

            verifyUrl,

            querystring.stringify(payload),

            {

                headers: {

                    "Content-Type":
                        "application/x-www-form-urlencoded"

                }

            }

        );

        return response.data === "VALID";

    }

    catch (err) {

        console.error("PayFast Verification Error");

        console.error(err.message);

        return false;

    }

};


// ======================================
// Create Course Payment URL
// ======================================

exports.createCoursePayment = async ({
    payment,
    course,
    user
}) => {

    const paymentData = {

        merchant_id: payfast.merchantId,
        merchant_key: payfast.merchantKey,

        return_url: payfast.returnUrl,
        cancel_url: payfast.cancelUrl,
        notify_url: payfast.notifyUrl,

        name_first: user.name || "Student",
        email_address: user.email,

        m_payment_id: payment.merchantPaymentId,

        amount: Number(course.price).toFixed(2),

        item_name: course.title,

        item_description:
            course.shortDescription ||
            course.description ||
            "Nakky Academy Course",

        custom_str1: "course",
        custom_str2: course._id.toString(),
        custom_str3: user._id.toString(),

    };

    return exports.generatePaymentUrl(paymentData);

};