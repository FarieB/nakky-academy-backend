const crypto = require("crypto");
const querystring = require("querystring");
const axios = require("axios");
const payfast = require("../config/payfast");

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

                pfOutput += `${key}=${encodeURIComponent(data[key]).replace(/%20/g, "+")}&`;

            }

        });

    pfOutput = pfOutput.slice(0, -1);

    if (payfast.passphrase) {

        pfOutput += `&passphrase=${encodeURIComponent(payfast.passphrase)}`;

    }

    return crypto
        .createHash("md5")
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