exports.addDays = (date, days) => {

    const result = new Date(date);

    result.setDate(result.getDate() + days);

    return result;

};

exports.isExpired = (expiryDate) => {

    return new Date(expiryDate) < new Date();

};

exports.remainingDays = (expiryDate) => {

    const diff =

        new Date(expiryDate) -

        new Date();

    return Math.max(

        Math.ceil(

            diff /

            (1000 * 60 * 60 * 24)

        ),

        0

    );

};