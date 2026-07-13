exports.info = (...args) => {
  // intentionally empty. info logging disabled
};

exports.error = (...args) => {

    console.error("[ERROR]", ...args);

};

exports.warn = (...args) => {

    console.warn("[WARN]", ...args);

};