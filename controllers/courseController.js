const mongoose = require("mongoose");
const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");
const path = require("path");
const fs = require("fs");

const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");

const paymentService = require("../services/paymentService");
const {
    refreshAdminDashboard,
} = require("../services/adminDashboardService");

/**
 * ============================================================
 * HELPERS
 * ============================================================
 */

/**
 * Convert an old course.content structure into the new
 * Module → Lesson structure.
 *
 * This allows courses created before the upgrade to continue
 * working.
 */
const legacyContentToModules = (content = []) => {
    if (!Array.isArray(content) || content.length === 0) {
        return [];
    }

    return [
        {
            _id: new mongoose.Types.ObjectId(),
            title: "Module 1",
            description: "Existing course content",
            order: 1,

            lessons: content.map((lesson, index) => ({
                _id: lesson._id,
                title: lesson.title || `Lesson ${index + 1}`,
                description: lesson.description || "",
                duration: Number(lesson.duration) || 0,
                order: lesson.order || index + 1,

                materials: [],

                video: {
                    type: lesson.videoUrl ? "upload" : "none",
                    url: lesson.videoUrl || "",
                    filename: lesson.videoUrl || "",
                    title: "",
                },
            })),

            assignment: {
                enabled: false,
                title: "",
                instructions: "",
                passMark: 80,
                questions: [],
            },
        },
    ];
};


/**
 * Return the actual modules for a course.
 *
 * New courses use `modules`.
 * Old courses are temporarily converted from `content`.
 */
const getCourseModules = (course) => {
    if (Array.isArray(course.modules) && course.modules.length > 0) {
        return course.modules;
    }

    return legacyContentToModules(course.content || []);
};


/**
 * Count all lessons in a course.
 */
const getTotalLessons = (course) => {
    const modules = getCourseModules(course);

    return modules.reduce((total, module) => {
        return total + (module.lessons?.length || 0);
    }, 0);
};


/**
 * Count materials.
 */
const getTotalMaterials = (course) => {
    const modules = getCourseModules(course);

    return modules.reduce((total, module) => {
        return (
            total +
            (module.lessons || []).reduce((lessonTotal, lesson) => {
                return lessonTotal + (lesson.materials?.length || 0);
            }, 0)
        );
    }, 0);
};


/**
 * Validate external video URL.
 */
const isValidExternalVideoUrl = (url) => {
    if (!url) return true;

    try {
        const parsed = new URL(url);

        return (
            parsed.protocol === "http:" ||
            parsed.protocol === "https:"
        );
    } catch {
        return false;
    }
};


/**
 * Convert incoming questions into a safe structure.
 */
const normalizeQuestions = (questions = []) => {
    if (!Array.isArray(questions)) {
        return [];
    }

    return questions
        .filter((question) => question && question.question)
        .map((question, index) => ({
            _id: question._id,

            type:
                question.type || "multiple_choice",

            question: String(question.question).trim(),

            options: Array.isArray(question.options)
                ? question.options
                      .map((option) => String(option).trim())
                      .filter(Boolean)
                : [],

            correctAnswer:
                question.correctAnswer !== undefined
                    ? String(question.correctAnswer)
                    : "",

            marks:
                Number(question.marks) >= 0
                    ? Number(question.marks)
                    : 1,

            order:
                Number(question.order) || index + 1,
        }));
};


/**
 * Normalize assignment.
 */
const normalizeAssignment = (assignment = {}) => {
    return {
        enabled: Boolean(assignment.enabled),

        title:
            assignment.title !== undefined
                ? String(assignment.title).trim()
                : "",

        instructions:
            assignment.instructions !== undefined
                ? String(assignment.instructions)
                : "",

        passMark:
            Number.isFinite(Number(assignment.passMark))
                ? Number(assignment.passMark)
                : 80,

        questions: normalizeQuestions(
            assignment.questions || []
        ),
    };
};


/**
 * Normalize final examination.
 */
const normalizeFinalExam = (exam = {}) => {
    return {
        enabled: Boolean(exam.enabled),

        title:
            exam.title !== undefined
                ? String(exam.title).trim()
                : "Final Examination",

        instructions:
            exam.instructions !== undefined
                ? String(exam.instructions)
                : "",

        durationMinutes:
            Number.isFinite(Number(exam.durationMinutes))
                ? Number(exam.durationMinutes)
                : 0,

        passMark:
            Number.isFinite(Number(exam.passMark))
                ? Number(exam.passMark)
                : 80,

        questions: normalizeQuestions(
            exam.questions || []
        ),
    };
};


/**
 * Normalize the complete module structure.
 */
const normalizeModules = (modules = []) => {
    if (!Array.isArray(modules)) {
        return [];
    }

    return modules.map((module, moduleIndex) => ({
        _id: module._id,

        title:
            module.title !== undefined
                ? String(module.title).trim()
                : `Module ${moduleIndex + 1}`,

        description:
            module.description !== undefined
                ? String(module.description)
                : "",

        order:
            Number(module.order) || moduleIndex + 1,

        lessons: Array.isArray(module.lessons)
            ? module.lessons.map((lesson, lessonIndex) => {
                  let videoType =
                      lesson.video?.type || "none";

                  let videoUrl =
                      lesson.video?.url || "";

                  let videoFilename =
                      lesson.video?.filename || "";

                  /**
                   * Backward compatibility for old lesson.videoUrl.
                   */
                  if (
                      (!lesson.video ||
                          !lesson.video.type) &&
                      lesson.videoUrl
                  ) {
                      videoType = "upload";
                      videoUrl = lesson.videoUrl;
                      videoFilename = lesson.videoUrl;
                  }

                  if (
                      videoType === "external" &&
                      !isValidExternalVideoUrl(videoUrl)
                  ) {
                      throw new Error(
                          `Invalid external video URL in ${module.title}, Lesson ${lessonIndex + 1}.`
                      );
                  }

                  return {
                      _id: lesson._id,

                      title:
                          lesson.title !== undefined
                              ? String(lesson.title).trim()
                              : `Lesson ${lessonIndex + 1}`,

                      description:
                          lesson.description !== undefined
                              ? String(lesson.description)
                              : "",

                      duration:
                          Number(lesson.duration) || 0,

                      order:
                          Number(lesson.order) ||
                          lessonIndex + 1,

                      materials: Array.isArray(
                          lesson.materials
                      )
                          ? lesson.materials
                                .filter(
                                    (material) =>
                                        material &&
                                        material.filename
                                )
                                .map((material) => ({
                                    _id: material._id,

                                    type: material.type,

                                    title:
                                        material.title ||
                                        material.originalName ||
                                        "Course Material",

                                    filename:
                                        material.filename,

                                    originalName:
                                        material.originalName ||
                                        "",

                                    mimeType:
                                        material.mimeType ||
                                        "",

                                    size:
                                        Number(
                                            material.size
                                        ) || 0,

                                    uploadedAt:
                                        material.uploadedAt ||
                                        new Date(),
                                }))
                          : [],

                      video: {
                          type: videoType,

                          url: videoUrl,

                          filename:
                              videoFilename ||
                              (videoType === "upload"
                                  ? videoUrl
                                  : ""),

                          title:
                              lesson.video?.title ||
                              "",
                      },
                  };
              })
            : [],

        assignment: normalizeAssignment(
            module.assignment || {}
        ),
    }));
};


