const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");
const AssessmentAttempt = require("../models/AssessmentAttempt");

/**
 * -------------------------------------------------------
 * SUBMIT MODULE ASSIGNMENT
 * -------------------------------------------------------
 */
const submitModuleAssignment = async (req, res) => {
  try {
    const { courseId, moduleId } = req.params;
    const { answers } = req.body;

    const studentId = req.user._id || req.user.id;

    // ---------------------------------------------------
    // VALIDATE ANSWERS
    // ---------------------------------------------------

    if (!Array.isArray(answers)) {
      return res.status(400).json({
        success: false,
        message: "Answers must be provided as an array.",
      });
    }

    // ---------------------------------------------------
    // FIND PAID ENROLLMENT
    // ---------------------------------------------------

    const enrollment = await Enrollment.findOne({
      student: studentId,
      course: courseId,
      paymentStatus: "paid",
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message:
          "You must have a paid enrollment to submit this assignment.",
      });
    }

    // ---------------------------------------------------
    // FIND COURSE
    // ---------------------------------------------------

    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    // ---------------------------------------------------
    // FIND MODULE
    // ---------------------------------------------------

    const module = course.modules.id(moduleId);

    if (!module) {
      return res.status(404).json({
        success: false,
        message: "Module not found.",
      });
    }

    // ---------------------------------------------------
    // CHECK ASSIGNMENT
    // ---------------------------------------------------

    if (!module.assignment || !module.assignment.enabled) {
      return res.status(400).json({
        success: false,
        message: "This module does not have an active assignment.",
      });
    }

    const assignment = module.assignment;

    const questions = Array.isArray(assignment.questions)
      ? assignment.questions
      : [];

    if (questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "This assignment does not contain any questions.",
      });
    }

    // ---------------------------------------------------
    // PREVENT SUBMISSION IF MODULE LESSONS ARE NOT DONE
    // ---------------------------------------------------

    const moduleLessons = Array.isArray(module.lessons)
      ? module.lessons
      : [];

    const completedLessonIds = new Set(
      (enrollment.lessonsCompleted || []).map((item) =>
        String(item.lessonId)
      )
    );

    const allLessonsCompleted = moduleLessons.every((lesson) =>
      completedLessonIds.has(String(lesson._id))
    );

    if (!allLessonsCompleted) {
      return res.status(403).json({
        success: false,
        message:
          "Please complete all lessons in this module before taking the assignment.",
      });
    }

    // ---------------------------------------------------
    // NORMALISE SUBMITTED ANSWERS
    // ---------------------------------------------------

    const submittedAnswers = new Map();

    answers.forEach((item) => {
      if (!item || !item.questionId) return;

      submittedAnswers.set(
        String(item.questionId),
        item.answer ?? ""
      );
    });

    // ---------------------------------------------------
    // MARK QUESTIONS
    // ---------------------------------------------------

    let totalMarks = 0;
    let marksAwarded = 0;

    let requiresManualReview = false;

    const markedAnswers = [];

    for (const question of questions) {
      const questionId = String(question._id);

      const questionMarks =
        Number(question.marks) > 0
          ? Number(question.marks)
          : 1;

      totalMarks += questionMarks;

      const submittedAnswer =
        submittedAnswers.get(questionId) ?? "";

      const questionType = question.type;

      let correct = false;
      let automaticallyMarked = true;
      let awarded = 0;

      // -------------------------------------------------
      // MULTIPLE CHOICE
      // -------------------------------------------------

      if (questionType === "multiple_choice") {
        const expected = String(
          question.correctAnswer ?? ""
        )
          .trim()
          .toLowerCase();

        const actual = String(submittedAnswer)
          .trim()
          .toLowerCase();

        correct =
          expected !== "" &&
          actual !== "" &&
          expected === actual;

        if (correct) {
          awarded = questionMarks;
        }
      }

      // -------------------------------------------------
      // TRUE / FALSE
      // -------------------------------------------------

      else if (questionType === "true_false") {
        const expected = String(
          question.correctAnswer ?? ""
        )
          .trim()
          .toLowerCase();

        const actual = String(submittedAnswer)
          .trim()
          .toLowerCase();

        correct =
          expected !== "" &&
          actual !== "" &&
          expected === actual;

        if (correct) {
          awarded = questionMarks;
        }
      }

      // -------------------------------------------------
      // SHORT / LONG ANSWER
      // -------------------------------------------------

      else if (
        questionType === "short_answer" ||
        questionType === "long_answer"
      ) {
        automaticallyMarked = false;
        requiresManualReview = true;
      }

      // -------------------------------------------------
      // UNKNOWN QUESTION TYPE
      // -------------------------------------------------

      else {
        automaticallyMarked = false;
        requiresManualReview = true;
      }

      marksAwarded += awarded;

      markedAnswers.push({
        questionId: question._id,
        answer: String(submittedAnswer),
        correct,
        marksAwarded: awarded,
        manuallyReviewed: !automaticallyMarked,
      });
    }

    // ---------------------------------------------------
    // CALCULATE PERCENTAGE
    // ---------------------------------------------------

    const percentage =
      totalMarks > 0
        ? Math.round((marksAwarded / totalMarks) * 100)
        : 0;

    const passMark =
      Number(assignment.passMark) >= 0
        ? Number(assignment.passMark)
        : 80;

    /**
     * If manual marking is required, we don't immediately
     * mark the assessment as passed. It remains pending
     * review until an admin completes the marking.
     */
    const passed =
      !requiresManualReview &&
      percentage >= passMark;

    const status = requiresManualReview
      ? "pending_review"
      : passed
      ? "passed"
      : "failed";

    // ---------------------------------------------------
    // CREATE ATTEMPT
    // ---------------------------------------------------

    const attempt = await AssessmentAttempt.create({
      student: studentId,
      course: courseId,
      module: moduleId,
      assessmentType: "module_assignment",

      answers: markedAnswers,

      totalMarks,
      marksAwarded,
      percentage,

      passMark,

      passed,

      requiresManualReview,

      submittedAt: new Date(),
    });

    // ---------------------------------------------------
    // UPDATE ENROLLMENT
    // ---------------------------------------------------

    let assessmentRecord =
      enrollment.moduleAssessments.find(
        (item) =>
          String(item.moduleId) === String(moduleId)
      );

    if (!assessmentRecord) {
      enrollment.moduleAssessments.push({
        moduleId,
        status,
        attempts: 1,
        latestAttempt: attempt._id,
        percentage,
        passedAt: passed ? new Date() : null,
      });
    } else {
      assessmentRecord.status = status;

      assessmentRecord.attempts =
        Number(assessmentRecord.attempts || 0) + 1;

      assessmentRecord.latestAttempt =
        attempt._id;

      assessmentRecord.percentage = percentage;

      assessmentRecord.passedAt = passed
        ? new Date()
        : null;
    }

    await enrollment.save();

    // ---------------------------------------------------
    // RESPONSE
    // ---------------------------------------------------

    return res.status(201).json({
      success: true,

      message: requiresManualReview
        ? "Assignment submitted successfully and is awaiting manual review."
        : passed
        ? "Congratulations! You passed the assignment."
        : "Assignment submitted. You did not reach the required pass mark.",

      result: {
        attemptId: attempt._id,

        status,

        totalMarks,

        marksAwarded,

        percentage,

        passMark,

        passed,

        requiresManualReview,

        attempts:
          assessmentRecord?.attempts ||
          1,
      },
    });
  } catch (error) {
    console.error(
      "submitModuleAssignment error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to submit assignment.",
      error: error.message,
    });
  }
};


