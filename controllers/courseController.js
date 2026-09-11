const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");
const path = require("path");
const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");
const fs = require("fs");

const paymentService = require("../services/paymentService");

const {
  refreshAdminDashboard,
} = require("../services/socketService");




// =====================================================
// GET ALL AVAILABLE COURSES
// =====================================================

exports.getAllCourses = async (req, res) => {
  try {

    let query = {};

    // Students should only see published courses
    if (req.user.role === "student") {
      query.published = true;
    }

    const courses = await Course.find(query)
      .select("-content")
      .sort({ createdAt: -1 });

    res.json(courses);

  } catch (err) {

    console.error("GET COURSES ERROR:", err);

    res.status(500).json({
      message: "Unable to load courses.",
      error: err.message,
    });

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

    // UPGRADE: Check student's enrollment and payment records
    const enrollment = await Enrollment.findOne({
      student: req.user._id,
      course: course._id,
    });

    const isEnrolled = enrollment?.paymentStatus === "paid";

    return res.status(200).json({
      ...course.toObject(),
      isEnrolled,
      progress: enrollment?.progress || 0,
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};



// ==============================
// ADMIN: Create Course
// ==============================
exports.createCourse = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Admin only",
      });
    }

      const {
      title,
      shortDescription,
      description,
      category,
      level,
      duration,
      price,
      published,
      certificate,
      passMark,
      content,
    } = req.body; 

    if (!title || !description) {
      return res.status(400).json({
        message: "Title and description are required.",
      });
    }

   const course = await Course.create({
  title,
  shortDescription,
  description,
  category,
  level,
  duration,
  price,
  published,
  certificate,
  passMark,
  content: content || [],
});

    // 👇 1. REFRESH DASHBOARD ON COURSE CREATION
    refreshAdminDashboard();

    res.status(201).json({
      message: "Course created successfully.",
      course,
    });

  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
};

// ==============================
// ADMIN: UPDATE COURSE
// ==============================
exports.updateCourse = async (req, res) => {
  try {

    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Admin only",
      });
    }

    const course = await Course.findByIdAndUpdate(
      req.params.courseId,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!course) {
      return res.status(404).json({
        message: "Course not found",
      });
    }

    res.json(course);

  } catch (err) {

    res.status(500).json({
      error: err.message,
    });

  }
};

// ==============================
// ADMIN: DELETE COURSE
// ==============================
exports.deleteCourse = async (req, res) => {

  try {

    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Admin only",
      });
    }

    const course = await Course.findById(req.params.courseId);

    if (!course) {
      return res.status(404).json({
        message: "Course not found",
      });
    }

    // Remove all enrollments for this course

    await Enrollment.deleteMany({
      course: course._id,
    });

    await course.deleteOne();

    // 👇 2. REFRESH DASHBOARD ON COURSE DELETION
    refreshAdminDashboard();

    res.json({
      message: "Course deleted successfully",
    });

  } catch (err) {

    res.status(500).json({
      error: err.message,
    });

  }

};


// =====================================
// PUBLISH COURSE
// =====================================

exports.publishCourse = async (req, res) => {

    try {

        if (req.user.role !== "admin") {
            return res.status(403).json({
                message: "Admin only"
            });
        }

        const course = await Course.findById(req.params.courseId);

        if (!course) {
            return res.status(404).json({
                message: "Course not found"
            });
        }

        course.published = true;

        await course.save();

        // 👇 3. REFRESH DASHBOARD ON COURSE PUBLISH
        refreshAdminDashboard();

        res.json({
            message: "Course published successfully",
            course
        });

    } catch (err) {

        res.status(500).json({
            error: err.message
        });

    }

};


// =====================================
// UNPUBLISH COURSE
// =====================================