/**
 * Safely remove correct answers before sending exams/assignments
 * to students.
 */
const sanitizeQuestionsForStudent = (
    questions = []
) => {
    return questions.map((question) => {
        const questionObject =
            typeof question.toObject === "function"
                ? question.toObject()
                : { ...question };

        delete questionObject.correctAnswer;

        return questionObject;
    });
};


/**
 * Remove sensitive answer keys from course content.
 */
const sanitizeCourseContentForStudent = (course) => {
    const modules = getCourseModules(course);

    return modules.map((module) => ({
        _id: module._id,
        title: module.title,
        description: module.description,
        order: module.order,

        lessons: (module.lessons || []).map(
            (lesson) => ({
                _id: lesson._id,
                title: lesson.title,
                description: lesson.description,
                duration: lesson.duration,

                materials:
                    lesson.materials || [],

                video:
                    lesson.video || {
                        type: "none",
                        url: "",
                        filename: "",
                    },
            })
        ),

        assignment: module.assignment
            ? {
                  enabled:
                      module.assignment.enabled,

                  title:
                      module.assignment.title,

                  instructions:
                      module.assignment.instructions,

                  passMark:
                      module.assignment.passMark,

                  questions:
                      sanitizeQuestionsForStudent(
                          module.assignment.questions
                      ),
              }
            : null,
    }));
};


/**
 * Student-safe course overview.
 *
 * We deliberately do not expose the final exam answers.
 */
const sanitizeCourseOverviewForStudent = (course) => {
    const modules = getCourseModules(course);

    return modules.map((module) => ({
        _id: module._id,
        title: module.title,
        description: module.description,
        order: module.order,

        lessons: (module.lessons || []).map(
            (lesson) => ({
                _id: lesson._id,
                title: lesson.title,
                description: lesson.description,
                duration: lesson.duration,

                materialCount:
                    lesson.materials?.length || 0,

                hasVideo:
                    Boolean(
                        lesson.video &&
                            lesson.video.type !==
                                "none"
                    ),
            })
        ),

        assignment: module.assignment
            ? {
                  enabled:
                      module.assignment.enabled,

                  title:
                      module.assignment.title,

                  passMark:
                      module.assignment.passMark,

                  questionCount:
                      module.assignment.questions
                          ?.length || 0,
              }
            : null,
    }));
};


/**
 * Find a module.
 */
const findModule = (course, moduleId) => {
    if (
        !course.modules ||
        !Array.isArray(course.modules)
    ) {
        return null;
    }

    return course.modules.id(moduleId);
};


/**
 * Find a lesson.
 */
const findLesson = (
    course,
    moduleId,
    lessonId
) => {
    const module = findModule(
        course,
        moduleId
    );

    if (!module) {
        return {
            module: null,
            lesson: null,
        };
    }

    return {
        module,
        lesson: module.lessons.id(lessonId),
    };
};


/**
 * Check that the user has paid for the course.
 */
const requirePaidEnrollment = async (
    userId,
    courseId
) => {
    const enrollment =
        await Enrollment.findOne({
            student: userId,
            course: courseId,
            paymentStatus: "paid",
        });

    return enrollment;
};


/**
 * Refresh admin dashboard without breaking the main request
 * if dashboard broadcasting fails.
 */
const safeRefreshDashboard = async () => {
    try {
        if (
            typeof refreshAdminDashboard ===
            "function"
        ) {
            await refreshAdminDashboard();
        }
    } catch (error) {
        console.error(
            "Admin dashboard refresh error:",
            error.message
        );
    }
};


/**
 * ============================================================
 * GET ALL COURSES
 * ============================================================
 */
exports.getAllCourses = async (req, res) => {
    try {
        const isAdmin =
            req.user &&
            req.user.role === "admin";

        const query = isAdmin
            ? {}
            : { published: true };

        const courses =
            await Course.find(query).sort({
                createdAt: -1,
            });

        /**
         * Admin needs the complete structure so that
         * Manage Courses can show modules/material counts.
         */
        if (isAdmin) {
            return res.json(courses);
        }

        /**
         * Students receive a safe overview only.
         */
        const result = courses.map((course) => {
            const courseObject =
                course.toObject();

            return {
                ...courseObject,

                modules:
                    sanitizeCourseOverviewForStudent(
                        course
                    ),

                content: undefined,

                finalExam: course.finalExam
                    ? {
                          enabled:
                              course.finalExam
                                  .enabled,

                          title:
                              course.finalExam
                                  .title,

                          durationMinutes:
                              course.finalExam
                                  .durationMinutes,

                          passMark:
                              course.finalExam
                                  .passMark,

                          questionCount:
                              course.finalExam
                                  .questions
                                  ?.length ||
                              0,
                      }
                    : null,
            };
        });

        return res.json(result);
    } catch (error) {
        console.error(
            "getAllCourses error:",
            error
        );

        return res.status(500).json({
            message: "Failed to fetch courses.",
            error: error.message,
        });
    }
};


