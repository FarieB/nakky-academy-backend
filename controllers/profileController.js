const User = require("../models/user");


// ==============================
// Update Worker Profile
// ==============================

exports.updateWorkerProfile = async (req, res) => {

  try {

    if (req.user.role !== "employee") {
      return res.status(403).json({
        message: "Only workers can update profiles"
      });
    }

    const updated = await User.findByIdAndUpdate(
      req.user._id,
      req.body,
      { new: true }
    );

    res.json(updated);

  } catch (error) {

    res.status(500).json({ message: error.message });

  }

};


// ==============================
// View Worker Profile
// ==============================

exports.getWorkerProfile = async (req, res) => {

  try {

    const worker = await User.findById(req.params.id)
      .select("-password");

    res.json(worker);

  } catch (error) {

    res.status(500).json({ message: error.message });

  }

};


// ==============================
// Search Workers
// ==============================

exports.searchWorkers = async (req, res) => {

  try {

    const {
      workerType,
      province,
      minRating,
      availabilityStatus,
      workPreference
    } = req.query;

    const filter = {
      role: "employee"
    };

    if (workerType) filter.workerType = workerType;

    if (province) filter.province = province;

    if (availabilityStatus) filter.availabilityStatus = availabilityStatus;

    if (workPreference) filter.workPreference = workPreference;

    if (minRating) {
      filter.averageRating = { $gte: Number(minRating) };
    }

    const workers = await require("../models/user")
      .find(filter)
      .select("-password")
      .sort({ averageRating: -1 });

    res.json(workers);

  } catch (error) {

    res.status(500).json({
      message: error.message
    });

  }

};