exports.unpublishCourse = async (req, res) => {

    try {

        if (req.user.role !== "admin") {
            return res.status(403).json({
                message: "Admin only"
            });
        }

        const course = await Course.findById(req.params.courseId);

        if (!course) {
            return res.status(404).json({
                message: "Course not found"
            });
        }

        course.published = false;

        await course.save();

        // 👇 4. REFRESH DASHBOARD ON COURSE UNPUBLISH
        refreshAdminDashboard();

        res.json({
            message: "Course unpublished successfully",
            course
        });

    } catch (err) {

        res.status(500).json({
            error: err.message
        });

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
    videoUrl: req.body.videoUrl || "",
    duration: req.body.duration || 0,
    order: course.content.length + 1,
}); 

    await course.save();

    res.json({ message: "Lesson added successfully ✅" });
    return null;

  } catch (err) {
    res.status(500).json({ error: err.message });
    return null;
  }
};


// ==============================
// ADMIN: Upload Lesson Video
// ==============================
exports.uploadLessonVideo = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Admin only",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        message: "No video uploaded",
      });
    }

    const course = await Course.findById(req.params.courseId);

    if (!course) {
      return res.status(404).json({
        message: "Course not found",
      });
    }

    // Find the lesson inside the course
    const lesson = course.content.id(req.params.lessonId);

    if (!lesson) {
      return res.status(404).json({
        message: "Lesson not found",
      });
    }

    // Update only the video's filename
    lesson.videoUrl = req.file.filename;

    await course.save();

    res.json({
      message: "Lesson video uploaded successfully 🎥",
      lesson,
    });

  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
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
    return null;

  } catch (err) {
    res.status(500).json({ error: err.message });
    return null;
  }
};