/**
 * ============================================================
 * GET SINGLE COURSE
 * ============================================================
 */
exports.getCourseById = async (
    req,
    res
) => {
    try {
        const course =
            await Course.findById(
                req.params.courseId
            );

        if (!course) {
            return res.status(404).json({
                message: "Course not found.",
            });
        }

        /**
         * ADMIN:
         *
         * Return everything.
         *
         * This is important because edit-course.tsx needs
         * modules, lessons and materials.
         */
        if (
            req.user &&
            req.user.role === "admin"
        ) {
            const courseObject =
                course.toObject();

            /**
             * If this is an old course, expose the converted
             * module structure to the admin UI.
             */
            if (
                (!courseObject.modules ||
                    courseObject.modules
                        .length === 0) &&
                courseObject.content?.length
            ) {
                courseObject.modules =
                    legacyContentToModules(
                        courseObject.content
                    );
            }

            return res.json(courseObject);
        }

        /**
         * STUDENT:
         *
         * Return overview only.
         */
        if (!course.published) {
            return res.status(404).json({
                message: "Course not found.",
            });
        }

        const enrollment =
            await Enrollment.findOne({
                student: req.user._id,
                course: course._id,
            });

        return res.json({
            _id: course._id,
            title: course.title,
            shortDescription:
                course.shortDescription,
            description: course.description,
            category: course.category,
            level: course.level,
            duration: course.duration,
            price: course.price,
            image: course.image,
            published: course.published,
            certificate: course.certificate,
            passMark: course.passMark,

            modules:
                sanitizeCourseOverviewForStudent(
                    course
                ),

            finalExam: course.finalExam
                ? {
                      enabled:
                          course.finalExam.enabled,

                      title:
                          course.finalExam.title,

                      instructions:
                          course.finalExam
                              .instructions,

                      durationMinutes:
                          course.finalExam
                              .durationMinutes,

                      passMark:
                          course.finalExam
                              .passMark,

                      questionCount:
                          course.finalExam
                              .questions?.length ||
                          0,
                  }
                : null,

            isEnrolled:
                Boolean(enrollment),

            paymentStatus:
                enrollment?.paymentStatus ||
                null,

            progress:
                enrollment?.progress || 0,
        });
    } catch (error) {
        console.error(
            "getCourseById error:",
            error
        );

        return res.status(500).json({
            message: "Failed to fetch course.",
            error: error.message,
        });
    }
};


/**
 * ============================================================
 * CREATE COURSE
 * ============================================================
 */
exports.createCourse = async (
    req,
    res
) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({
                message: "Admin only.",
            });
        }

        const {
            title,
            shortDescription,
            description,
            category,
            level,
            duration,
            modules,
            finalExam,
            published,
            certificate,
            passMark,
        } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({
                message:
                    "Course title is required.",
            });
        }

        if (!description || !description.trim()) {
            return res.status(400).json({
                message:
                    "Course description is required.",
            });
        }

        const allowedLevels = [
            "Beginner",
            "Intermediate",
            "Advanced",
        ];

        if (
            level &&
            !allowedLevels.includes(level)
        ) {
            return res.status(400).json({
                message:
                    "Invalid course level.",
            });
        }

        const normalizedModules =
            normalizeModules(modules || []);

        if (normalizedModules.length === 0) {
            return res.status(400).json({
                message:
                    "At least one module is required.",
            });
        }

        /**
         * Every module should have at least one lesson.
         */
        const emptyModule =
            normalizedModules.find(
                (module) =>
                    !module.lessons ||
                    module.lessons.length === 0
            );

        if (emptyModule) {
            return res.status(400).json({
                message:
                    `Module "${emptyModule.title}" must contain at least one lesson.`,
            });
        }

        const course =
            await Course.create({
                title: title.trim(),

                shortDescription:
                    shortDescription?.trim() || "",

                description:
                    description.trim(),

                category:
                    category?.trim() ||
                    "General",

                level:
                    level || "Beginner",

                duration:
                    Number(duration) || 0,

                /**
                 * FIXED COURSE PRICE
                 */
                price: 1200,

                published:
                    Boolean(published),

                certificate:
                    certificate !== undefined
                        ? Boolean(certificate)
                        : true,

                passMark:
                    Number.isFinite(
                        Number(passMark)
                    )
                        ? Number(passMark)
                        : 80,

                modules:
                    normalizedModules,

                finalExam:
                    normalizeFinalExam(
                        finalExam || {}
                    ),

                /**
                 * New courses no longer use legacy content.
                 */
                content: [],
            });

        await safeRefreshDashboard();

        return res.status(201).json({
            message:
                "Course created successfully.",
            course,
        });
    } catch (error) {
        console.error(
            "createCourse error:",
            error
        );

        return res.status(500).json({
            message: "Failed to create course.",
            error: error.message,
        });
    }
};


/**
 * ============================================================
 * UPDATE COURSE
 * ============================================================
 */
