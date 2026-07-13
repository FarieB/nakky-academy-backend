const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");
const PDFDocument = require("pdfkit");
const path = require("path");
const fs = require("fs");


// ==============================
// GET ALL COURSES (NEW - REQUIRED)
// ==============================
exports.getAllCourses = async (req, res) => {
  try {
    const courses = await Course.find().select("-content");
    res.json(courses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// ==============================
// GET SINGLE COURSE (NEW)
// ==============================
exports.getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId).select("-content");

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.json(course);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


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
// ADMIN: Add Lesson
// ==============================
exports.addCourseContent = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin only" });
    }

    const course = await Course.findById(req.params.courseId);

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    course.content.push({
      title: req.body.title,
      description: req.body.description,
      videoUrl: req.body.videoUrl || null
    });

    await course.save();

    res.json({ message: "Lesson added successfully ✅" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// ==============================
// ADMIN: Upload Lesson Video
// ==============================
exports.uploadLessonVideo = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin only" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No video uploaded" });
    }

    const course = await Course.findById(req.params.courseId);

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const lesson = {
      title: req.body.title,
      description: req.body.description,
      videoUrl: req.file.filename
    };

    course.content.push(lesson);
    await course.save();

    res.json({
      message: "Lesson video uploaded successfully 🎥",
      lesson
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// ==============================
// STUDENT: Enroll
// ==============================
exports.enrollCourse = async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Students only" });
    }

    const existing = await Enrollment.findOne({
      student: { $eq: req.user._id },
      course: { $eq: req.params.courseId }
    });

    if (existing) {
      return res.status(400).json({ message: "Already enrolled" });
    }

    const enrollment = await Enrollment.create({
      student: req.user._id,
      course: req.params.courseId,
      paymentStatus: "pending"
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
// STUDENT: GET CONTENT
// ==============================
exports.getCourseContent = async (req, res) => {
  try {
    const enrollment = await Enrollment.findOne({
// ==============================
// STREAM VIDEO (SAFE VERSION)
// ==============================
exports.streamVideo = async (req, res) => {
  try {
    const enrollment = await Enrollment.findOne({
      student: req.user._id,
      course: req.params.courseId,
      paymentStatus: "paid"
    });

    const videoPath = path.join(
      __dirname,
      "../uploads/videos",
      req.params.filename
    );

    const errorMap = {
      noEnrollment: { status: 403, message: "Access denied" },
      videoNotFound: { status: 404, message: "Video not found" }
    };
    const checks = [
      { condition: !enrollment, key: 'noEnrollment' },
      { condition: !fs.existsSync(videoPath), key: 'videoNotFound' }
    ];
    for (const { condition, key } of checks) {
      if (condition) {
        const { status, message } = errorMap[key];
        return res.status(status).json({ message });
      }
    }

    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      const chunkSize = end - start + 1;

      const file = fs.createReadStream(videoPath, { start, end });

      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize,
        "Content-Type": "video/mp4"
      });

      file.pipe(res);
    } else {
      res.writeHead(200, {
        "Content-Length": fileSize,
        "Content-Type": "video/mp4"
      });

      fs.createReadStream(videoPath).pipe(res);
    }

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// ==============================
// UPDATE PROGRESS (FIXED)
// ==============================
exports.updateProgress = async (req, res) => {
  try {
    const { lessonId } = req.body;

    const enrollment = await Enrollment.findOne({
      student: { $eq: req.user._id },
      course: { $eq: req.params.courseId },
      paymentStatus: "paid"
    });

    const errorMap = {
      noEnrollment: { condition: !enrollment, status: 403, body: { message: "Not enrolled or unpaid" } },
      noLessonId:   { condition: !lessonId,  status: 400, body: { message: "Lesson ID required" } }
    };

    for (const key in errorMap) {
      const { condition, status, body } = errorMap[key];
      if (condition) {
        return res.status(status).json(body);
      }
    }

    const alreadyCompleted = enrollment.lessonsCompleted.find(
      (l) => l.lessonId.toString() === lessonId
    );

    !alreadyCompleted && enrollment.lessonsCompleted.push({ lessonId });

    const course = await Course.findById(req.params.courseId);

    enrollment.progress = Math.round(
      (enrollment.lessonsCompleted.length / course.content.length) * 100
    );

    enrollment.completed = enrollment.progress >= 100;

    await enrollment.save();

    res.json({
      progress: enrollment.progress,
      completed: enrollment.completed
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// ==============================
// ISSUE CERTIFICATE
// ==============================
exports.issueCertificate = async (req, res) => {
  try {
    const enrollment = await Enrollment.findOne({
      student: { $eq: req.user._id },
      course: { $eq: req.params.courseId },
      completed: true
    }).populate("course");

    if (!enrollment) {
      return res.status(400).json({
        message: "Course not completed"
      });
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
// DOWNLOAD CERTIFICATE (PDF)
// ==============================
exports.downloadCertificate = async (req, res) => {
  try {
    const enrollment = await Enrollment.findOne({
      student: { $eq: req.user._id },
      course: { $eq: req.params.courseId },
      completed: true
    }).populate("course");

    if (!enrollment) {
      return res.status(400).json({
        message: "Course not completed"
      });
    }

    const doc = new PDFDocument({ size: "A4", margin: 50 });

    const fileName = `Certificate_${enrollment.course.title}_${req.user.name}.pdf`;

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileName}"`
    );

    res.setHeader("Content-Type", "application/pdf");

    doc.pipe(res);

    doc.fontSize(24).text("Nakky Academy Certificate of Completion", { align: "center" }).moveDown(2);
    doc.fontSize(18).text("This certifies that", { align: "center" }).moveDown(1);
    doc.fontSize(22).text(req.user.name, { align: "center", underline: true }).moveDown(1);
    doc.fontSize(18).text("has successfully completed the course", { align: "center" }).moveDown(1);
    doc.fontSize(20).text(enrollment.course.title, { align: "center", underline: true }).moveDown(2);
    doc.fontSize(16).text(`Date: ${new Date().toLocaleDateString()}`, { align: "center" });

    doc.end();

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};