// ==============================
// STUDENT: GET COURSE CONTENT
// ==============================
exports.getCourseContent = async (req, res) => {
  try {
    const enrollment = await Enrollment.findOne({
      student: req.user._id,
      course: req.params.courseId,
      paymentStatus: "paid",
    });

    if (!enrollment) {
      return res.status(403).json({
        message: "You are not enrolled in this course.",
      });
    }

    const course = await Course.findById(req.params.courseId);

    if (!course) {
      return res.status(404).json({
        message: "Course not found.",
      });
    }

    res.json({
      _id: course._id,
      title: course.title,
      shortDescription: course.shortDescription,
      description: course.description,
      category: course.category,
      level: course.level,
      duration: course.duration,
      price: course.price,
      passMark: course.passMark,

      content: course.content,

      progress: enrollment.progress,

      completed: enrollment.completed,

      completedLessons: enrollment.lessonsCompleted.map(
        (lesson) => lesson.lessonId.toString()
      ),

      certificateIssued:
        enrollment.certificateIssued,

      certificateNumber:
        enrollment.certificateNumber,
    });

  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
};


// =====================================================
// STREAM VIDEO
// PAID STUDENTS ONLY
// =====================================================

exports.streamVideo = async (req, res) => {

  try {

    // ==========================================
    // CHECK PAID ENROLLMENT
    // ==========================================

    const enrollment =
      await Enrollment.findOne({

        student: req.user._id,

        course: req.params.courseId,

        paymentStatus: "paid"

      });


    if (!enrollment) {

      return res.status(403).json({

        message:
          "You must complete payment before accessing this course."

      });

    }


    // ==========================================
    // FIND VIDEO
    // ==========================================

    const videoPath =
      path.join(

        __dirname,

        "../uploads/videos",

        req.params.filename

      );


    if (!fs.existsSync(videoPath)) {

      return res.status(404).json({

        message: "Video not found."

      });

    }


    // ==========================================
    // VIDEO INFORMATION
    // ==========================================

    const stat =
      fs.statSync(videoPath);

    const fileSize =
      stat.size;

    const range =
      req.headers.range;


    // ==========================================
    // STREAM PARTIAL VIDEO
    // ==========================================

    if (range) {

      const parts =
        range
          .replace(/bytes=/, "")
          .split("-");


      const start =
        parseInt(parts[0], 10);


      const end =
        parts[1]
          ? parseInt(parts[1], 10)
          : fileSize - 1;


      const chunkSize =
        end - start + 1;


      const file =
        fs.createReadStream(

          videoPath,

          {
            start,
            end
          }

        );


      res.writeHead(

        206,

        {

          "Content-Range":
            `bytes ${start}-${end}/${fileSize}`,

          "Accept-Ranges":
            "bytes",

          "Content-Length":
            chunkSize,

          "Content-Type":
            "video/mp4"

        }

      );


      file.pipe(res);

    }


    // ==========================================
    // STREAM FULL VIDEO
    // ==========================================

    else {

      res.writeHead(

        200,

        {

          "Content-Length":
            fileSize,

          "Content-Type":
            "video/mp4"

        }

      );


      fs
        .createReadStream(videoPath)
        .pipe(res);

    }


  } catch (err) {

    console.error(
      "VIDEO STREAM ERROR:",
      err
    );


    res.status(500).json({

      message:
        "Unable to stream video.",

      error:
        err.message

    });

  }

};




// ==============================
// UPDATE PROGRESS
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
      return res.status(403).json({
        message: "Not enrolled or payment not completed."
      });
    }

    if (!lessonId) {
      return res.status(400).json({
        message: "Lesson ID is required."
      });
    }

    const alreadyCompleted = enrollment.lessonsCompleted.some(
      (lesson) => lesson.lessonId.toString() === lessonId
    );

    if (!alreadyCompleted) {
      enrollment.lessonsCompleted.push({ lessonId });
    }

    const course = await Course.findById(req.params.courseId);

    enrollment.progress = Math.round(
      (enrollment.lessonsCompleted.length / course.content.length) * 100
    );

      if (enrollment.progress >= 100) {
      enrollment.completed = true;
      enrollment.completedAt = new Date();

      if (!enrollment.certificateIssued) {
        enrollment.certificateIssued = true;

        enrollment.certificateNumber =
          `NA-${Date.now()}`;
      }
    } 

    await enrollment.save();

     res.json({
      progress: enrollment.progress,
      completed: enrollment.completed,
      certificateIssued:
        enrollment.certificateIssued,
      certificateNumber:
        enrollment.certificateNumber,
    }); 

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
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

      if (!enrollment.certificateIssued) {
      enrollment.certificateIssued = true;

      enrollment.certificateNumber =
        `NA-${Date.now()}`;

      await enrollment.save();
    } 

    res.json({
      message: "Certificate issued 🎉",
      certificate: {
        student: req.user.name,
        course: enrollment.course.title,
        date: new Date()
      }
    });
    return null;

  } catch (err) {
    res.status(500).json({ error: err.message });
    return null;
  }
};