exports.updateCourse = async (
    req,
    res
) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({
                message: "Admin only.",
            });
        }

        const course =
            await Course.findById(
                req.params.courseId
            );

        if (!course) {
            return res.status(404).json({
                message: "Course not found.",
            });
        }

        const {
            title,
            shortDescription,
            description,
            category,
            level,
            duration,
            modules,
            finalExam,
            published,
            certificate,
            passMark,
        } = req.body;

        if (title !== undefined) {
            if (!String(title).trim()) {
                return res.status(400).json({
                    message:
                        "Course title cannot be empty.",
                });
            }

            course.title =
                String(title).trim();
        }

        if (
            shortDescription !== undefined
        ) {
            course.shortDescription =
                String(
                    shortDescription
                ).trim();
        }

        if (description !== undefined) {
            if (!String(description).trim()) {
                return res.status(400).json({
                    message:
                        "Course description cannot be empty.",
                });
            }

            course.description =
                String(description).trim();
        }

        if (category !== undefined) {
            course.category =
                String(category).trim();
        }

        if (level !== undefined) {
            const allowedLevels = [
                "Beginner",
                "Intermediate",
                "Advanced",
            ];

            if (
                !allowedLevels.includes(level)
            ) {
                return res.status(400).json({
                    message:
                        "Invalid course level.",
                });
            }

            course.level = level;
        }

        if (duration !== undefined) {
            course.duration =
                Number(duration) || 0;
        }

        /**
         * Course price is ALWAYS R1,200.
         */
        course.price = 1200;

        if (published !== undefined) {
            course.published =
                Boolean(published);
        }

        if (certificate !== undefined) {
            course.certificate =
                Boolean(certificate);
        }

        if (passMark !== undefined) {
            course.passMark =
                Number(passMark);
        }

        /**
         * NEW MODULE STRUCTURE
         */
        if (modules !== undefined) {
            const normalizedModules =
                normalizeModules(modules);

            if (
                normalizedModules.length === 0
            ) {
                return res.status(400).json({
                    message:
                        "At least one module is required.",
                });
            }

            const emptyModule =
                normalizedModules.find(
                    (module) =>
                        !module.lessons ||
                        module.lessons.length === 0
                );

            if (emptyModule) {
                return res.status(400).json({
                    message:
                        `Module "${emptyModule.title}" must contain at least one lesson.`,
                });
            }

            course.modules =
                normalizedModules;

            /**
             * Once the course is saved using the new
             * structure, the old content is no longer used.
             */
            course.content = [];
        }

        if (finalExam !== undefined) {
            course.finalExam =
                normalizeFinalExam(
                    finalExam
                );
        }

        await course.save();

        await safeRefreshDashboard();

        return res.json({
            message:
                "Course updated successfully.",
            course,
        });
    } catch (error) {
        console.error(
            "updateCourse error:",
            error
        );

        return res.status(500).json({
            message: "Failed to update course.",
            error: error.message,
        });
    }
};


/**
 * ============================================================
 * DELETE COURSE
 * ============================================================
 */
exports.deleteCourse = async (
    req,
    res
) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({
                message: "Admin only.",
            });
        }

        const course =
            await Course.findById(
                req.params.courseId
            );

        if (!course) {
            return res.status(404).json({
                message: "Course not found.",
            });
        }

        await Course.findByIdAndDelete(
            req.params.courseId
        );

        /**
         * Remove related unpaid/paid enrollments.
         *
         * We do NOT automatically delete Payment records because
         * financial records should remain available.
         */
        await Enrollment.deleteMany({
            course: req.params.courseId,
        });

        await safeRefreshDashboard();

        return res.json({
            message:
                "Course deleted successfully.",
        });
    } catch (error) {
        console.error(
            "deleteCourse error:",
            error
        );

        return res.status(500).json({
            message: "Failed to delete course.",
            error: error.message,
        });
    }
};


/**
 * ============================================================
 * PUBLISH COURSE
 * ============================================================
 */
exports.publishCourse = async (
    req,
    res
) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({
                message: "Admin only.",
            });
        }

        const course =
            await Course.findById(
                req.params.courseId
            );

        if (!course) {
            return res.status(404).json({
                message: "Course not found.",
            });
        }

        course.published = true;

        await course.save();

        await safeRefreshDashboard();

        return res.json({
            message:
                "Course published successfully.",
            course,
        });
    } catch (error) {
        console.error(
            "publishCourse error:",
            error
        );

        return res.status(500).json({
            message:
                "Failed to publish course.",
            error: error.message,
        });
    }
};


/**
 * ============================================================
 * UNPUBLISH COURSE
 * ============================================================
 */
exports.unpublishCourse = async (
    req,
    res
) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({
                message: "Admin only.",
            });
        }

        const course =
            await Course.findById(
                req.params.courseId
            );

        if (!course) {
            return res.status(404).json({
                message: "Course not found.",
            });
        }

        course.published = false;

        await course.save();

        await safeRefreshDashboard();

        return res.json({
            message:
                "Course unpublished successfully.",
            course,
        });
    } catch (error) {
        console.error(
            "unpublishCourse error:",
            error
        );

        return res.status(500).json({
            message:
                "Failed to unpublish course.",
            error: error.message,
        });
    }
};


/**
 * ============================================================
 * LEGACY ADD COURSE CONTENT
 * ============================================================
 *
 * Kept so that any older frontend call does not immediately
 * break.
 *
 * New frontend should use the complete modules structure.
 */
exports.addCourseContent = async (
    req,
    res
) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({
                message: "Admin only.",
            });
        }

        const course =
            await Course.findById(
                req.params.courseId
            );

        if (!course) {
            return res.status(404).json({
                message: "Course not found.",
            });
        }

        const {
            title,
            description,
            videoUrl,
            duration,
            order,
        } = req.body;

        if (!title) {
            return res.status(400).json({
                message:
                    "Lesson title is required.",
            });
        }

        /**
         * If the course has the new module structure,
         * add to Module 1.
         */
        if (
            course.modules &&
            course.modules.length > 0
        ) {
            const firstModule =
                course.modules[0];

            firstModule.lessons.push({
                title,
                description:
                    description || "",
                duration:
                    Number(duration) || 0,
                order:
                    Number(order) ||
                    firstModule.lessons
                        .length +
                        1,

                materials: [],

                video: {
                    type: videoUrl
                        ? "upload"
                        : "none",

                    url: videoUrl || "",

                    filename:
                        videoUrl || "",

                    title: "",
                },
            });
        } else {
            /**
             * Otherwise retain legacy behaviour.
             */
            course.content.push({
                title,
                description:
                    description || "",
                videoUrl:
                    videoUrl || "",
                duration:
                    Number(duration) || 0,
                order:
                    Number(order) ||
                    course.content.length +
                        1,
            });
        }

        await course.save();

        return res.status(201).json({
            message:
                "Lesson added successfully.",
            course,
        });
    } catch (error) {
        console.error(
            "addCourseContent error:",
            error
        );

        return res.status(500).json({
            message:
                "Failed to add course content.",
            error: error.message,
        });
    }
};


/**
 * ============================================================
 * UPLOAD LESSON VIDEO
 * ============================================================
 *
 * NEW ROUTE:
 *
 * /courses/:courseId/modules/:moduleId/lessons/:lessonId/video
 */
