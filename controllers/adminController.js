const User = require("../models/user");
const Employee = require("../models/Employee");
const JobPost = require("../models/JobPost");
const Course = require("../models/Course");
const Hire = require("../models/Hire");


// ==============================
// Platform Statistics
// ==============================
exports.getPlatformStats = async (req, res) => {

  try {

    const users = await User.countDocuments();
    const employees = await Employee.countDocuments();
    const jobs = await JobPost.countDocuments();
    const courses = await Course.countDocuments();
    const hires = await Hire.countDocuments();

    res.json({
      users,
      employees,
      jobs,
      courses,
      hires
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }

};



// ==============================
// Get all users
// ==============================
exports.getUsers = async (req, res) => {

  try {

    const users = await User.find().select("-password");

    res.json(users);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }

};



// ==============================
// Get all employees
// ==============================
exports.getEmployees = async (req, res) => {

  try {

    const employees = await Employee.find().populate("user");

    res.json(employees);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }

};



// ==============================
// Get all jobs
// ==============================
exports.getJobs = async (req, res) => {

  try {

    const jobs = await JobPost.find().populate("employer");

    res.json(jobs);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }

};



// ==============================
// Get all courses
// ==============================
exports.getCourses = async (req, res) => {

  try {

    const courses = await Course.find();

    res.json(courses);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }

};



// ==============================
// Delete user
// ==============================
exports.deleteUser = async (req, res) => {

  try {

    await User.findByIdAndDelete(req.params.id);

    res.json({
      message: "User deleted successfully"
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }

};



// ==============================
// Delete job
// ==============================
exports.deleteJob = async (req, res) => {

  try {

    await JobPost.findByIdAndDelete(req.params.id);

    res.json({
      message: "Job deleted successfully"
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }

};


// ==============================
// Revenue Analytics
// ==============================
const Payment = require("../models/Payment");

exports.getRevenue = async (req, res) => {

    try {

        const totalRevenue = await Payment.aggregate([
        { $match: { status: "paid" } },
        {
            $group: {
                _id: null,
                total: { $sum: "$amount" }
            }
        }
        ]);

        const payments = await Payment.find().populate("user");

        res.json({
            revenue: totalRevenue[0]?.total || 0,
            payments
        });

    } catch (error) {

        res.status(500).json({ message: error.message });

    }

};