// ==============================
// DOWNLOAD CERTIFICATE
// ==============================
exports.downloadCertificate = async (req, res) => {
  try {

    const enrollment = await Enrollment.findOne({
      student: req.user._id,
      course: req.params.courseId,
      completed: true
    }).populate("course");

    if (!enrollment) {
      return res.status(400).json({
        message: "Course not completed."
      });
    }

    if (!enrollment.certificateNumber) {
      enrollment.certificateNumber =
        "NK-" + Date.now();

      enrollment.certificateIssued = true;

      await enrollment.save();
    }

    const verificationURL =
      `https://nakkyacademy.co.za{enrollment.certificateNumber}`;

    // ----------------------------------------------------
    // Step 5 — Generate QR Code Data & Buffer
    // ----------------------------------------------------
    const qrImage = await QRCode.toDataURL(verificationURL);
    const qrBuffer = Buffer.from(
      qrImage.replace(/^data:image\/png;base64,/, ""),
      "base64"
    );

    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margin: 50,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${enrollment.course.title}-Certificate.pdf"`
    );

    doc.pipe(res);

    // ----------------------------------------------------
    // Step 12 — Decorative Border (Drawn first to sit in background)
    // ----------------------------------------------------
    doc
      .lineWidth(8)
      .strokeColor("#C8A24C")
      .rect(20, 20, 802, 555) // Adjusted to 802 to fit your canvas layout perfectly
      .stroke();

    doc
      .lineWidth(2)
      .strokeColor("#E91E63")
      .rect(35, 35, 772, 525) // Adjusted to 772 to match layout bounds cleanly
      .stroke();

    // ----------------------------------------------------
    // Step 13 — Watermark (Drawn early so text sits safely on top)
    // ----------------------------------------------------
    doc
      .opacity(0.08)
      .fontSize(100)
      .fillColor("#E91E63")
      .rotate(-35, { origin: [420, 290] })
      .text("NAKKY ACADEMY", 120, 240);

    // CRITICAL: Reset opacity immediately so normal assets aren't transparent
    doc.opacity(1); 
    // CRITICAL: Un-rotate the canvas matrix so following text stays straight
    doc.rotate(35, { origin: [420, 290] }); 

    // ----------------------------------------------------
    // Step 6 — Add Academy Logo
    // ----------------------------------------------------
    doc.image(
      path.join(__dirname, "../assets/logo.png"),
      345, // Adjusted to 345 to center a 150px wide image perfectly on an 842px page
      45,
      { width: 150 }
    );

    // Spacing adjustment down to clear header logo layout
    doc.moveDown(5);

    doc
      .fontSize(26)
      .fillColor("#000")
      .text("Certificate of Completion", { align: "center" });

    doc.moveDown(1);

    doc
      .fontSize(18)
      .text("This certifies that", { align: "center" });

    doc.moveDown(0.5);

    // ----------------------------------------------------
    // Step 7 — Student Name (Make it huge)
    // ----------------------------------------------------
    doc
      .fontSize(34)
      .fillColor("#E91E63")
      .text(req.user.name.toUpperCase(), { align: "center" });

    doc.moveDown(0.5);

    doc
      .fontSize(18)
      .fillColor("#000")
      .text("has successfully completed", { align: "center" });

    doc.moveDown(0.5);

    // ----------------------------------------------------
    // Step 8 — Course Name
    // ----------------------------------------------------
    doc
      .fontSize(24)
      .fillColor("black")
      .text(enrollment.course.title, { align: "center" });

    doc.moveDown(0.5);

    doc
      .fontSize(16)
      .text(`Completion Date: ${new Date().toLocaleDateString()}`, { align: "center" });

    doc.moveDown(0.5);

    // ----------------------------------------------------
    // Step 9 — Certificate Number
    // ----------------------------------------------------
    doc
      .fontSize(14)
      .fillColor("gray")
      .text(`Certificate No: ${enrollment.certificateNumber}`, { align: "center" });

    // ----------------------------------------------------
    // Step 10 — QR Code Placement
    // ----------------------------------------------------
    doc.image(qrBuffer, 650, 410, { width: 110 });

    // ----------------------------------------------------
    // Step 11 — Director Signature Placement
    // ----------------------------------------------------
    doc.image(
      path.join(__dirname, "../assets/signature.png"),
      85,
      410,
      { width: 150 }
    );

    doc
      .fontSize(14)
      .fillColor("#000")
      .text("__________________________", 60, 475);

    doc.text("Nakky Academy Director", 65, 495);

    doc.end();

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
};

// =====================================================
// STUDENT: CREATE COURSE EFT PAYMENT
// =====================================================

exports.createCoursePayment = async (req, res) => {

  try {

    // ==========================================
    // STUDENT ONLY
    // ==========================================

    if (req.user.role !== "student") {

      return res.status(403).json({
        message: "Only students can purchase courses."
      });

    }


    // ==========================================
    // CREATE EFT PAYMENT
    // ==========================================

    const result =
      await paymentService.createCoursePayment(
        req.user,
        req.params.courseId
      );


    return res.status(200).json(result);

  } catch (err) {

    console.error(
      "COURSE PAYMENT ERROR:",
      err.message
    );


    return res.status(400).json({

      message:
        err.message ||
        "Unable to create course payment."

    });

  }

};