exports.uploadLessonVideo = async (
    req,
    res
) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({
                message: "Admin only.",
            });
        }

        if (!req.file) {
            return res.status(400).json({
                message:
                    "Please select a video file.",
            });
        }

        const course =
            await Course.findById(
                req.params.courseId
            );

        if (!course) {
            return res.status(404).json({
                message: "Course not found.",
            });
        }

        let module;
        let lesson;

        /**
         * New route.
         */
        if (req.params.moduleId) {
            const result = findLesson(
                course,
                req.params.moduleId,
                req.params.lessonId
            );

            module = result.module;
            lesson = result.lesson;
        } else {
            /**
             * Legacy route.
             */
            for (
                const possibleModule of course.modules ||
                []
            ) {
                const possibleLesson =
                    possibleModule.lessons.id(
                        req.params.lessonId
                    );

                if (possibleLesson) {
                    module =
                        possibleModule;

                    lesson =
                        possibleLesson;

                    break;
                }
            }
        }

        if (!module || !lesson) {
            return res.status(404).json({
                message:
                    "Module or lesson not found.",
            });
        }

        lesson.video = {
            type: "upload",

            url: req.file.filename,

            filename:
                req.file.filename,

            title:
                req.body.title ||
                req.file.originalname,
        };

        await course.save();

        await safeRefreshDashboard();

        return res.json({
            message:
                "Lesson video uploaded successfully.",

            video: lesson.video,

            course,
        });
    } catch (error) {
        console.error(
            "uploadLessonVideo error:",
            error
        );

        /**
         * Delete uploaded file if something failed after upload.
         */
        if (req.file?.path) {
            try {
                if (
                    fs.existsSync(
                        req.file.path
                    )
                ) {
                    fs.unlinkSync(
                        req.file.path
                    );
                }
            } catch (fileError) {
                console.error(
                    "Failed to remove uploaded video:",
                    fileError.message
                );
            }
        }

        return res.status(500).json({
            message:
                "Failed to upload lesson video.",
            error: error.message,
        });
    }
};


/**
 * ============================================================
 * UPLOAD LESSON MATERIAL
 * ============================================================
 *
 * Supports:
 *
 * - PDF
 * - Audio
 *
 * Multiple materials can be uploaded to the same lesson.
 */
exports.uploadLessonMaterial = async (
    req,
    res
) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({
                message: "Admin only.",
            });
        }

        if (!req.file) {
            return res.status(400).json({
                message:
                    "Please select a PDF or audio file.",
            });
        }

        const course =
            await Course.findById(
                req.params.courseId
            );

        if (!course) {
            return res.status(404).json({
                message: "Course not found.",
            });
        }

        const {
            module,
            lesson,
        } = findLesson(
            course,
            req.params.moduleId,
            req.params.lessonId
        );

        if (!module || !lesson) {
            return res.status(404).json({
                message:
                    "Module or lesson not found.",
            });
        }

        const extension = path
            .extname(
                req.file.originalname
            )
            .toLowerCase();

        const isPdf =
            req.file.mimetype ===
                "application/pdf" ||
            extension === ".pdf";

        const materialType = isPdf
            ? "pdf"
            : "audio";

        const material = {
            type: materialType,

            title:
                req.body.title ||
                req.file.originalname,

            filename:
                req.file.filename,

            originalName:
                req.file.originalname,

            mimeType:
                req.file.mimetype,

            size:
                req.file.size,

            uploadedAt: new Date(),
        };

        lesson.materials.push(
            material
        );

        await course.save();

        const savedMaterial =
            lesson.materials[
                lesson.materials.length - 1
            ];

        await safeRefreshDashboard();

        return res.status(201).json({
            message:
                "Course material uploaded successfully.",

            material: savedMaterial,

            courseId: course._id,

            moduleId: module._id,

            lessonId: lesson._id,
        });
    } catch (error) {
        console.error(
            "uploadLessonMaterial error:",
            error
        );

        /**
         * Delete physical file if database save failed.
         */
        if (req.file?.path) {
            try {
                if (
                    fs.existsSync(
                        req.file.path
                    )
                ) {
                    fs.unlinkSync(
                        req.file.path
                    );
                }
            } catch (fileError) {
                console.error(
                    "Failed to remove material file:",
                    fileError.message
                );
            }
        }

        return res.status(500).json({
            message:
                "Failed to upload course material.",
            error: error.message,
        });
    }
};


/**
 * ============================================================
 * DELETE LESSON MATERIAL
 * ============================================================
 */
exports.deleteLessonMaterial = async (
    req,
    res
) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({
                message: "Admin only.",
            });
        }

        const course =
            await Course.findById(
                req.params.courseId
            );

        if (!course) {
            return res.status(404).json({
                message: "Course not found.",
            });
        }

        const {
            module,
            lesson,
        } = findLesson(
            course,
            req.params.moduleId,
            req.params.lessonId
        );

        if (!module || !lesson) {
            return res.status(404).json({
                message:
                    "Module or lesson not found.",
            });
        }

        const material =
            lesson.materials.id(
                req.params.materialId
            );

        if (!material) {
            return res.status(404).json({
                message:
                    "Material not found.",
            });
        }

        const filename =
            material.filename;

        /**
         * Remove from MongoDB.
         */
        material.deleteOne();

        await course.save();

        /**
         * Remove physical file.
         */
        if (filename) {
            const materialPath =
                path.join(
                    __dirname,
                    "..",
                    "uploads",
                    "course-materials",
                    path.basename(
                        filename
                    )
                );

            try {
                if (
                    fs.existsSync(
                        materialPath
                    )
                ) {
                    fs.unlinkSync(
                        materialPath
                    );
                }
            } catch (fileError) {
                console.error(
                    "Failed to delete physical material:",
                    fileError.message
                );
            }
        }

        await safeRefreshDashboard();

        return res.json({
            message:
                "Course material deleted successfully.",
        });
    } catch (error) {
        console.error(
            "deleteLessonMaterial error:",
            error
        );

        return res.status(500).json({
            message:
                "Failed to delete course material.",
            error: error.message,
        });
    }
};


/**
 * ============================================================
 * ENROLL IN COURSE
 * ============================================================
 *
 * Enrollment remains pending until payment is approved.
 */
