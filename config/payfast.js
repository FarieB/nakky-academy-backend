module.exports = {

    merchantId: process.env.PAYFAST_MERCHANT_ID,

    merchantKey: process.env.PAYFAST_MERCHANT_KEY,

    passphrase: process.env.PAYFAST_PASSPHRASE,

    sandbox:
        process.env.PAYFAST_SANDBOX === "true"

};