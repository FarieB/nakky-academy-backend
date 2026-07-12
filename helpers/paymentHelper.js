exports.generateMerchantReference = () => {

    const timestamp = Date.now();

    const random = Math.floor(Math.random() * 9000) + 1000;

    return `NAKKY-${timestamp}-${random}`;

};