exports.enrollCourse = async (
    req,
    res
) => {
    try {
        if (req.user.role !== "student") {
            return res.status(403).json({
                message:
                    "Only students can enroll in courses.",
            });
        }

        const course =
            await Course.findById(
                req.params.courseId
            );

        if (!course) {
            return res.status(404).json({
                message: "Course not found.",
            });
        }

        if (!course.published) {
            return res.status(400).json({
                message:
                    "This course is not currently available.",
            });
        }

        let enrollment =
            await Enrollment.findOne({
                student: req.user._id,
                course: course._id,
            });

        if (enrollment) {
            return res.json({
                message:
                    "Enrollment already exists.",
                enrollment,
            });
        }

        enrollment =
            await Enrollment.create({
                student: req.user._id,
                course: course._id,
                paymentStatus: "pending",
                coursePrice: 1200,
            });

        return res.status(201).json({
            message:
                "Enrollment created. Payment is required.",
            enrollment,
        });
    } catch (error) {
        console.error(
            "enrollCourse error:",
            error
        );

        return res.status(500).json({
            message:
                "Failed to enroll in course.",
            error: error.message,
        });
    }
};


/**
 * ============================================================
 * GET COURSE CONTENT
 * ============================================================
 *
 * Full materials are only available after payment.
 */
exports.getCourseContent = async (
    req,
    res
) => {
    try {
        const course =
            await Course.findById(
                req.params.courseId
            );

        if (!course) {
            return res.status(404).json({
                message: "Course not found.",
            });
        }

        const enrollment =
            await requirePaidEnrollment(
                req.user._id,
                course._id
            );

        if (!enrollment) {
            return res.status(403).json({
                message:
                    "You must complete payment before accessing course content.",
            });
        }

        enrollment.lastAccessed =
            new Date();

        await enrollment.save();

        return res.json({
            course: {
                _id: course._id,
                title: course.title,
                description:
                    course.description,
                shortDescription:
                    course.shortDescription,
                category: course.category,
                level: course.level,
                duration: course.duration,
                certificate:
                    course.certificate,
                passMark:
                    course.passMark,
            },

            modules:
                sanitizeCourseContentForStudent(
                    course
                ),

            finalExam: course.finalExam
                ? {
                      enabled:
                          course.finalExam
                              .enabled,

                      title:
                          course.finalExam
                              .title,

                      instructions:
                          course.finalExam
                              .instructions,

                      durationMinutes:
                          course.finalExam
                              .durationMinutes,

                      passMark:
                          course.finalExam
                              .passMark,

                      questions:
                          sanitizeQuestionsForStudent(
                              course.finalExam
                                  .questions
                          ),
                  }
                : null,

            enrollment: {
                _id: enrollment._id,
                progress:
                    enrollment.progress,
                completed:
                    enrollment.completed,
                certificateIssued:
                    enrollment.certificateIssued,
                lastAccessed:
                    enrollment.lastAccessed,
            },
        });
    } catch (error) {
        console.error(
            "getCourseContent error:",
            error
        );

        return res.status(500).json({
            message:
                "Failed to fetch course content.",
            error: error.message,
        });
    }
};


/**
 * ============================================================
 * STREAM VIDEO
 * ============================================================
 *
 * Only students who paid for the course can access it.
 */
exports.streamVideo = async (
    req,
    res
) => {
    try {
        const course =
            await Course.findById(
                req.params.courseId
            );

        if (!course) {
            return res.status(404).json({
                message: "Course not found.",
            });
        }

        const enrollment =
            await requirePaidEnrollment(
                req.user._id,
                course._id
            );

        if (!enrollment) {
            return res.status(403).json({
                message:
                    "Payment required to access this video.",
            });
        }

        const filename =
            path.basename(
                req.params.filename
            );

        if (
            filename !==
            req.params.filename
        ) {
            return res.status(400).json({
                message:
                    "Invalid video filename.",
            });
        }

        /**
         * Make sure this video actually belongs to this
         * course.
         */
        const modules =
            getCourseModules(course);

        let videoBelongsToCourse =
            false;

        for (
            const module of modules
        ) {
            for (
                const lesson of module.lessons ||
                []
            ) {
                if (
                    lesson.video &&
                    lesson.video.type ===
                        "upload" &&
                    (
                        lesson.video.filename ===
                            filename ||
                        lesson.video.url ===
                            filename
                    )
                ) {
                    videoBelongsToCourse =
                        true;
                    break;
                }
            }

            if (videoBelongsToCourse) {
                break;
            }
        }

        if (!videoBelongsToCourse) {
            return res.status(404).json({
                message:
                    "Video does not belong to this course.",
            });
        }

        const videoPath =
            path.join(
                __dirname,
                "..",
                "uploads",
                "videos",
                filename
            );

        if (
            !fs.existsSync(videoPath)
        ) {
            return res.status(404).json({
                message:
                    "Video file not found.",
            });
        }

        const stat =
            fs.statSync(videoPath);

        const fileSize =
            stat.size;

        const range =
            req.headers.range;

        if (!range) {
            res.writeHead(200, {
                "Content-Length":
                    fileSize,

                "Content-Type":
                    "video/mp4",

                "Accept-Ranges":
                    "bytes",
            });

            fs.createReadStream(
                videoPath
            ).pipe(res);

            return;
        }

        const parts =
            range
                .replace(/bytes=/, "")
                .split("-");

        const start =
            parseInt(parts[0], 10);

        const end = parts[1]
            ? parseInt(parts[1], 10)
            : fileSize - 1;

        if (
            start >= fileSize ||
            end >= fileSize
        ) {
            res.status(416).send(
                "Requested range not satisfiable"
            );
            return;
        }

        const chunkSize =
            end - start + 1;

        const stream =
            fs.createReadStream(
                videoPath,
                {
                    start,
                    end,
                }
            );

        res.writeHead(206, {
            "Content-Range":
                `bytes ${start}-${end}/${fileSize}`,

            "Accept-Ranges":
                "bytes",

            "Content-Length":
                chunkSize,

            "Content-Type":
                "video/mp4",
        });

        stream.pipe(res);
    } catch (error) {
        console.error(
            "streamVideo error:",
            error
        );

        return res.status(500).json({
            message:
                "Failed to stream video.",
            error: error.message,
        });
    }
};


