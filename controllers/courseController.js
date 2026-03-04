const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");
const PDFDocument = require("pdfkit");

// ==============================
// ADMIN: Create Course
// ==============================
exports.createCourse = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin only" });
    }

    const course = await Course.create(req.body);
    res.status(201).json(course);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ==============================
// ADMIN: Add Lesson to Course
// ==============================
exports.addCourseContent = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin only" });
    }

    const course = await Course.findById(req.params.courseId);
    if (!course) return res.status(404).json({ message: "Course not found" });

    course.content.push(req.body);
    await course.save();

    res.json({ message: "Lesson added successfully ✅" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ==============================
// STUDENT: Enroll in Course
// ==============================
exports.enrollCourse = async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Students only" });
    }

    const existing = await Enrollment.findOne({
      student: req.user._id,
      course: req.params.courseId
    });

    if (existing) {
      return res.status(400).json({ message: "Already enrolled" });
    }

    const enrollment = await Enrollment.create({
      student: req.user._id,
      course: req.params.courseId
    });

    res.status(201).json({
      message: "Enrollment created. Please complete payment.",
      enrollment
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ==============================
// STUDENT: Access Course Content
// ==============================
exports.getCourseContent = async (req, res) => {
  try {
    const enrollment = await Enrollment.findOne({
      student: req.user._id,
      course: req.params.courseId,
      paymentStatus: "paid"
    }).populate("course");

    if (!enrollment) {
      return res.status(403).json({ message: "You must pay for this course" });
    }

    res.json(enrollment.course.content);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ==============================
// STUDENT: Update Progress
// ==============================
exports.updateProgress = async (req, res) => {
  try {
    const { lessonId } = req.body;

    const enrollment = await Enrollment.findOne({
      student: req.user._id,
      course: req.params.courseId,
      paymentStatus: "paid"
    });

    if (!enrollment) {
      return res.status(403).json({ message: "Not enrolled or unpaid" });
    }

    if (!enrollment.lessonsCompleted.find(l => l.lessonId === lessonId)) {
      enrollment.lessonsCompleted.push({ lessonId });
    }

    const course = await Course.findById(req.params.courseId);

    enrollment.progress = Math.round(
      (enrollment.lessonsCompleted.length / course.content.length) * 100
    );

    if (enrollment.progress === 100) {
      enrollment.completed = true;
    }

    await enrollment.save();

    res.json({ progress: enrollment.progress });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ==============================
// STUDENT: Issue Certificate (JSON response)
// ==============================
exports.issueCertificate = async (req, res) => {
  try {
    const enrollment = await Enrollment.findOne({
      student: req.user._id,
      course: req.params.courseId,
      completed: true
    }).populate("course");

    if (!enrollment) {
      return res.status(400).json({ message: "Course not completed" });
    }

    enrollment.certificateIssued = true;
    await enrollment.save();

    res.json({
      message: "Certificate issued 🎉",
      certificate: {
        student: req.user.name,
        course: enrollment.course.title,
        date: new Date()
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ==============================
// STUDENT: Download PDF Certificate
// ==============================
exports.downloadCertificate = async (req, res) => {
  try {
    const enrollment = await Enrollment.findOne({
      student: req.user._id,
      course: req.params.courseId,
      completed: true
    }).populate("course");

    if (!enrollment) {
      return res.status(400).json({ message: "Course not completed" });
    }

    enrollment.certificateIssued = true;
    await enrollment.save();

    // Create PDF document
    const doc = new PDFDocument({ size: "A4", margin: 50 });

    // Filename
    const fileName = `Certificate_${enrollment.course.title}_${req.user.name}.pdf`;
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Type", "application/pdf");

    // Stream PDF to response
    doc.pipe(res);

    // Certificate content
    doc
      .fontSize(24)
      .text("Nakky Academy Certificate of Completion", { align: "center" })
      .moveDown(2);

    doc
      .fontSize(18)
      .text("This certifies that", { align: "center" })
      .moveDown(1);

    doc
      .fontSize(22)
      .text(req.user.name, { align: "center", underline: true })
      .moveDown(1);

    doc
      .fontSize(18)
      .text("has successfully completed the course", { align: "center" })
      .moveDown(1);

    doc
      .fontSize(20)
      .text(enrollment.course.title, { align: "center", underline: true })
      .moveDown(2);

    doc
      .fontSize(16)
      .text(`Date: ${new Date().toLocaleDateString()}`, { align: "center" })
      .moveDown(1);

    doc
      .fontSize(16)
      .text("Instructor: Nakky Academy", { align: "center" })
      .moveDown(3);

    doc
      .fontSize(12)
      .text("This certificate is proof of successful completion of the course.", { align: "center" });

    doc.end();

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};