/**
 * ============================================================
 * SUBMIT FINAL EXAM
 * ============================================================
 */
const submitFinalExam = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { answers } = req.body;

    const studentId = req.user._id || req.user.id;

    // --------------------------------------------------------
    // VALIDATE ANSWERS
    // --------------------------------------------------------

    if (!Array.isArray(answers)) {
      return res.status(400).json({
        success: false,
        message: "Answers must be provided as an array.",
      });
    }

    // --------------------------------------------------------
    // FIND PAID ENROLLMENT
    // --------------------------------------------------------

    const enrollment = await Enrollment.findOne({
      student: studentId,
      course: courseId,
      paymentStatus: "paid",
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message:
          "You must have a paid enrollment to take the final exam.",
      });
    }

    // --------------------------------------------------------
    // FIND COURSE
    // --------------------------------------------------------

    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    // --------------------------------------------------------
    // CHECK FINAL EXAM
    // --------------------------------------------------------

    if (
      !course.finalExam ||
      !course.finalExam.enabled
    ) {
      return res.status(400).json({
        success: false,
        message:
          "This course does not have an active final exam.",
      });
    }

    const finalExam = course.finalExam;

    const questions = Array.isArray(
      finalExam.questions
    )
      ? finalExam.questions
      : [];

    if (questions.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "This final exam does not contain any questions.",
      });
    }

    // --------------------------------------------------------
    // CHECK ALL MODULES ARE COMPLETED
    // --------------------------------------------------------

    const modules =
      course.modules || [];

    const completedLessonIds = new Set(
      (enrollment.lessonsCompleted || []).map(
        (item) => String(item.lessonId)
      )
    );

    const allModulesCompleted =
      modules.every((module) => {
        const lessons =
          module.lessons || [];

        // Check lessons
        const lessonsCompleted =
          lessons.every((lesson) =>
            completedLessonIds.has(
              String(lesson._id)
            )
          );

        if (!lessonsCompleted) {
          return false;
        }

        // Check assignment if enabled
        if (
          module.assignment?.enabled
        ) {
          const assessment =
            (
              enrollment.moduleAssessments ||
              []
            ).find(
              (item) =>
                String(item.moduleId) ===
                String(module._id)
            );

          return (
            assessment?.status ===
            "passed"
          );
        }

        return true;
      });

    if (!allModulesCompleted) {
      return res.status(403).json({
        success: false,
        message:
          "You must complete all course modules and required assignments before taking the final exam.",
      });
    }

    // --------------------------------------------------------
    // NORMALISE ANSWERS
    // --------------------------------------------------------

    const submittedAnswers =
      new Map();

    answers.forEach((item) => {
      if (
        !item ||
        !item.questionId
      ) {
        return;
      }

      submittedAnswers.set(
        String(item.questionId),
        item.answer ?? ""
      );
    });

    // --------------------------------------------------------
    // MARK EXAM
    // --------------------------------------------------------

    let totalMarks = 0;
    let marksAwarded = 0;

    let requiresManualReview = false;

    const markedAnswers = [];

    for (const question of questions) {
      const questionId =
        String(question._id);

      const questionMarks =
        Number(question.marks) > 0
          ? Number(question.marks)
          : 1;

      totalMarks += questionMarks;

      const submittedAnswer =
        submittedAnswers.get(
          questionId
        ) ?? "";

      const questionType =
        question.type;

      let correct = false;
      let automaticallyMarked =
        true;

      let awarded = 0;

      // ------------------------------------------------------
      // MULTIPLE CHOICE
      // ------------------------------------------------------

      if (
        questionType ===
        "multiple_choice"
      ) {
        const expected =
          String(
            question.correctAnswer ??
              ""
          )
            .trim()
            .toLowerCase();

        const actual =
          String(
            submittedAnswer
          )
            .trim()
            .toLowerCase();

        correct =
          expected !== "" &&
          actual !== "" &&
          expected === actual;

        if (correct) {
          awarded =
            questionMarks;
        }
      }

      // ------------------------------------------------------
      // TRUE / FALSE
      // ------------------------------------------------------

      else if (
        questionType ===
        "true_false"
      ) {
        const expected =
          String(
            question.correctAnswer ??
              ""
          )
            .trim()
            .toLowerCase();

        const actual =
          String(
            submittedAnswer
          )
            .trim()
            .toLowerCase();

        correct =
          expected !== "" &&
          actual !== "" &&
          expected === actual;

        if (correct) {
          awarded =
            questionMarks;
        }
      }

      // ------------------------------------------------------
      // SHORT / LONG ANSWER
      // ------------------------------------------------------

      else if (
        questionType ===
          "short_answer" ||
        questionType ===
          "long_answer"
      ) {
        automaticallyMarked =
          false;

        requiresManualReview =
          true;
      }

      // ------------------------------------------------------
      // UNKNOWN TYPE
      // ------------------------------------------------------

      else {
        automaticallyMarked =
          false;

        requiresManualReview =
          true;
      }

      marksAwarded += awarded;

      markedAnswers.push({
        questionId:
          question._id,

        answer:
          String(
            submittedAnswer
          ),

        correct,

        marksAwarded:
          awarded,

        manuallyReviewed:
          !automaticallyMarked,
      });
    }

    // --------------------------------------------------------
    // CALCULATE RESULT
    // --------------------------------------------------------

    const percentage =
      totalMarks > 0
        ? Math.round(
            (marksAwarded /
              totalMarks) *
              100
          )
        : 0;

    const passMark =
      Number(
        finalExam.passMark
      ) >= 0
        ? Number(
            finalExam.passMark
          )
        : 80;

    const passed =
      !requiresManualReview &&
      percentage >= passMark;

    const status =
      requiresManualReview
        ? "pending_review"
        : passed
        ? "passed"
        : "failed";

    // --------------------------------------------------------
    // CREATE ATTEMPT
    // --------------------------------------------------------

    const attempt =
      await AssessmentAttempt.create({
        student: studentId,

        course: courseId,

        module: null,

        assessmentType:
          "final_exam",

        answers:
          markedAnswers,

        totalMarks,

        marksAwarded,

        percentage,

        passMark,

        passed,

        requiresManualReview,

        submittedAt:
          new Date(),
      });

    // --------------------------------------------------------
    // UPDATE ENROLLMENT
    // --------------------------------------------------------

    enrollment.finalExamStatus =
      status;

    enrollment.finalExamAttempts =
      Number(
        enrollment.finalExamAttempts ||
          0
      ) + 1;

    enrollment.latestFinalExamAttempt =
      attempt._id;

    enrollment.finalExamPercentage =
      percentage;

    enrollment.finalExamPassedAt =
      passed
        ? new Date()
        : null;

    /**
     * Only a passed final exam can
     * complete the course.
     */
    if (passed) {
      enrollment.completed =
        true;

      enrollment.completedAt =
        new Date();
    } else {
      enrollment.completed =
        false;

      enrollment.completedAt =
        null;
    }

    await enrollment.save();

    // --------------------------------------------------------
    // RESPONSE
    // --------------------------------------------------------

    return res.status(201).json({
      success: true,

      message:
        requiresManualReview
          ? "Final exam submitted successfully and is awaiting manual review."
          : passed
          ? "Congratulations! You passed the final exam."
          : "Final exam submitted. You did not reach the required pass mark.",

      result: {
        attemptId:
          attempt._id,

        status,

        totalMarks,

        marksAwarded,

        percentage,

        passMark,

        passed,

        requiresManualReview,

        attempts:
          enrollment.finalExamAttempts,
      },
    });
  } catch (error) {
    console.error(
      "submitFinalExam error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Failed to submit final exam.",

      error:
        error.message,
    });
  }
};


module.exports = {
  submitModuleAssignment,
  submitFinalExam,
};