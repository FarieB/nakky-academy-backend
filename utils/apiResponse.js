exports.success = (res, message, data = null) => {

    return res.status(200).json({

        success: true,

        message,

        data

    });

};

exports.created = (res, message, data = null) => {

    return res.status(201).json({

        success: true,

        message,

        data

    });

};

exports.error = (res, statusCode, message) => {

    return res.status(statusCode).json({

        success: false,

        message

    });

};