/**
 * ============================================================
 * STREAM / SERVE COURSE MATERIAL
 * ============================================================
 *
 * Protected PDF/audio access.
 */
exports.streamMaterial = async (
    req,
    res
) => {
    try {
        const course =
            await Course.findById(
                req.params.courseId
            );

        if (!course) {
            return res.status(404).json({
                message: "Course not found.",
            });
        }

        const enrollment =
            await requirePaidEnrollment(
                req.user._id,
                course._id
            );

        if (!enrollment) {
            return res.status(403).json({
                message:
                    "Payment required to access course materials.",
            });
        }

        const filename =
            path.basename(
                req.params.filename
            );

        if (
            filename !==
            req.params.filename
        ) {
            return res.status(400).json({
                message:
                    "Invalid material filename.",
            });
        }

        /**
         * Verify that this material actually belongs to the
         * requested course.
         */
        const modules =
            getCourseModules(course);

        let material = null;

        for (
            const module of modules
        ) {
            for (
                const lesson of module.lessons ||
                []
            ) {
                const found =
                    (lesson.materials ||
                        []
                    ).find(
                        (item) =>
                            item.filename ===
                            filename
                    );

                if (found) {
                    material = found;
                    break;
                }
            }

            if (material) break;
        }

        if (!material) {
            return res.status(404).json({
                message:
                    "Material does not belong to this course.",
            });
        }

        const materialPath =
            path.join(
                __dirname,
                "..",
                "uploads",
                "course-materials",
                filename
            );

        if (
            !fs.existsSync(
                materialPath
            )
        ) {
            return res.status(404).json({
                message:
                    "Material file not found.",
            });
        }

        const extension =
            path
                .extname(filename)
                .toLowerCase();

        let contentType =
            material.mimeType ||
            "application/octet-stream";

        if (extension === ".pdf") {
            contentType =
                "application/pdf";
        }

        if (
            extension === ".mp3"
        ) {
            contentType =
                "audio/mpeg";
        }

        if (
            extension === ".wav"
        ) {
            contentType =
                "audio/wav";
        }

        if (
            extension === ".m4a"
        ) {
            contentType =
                "audio/mp4";
        }

        if (
            extension === ".aac"
        ) {
            contentType =
                "audio/aac";
        }

        if (
            extension === ".ogg" ||
            extension === ".oga"
        ) {
            contentType =
                "audio/ogg";
        }

        if (
            extension === ".opus"
        ) {
            contentType =
                "audio/opus";
        }

        if (
            extension === ".flac"
        ) {
            contentType =
                "audio/flac";
        }

        const stat =
            fs.statSync(
                materialPath
            );

        res.writeHead(200, {
            "Content-Length":
                stat.size,

            "Content-Type":
                contentType,

            "Content-Disposition":
                "inline",

            "Cache-Control":
                "private, no-store",
        });

        fs.createReadStream(
            materialPath
        ).pipe(res);
    } catch (error) {
        console.error(
            "streamMaterial error:",
            error
        );

        return res.status(500).json({
            message:
                "Failed to access course material.",
            error: error.message,
        });
    }
};


/**
 * ============================================================
 * UPDATE PROGRESS
 * ============================================================
 *
 * Progress now counts lessons across ALL modules.
 */
exports.updateProgress = async (
    req,
    res
) => {
    try {
        const {
            lessonId,
        } = req.body;

        if (!lessonId) {
            return res.status(400).json({
                message:
                    "Lesson ID is required.",
            });
        }

        const course =
            await Course.findById(
                req.params.courseId
            );

        if (!course) {
            return res.status(404).json({
                message: "Course not found.",
            });
        }

        const enrollment =
            await requirePaidEnrollment(
                req.user._id,
                course._id
            );

        if (!enrollment) {
            return res.status(403).json({
                message:
                    "Payment required.",
            });
        }

        const modules =
            getCourseModules(course);

        /**
         * Verify lesson belongs to course.
         */
        let lessonExists = false;

        for (
            const module of modules
        ) {
            if (
                (module.lessons || []).some(
                    (lesson) =>
                        String(
                            lesson._id
                        ) ===
                        String(lessonId)
                )
            ) {
                lessonExists = true;
                break;
            }
        }

        if (!lessonExists) {
            return res.status(404).json({
                message:
                    "Lesson does not belong to this course.",
            });
        }

        /**
         * Add lesson only once.
         */
        const alreadyCompleted =
            enrollment.lessonsCompleted.some(
                (item) =>
                    String(
                        item.lessonId
                    ) ===
                    String(lessonId)
            );

        if (!alreadyCompleted) {
            enrollment.lessonsCompleted.push(
                {
                    lessonId,
                    completedAt:
                        new Date(),
                }
            );
        }

        const totalLessons =
            modules.reduce(
                (total, module) =>
                    total +
                    (
                        module.lessons ||
                        []
                    ).length,
                0
            );

        const completedLessons =
            enrollment
                .lessonsCompleted.length;

        const progress =
            totalLessons > 0
                ? Math.round(
                      (completedLessons /
                          totalLessons) *
                          100
                  )
                : 0;

        enrollment.progress =
            Math.min(
                progress,
                100
            );

        if (
            enrollment.progress >=
            100
        ) {
            enrollment.completed =
                true;

            enrollment.completedAt =
                new Date();

            if (
                !enrollment.certificateIssued
            ) {
                enrollment.certificateIssued =
                    false;
            }
        }

        enrollment.lastAccessed =
            new Date();

        await enrollment.save();

        return res.json({
            message:
                "Progress updated successfully.",

            progress:
                enrollment.progress,

            completed:
                enrollment.completed,

            totalLessons,

            completedLessons,
        });
    } catch (error) {
        console.error(
            "updateProgress error:",
            error
        );

        return res.status(500).json({
            message:
                "Failed to update progress.",
            error: error.message,
        });
    }
};


/**
 * ============================================================
 * ISSUE CERTIFICATE
 * ============================================================
 */
