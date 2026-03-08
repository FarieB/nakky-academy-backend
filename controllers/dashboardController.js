const JobInvitation = require("../models/JobInvitation");
const Message = require("../models/Message");
const JobPost = require("../models/JobPost");
const Employee = require("../models/Employee");
const CourseEnrollment = require("../models/CourseEnrollment");
const Hire = require("../models/Hire");


// ==============================
// Candidate Dashboard
// ==============================
exports.getCandidateDashboard = async (req, res) => {

  try {

    const userId = req.user.id;

    const employee = await Employee.findOne({ user: userId });

    if (!employee) {
      return res.status(404).json({ message: "Employee profile not found" });
    }

    const invitations = await JobInvitation.find({
      candidate: employee._id
    })
      .populate("job")
      .populate("employer", "name email");

    const messages = await Message.find({
      receiver: userId
    })
      .populate("sender", "name email")
      .sort({ createdAt: -1 });

    const recommendedJobs = await JobPost.find({
      jobType: employee.jobType,
      province: employee.province
    }).limit(10);

    const courses = await CourseEnrollment.find({
      student: userId
    }).populate("course");

    res.json({
      employee,
      invitations,
      messages,
      recommendedJobs,
      courses
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }

};



// ==============================
// Employer Dashboard
// ==============================
exports.getEmployerDashboard = async (req, res) => {

  try {

    const employerId = req.user.id;

    // ==========================
    // Jobs posted by employer
    // ==========================
    const jobs = await JobPost.find({
      employer: employerId
    }).sort({ createdAt: -1 });


    // ==========================
    // Invitations sent
    // ==========================
    const invitations = await JobInvitation.find({
      employer: employerId
    })
      .populate("candidate")
      .populate("job");


    // ==========================
    // Hires
    // ==========================
    const hires = await Hire.find({
      employer: employerId
    })
      .populate("candidate")
      .populate("job");


    // ==========================
    // Messages
    // ==========================
    const messages = await Message.find({
      sender: employerId
    })
      .populate("receiver", "name email")
      .sort({ createdAt: -1 });


    // ==========================
    // Stats
    // ==========================
    const stats = {
      totalJobs: jobs.length,
      totalInvitations: invitations.length,
      totalHires: hires.length
    };


    res.json({
      stats,
      jobs,
      invitations,
      hires,
      messages
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }

};