exports.issueCertificate = async (
    req,
    res
) => {
    try {
        const course =
            await Course.findById(
                req.params.courseId
            );

        if (!course) {
            return res.status(404).json({
                message: "Course not found.",
            });
        }

        const enrollment =
            await Enrollment.findOne({
                student: req.user._id,
                course: course._id,
                paymentStatus: "paid",
            }).populate(
                "student",
                "name email"
            );

        if (!enrollment) {
            return res.status(403).json({
                message:
                    "You are not enrolled in this course.",
            });
        }

        if (
            !enrollment.completed
        ) {
            return res.status(400).json({
                message:
                    "Complete the course before receiving a certificate.",
            });
        }

        if (
            !course.certificate
        ) {
            return res.status(400).json({
                message:
                    "This course does not issue a certificate.",
            });
        }

        if (
            !enrollment.certificateNumber
        ) {
            enrollment.certificateNumber =
                `NA-${Date.now()}-${Math.floor(
                    Math.random() * 100000
                )}`;

            enrollment.certificateIssued =
                true;

            await enrollment.save();
        }

        return res.json({
            message:
                "Certificate available.",

            certificateNumber:
                enrollment.certificateNumber,

            certificateIssued:
                enrollment.certificateIssued,
        });
    } catch (error) {
        console.error(
            "issueCertificate error:",
            error
        );

        return res.status(500).json({
            message:
                "Failed to issue certificate.",
            error: error.message,
        });
    }
};


/**
 * ============================================================
 * DOWNLOAD CERTIFICATE
 * ============================================================
 */
exports.downloadCertificate = async (
    req,
    res
) => {
    try {
        const course =
            await Course.findById(
                req.params.courseId
            );

        if (!course) {
            return res.status(404).json({
                message: "Course not found.",
            });
        }

        const enrollment =
            await Enrollment.findOne({
                student: req.user._id,
                course: course._id,
                paymentStatus: "paid",
            }).populate(
                "student",
                "name email"
            );

        if (!enrollment) {
            return res.status(403).json({
                message:
                    "You are not enrolled in this course.",
            });
        }

        if (
            !enrollment.completed
        ) {
            return res.status(400).json({
                message:
                    "Complete the course before downloading the certificate.",
            });
        }

        if (
            !course.certificate
        ) {
            return res.status(400).json({
                message:
                    "This course does not issue a certificate.",
            });
        }

        if (
            !enrollment.certificateNumber
        ) {
            enrollment.certificateNumber =
                `NA-${Date.now()}-${Math.floor(
                    Math.random() * 100000
                )}`;

            enrollment.certificateIssued =
                true;

            await enrollment.save();
        }

        const certificateNumber =
            enrollment.certificateNumber;

        const studentName =
            enrollment.student?.name ||
            "Student";

        /**
         * Generate QR code.
         */
        const verificationURL =
            `https://nakkyacademy.co.za/verify-certificate/${certificateNumber}`;

        const qrCode =
            await QRCode.toDataURL(
                verificationURL
            );

        const doc =
            new PDFDocument({
                size: "A4",
                layout: "landscape",
                margin: 50,
            });

        res.setHeader(
            "Content-Type",
            "application/pdf"
        );

        res.setHeader(
            "Content-Disposition",
            `attachment; filename="Nakky-Academy-Certificate-${certificateNumber}.pdf"`
        );

        doc.pipe(res);

        /**
         * Certificate heading.
         */
        doc
            .fontSize(30)
            .text(
                "NAKKY ACADEMY",
                {
                    align: "center",
                }
            );

        doc.moveDown(1);

        doc
            .fontSize(22)
            .text(
                "CERTIFICATE OF COMPLETION",
                {
                    align: "center",
                }
            );

        doc.moveDown(2);

        doc
            .fontSize(16)
            .text(
                "This certificate is proudly presented to",
                {
                    align: "center",
                }
            );

        doc.moveDown(1);

        doc
            .fontSize(28)
            .text(
                studentName,
                {
                    align: "center",
                }
            );

        doc.moveDown(1);

        doc
            .fontSize(16)
            .text(
                "for successfully completing",
                {
                    align: "center",
                }
            );

        doc.moveDown(1);

        doc
            .fontSize(22)
            .text(
                course.title,
                {
                    align: "center",
                }
            );

        doc.moveDown(2);

        doc
            .fontSize(12)
            .text(
                `Certificate Number: ${certificateNumber}`,
                {
                    align: "center",
                }
            );

        doc.moveDown(0.5);

        doc
            .fontSize(12)
            .text(
                `Date Issued: ${new Date().toLocaleDateString(
                    "en-ZA"
                )}`,
                {
                    align: "center",
                }
            );

        /**
         * QR code.
         */
        doc.image(
            qrCode,
            650,
            420,
            {
                width: 90,
            }
        );

        doc
            .fontSize(10)
            .text(
                "Scan to verify certificate",
                625,
                515,
                {
                    width: 140,
                    align: "center",
                }
            );

        doc.end();
    } catch (error) {
        console.error(
            "downloadCertificate error:",
            error
        );

        if (!res.headersSent) {
            return res.status(500).json({
                message:
                    "Failed to generate certificate.",
                error: error.message,
            });
        }
    }
};


/**
 * ============================================================
 * CREATE COURSE PAYMENT
 * ============================================================
 */
exports.createCoursePayment = async (
    req,
    res
) => {
    try {
        if (
            req.user.role !==
            "student"
        ) {
            return res.status(403).json({
                message:
                    "Only students can purchase courses.",
            });
        }

        const result =
            await paymentService.createCoursePayment(
                req.user,
                req.params.courseId
            );

        return res.status(201).json(
            result
        );
    } catch (error) {
        console.error(
            "createCoursePayment error:",
            error
        );

        return res.status(
            error.statusCode || 500
        ).json({
            message:
                error.message ||
                "Failed to create course payment.",
        });
    }
};


/**
 ============================================================
 * EXPORT HELPERS FOR TESTING / FUTURE USE
 * ============================================================
 */
exports._helpers = {
    getCourseModules,
    getTotalLessons,
    getTotalMaterials,
    normalizeModules,
    normalizeFinalExam,
};