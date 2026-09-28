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
                  /**
                   * ========================================================
                   * VIDEO NORMALIZATION
                   * ========================================================
                   *
                   * New structure:
                   *
                   * lesson.videos.uploaded
                   * lesson.videos.external
                   *
                   * Legacy structure:
                   *
                   * lesson.video
                   */

                  /**
                   * New uploaded video
                   */
                  let uploadedVideo = null;

                  if (
                      lesson.videos?.uploaded?.filename
                  ) {
                      uploadedVideo = {
                          filename:
                              lesson.videos.uploaded.filename,

                          title:
                              lesson.videos.uploaded.title ||
                              "",

                          uploadedAt:
                              lesson.videos.uploaded.uploadedAt ||
                              new Date(),
                      };
                  }

                  /**
                   * New external video
                   */
                  let externalVideo = null;

                  if (
                      lesson.videos?.external?.url
                  ) {
                      const externalUrl =
                          String(
                              lesson.videos.external.url
                          ).trim();

                      if (
                          !isValidExternalVideoUrl(
                              externalUrl
                          )
                      ) {
                          throw new Error(
                              `Invalid external video URL in ${module.title}, Lesson ${lessonIndex + 1}.`
                          );
                      }

                      externalVideo = {
                          url: externalUrl,

                          title:
                              lesson.videos.external.title ||
                              "",
                      };
                  }

                  /**
                   * ========================================================
                   * LEGACY COMPATIBILITY
                   * ========================================================
                   *
                   * Existing courses may still contain:
                   *
                   * lesson.video
                   */
                  if (
                      !uploadedVideo &&
                      !externalVideo &&
                      lesson.video
                  ) {
                      const legacyType =
                          lesson.video.type || "none";

                      const legacyUrl =
                          lesson.video.url || "";

                      const legacyFilename =
                          lesson.video.filename || "";

                      if (
                          legacyType === "upload" &&
                          legacyFilename
                      ) {
                          uploadedVideo = {
                              filename: legacyFilename,

                              title:
                                  lesson.video.title ||
                                  "",

                              uploadedAt:
                                  lesson.video.uploadedAt ||
                                  new Date(),
                          };
                      }

                      if (
                          legacyType === "external" &&
                          legacyUrl
                      ) {
                          if (
                              !isValidExternalVideoUrl(
                                  legacyUrl
                              )
                          ) {
                              throw new Error(
                                  `Invalid external video URL in ${module.title}, Lesson ${lessonIndex + 1}.`
                              );
                          }

                          externalVideo = {
                              url: legacyUrl,

                              title:
                                  lesson.video.title ||
                                  "",
                          };
                      }
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

                      /**
                       * New independent video structure
                       */
                      videos: {
                          uploaded: uploadedVideo,
                          external: externalVideo,
                      },

                      /**
                       * Legacy video representation.
                       *
                       * If an uploaded video exists, expose it here
                       * for older clients.
                       *
                       * Otherwise, if an external video exists, expose
                       * that here.
                       */
                      video: uploadedVideo
                          ? {
                                type: "upload",

                                url: uploadedVideo.filename,

                                filename:
                                    uploadedVideo.filename,

                                title:
                                    uploadedVideo.title || "",
                            }
                          : externalVideo
                          ? {
                                type: "external",

                                url: externalVideo.url,

                                filename: "",

                                title:
                                    externalVideo.title || "",
                            }
                          : {
                                type: "none",

                                url: "",

                                filename: "",

                                title: "",
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

                videos: lesson.videos || {
                    uploaded: null,
                    external: null,
                },

                /**
                 * Keep legacy video for older mobile clients.
                 */
                video:
                    lesson.video || {
                        type: "none",
                        url: "",
                        filename: "",
                        title: "",
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
                        lesson.videos?.uploaded?.filename ||
                        lesson.videos?.external?.url ||
                        (
                            lesson.video &&
                            lesson.video.type !==
                                "none"
                        )
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

        /**
         * ========================================================
         * SAVE UPLOADED VIDEO
         * ========================================================
         *
         * This ONLY changes the uploaded video.
         *
         * An existing external video link remains untouched.
         */
        lesson.videos = lesson.videos || {};

        lesson.videos.uploaded = {
            filename: req.file.filename,

            title:
                req.body.title ||
                req.file.originalname,

            uploadedAt: new Date(),
        };

        /**
         * Keep legacy video field synchronized so that
         * older mobile clients continue working.
         */
        lesson.video = {
            type: "upload",

            url: req.file.filename,

            filename: req.file.filename,

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

            videos: lesson.videos,

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
 * DELETE LESSON UPLOADED VIDEO
 * ============================================================
 *
 * Deletes ONLY the uploaded video.
 *
 * An external video link is left untouched.
 */
exports.deleteLessonVideo = async (
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
                message:
                    "Course not found.",
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

        /**
         * Find the uploaded video.
         */
        const filename =
            lesson.videos?.uploaded
                ?.filename ||
            (
                lesson.video?.type ===
                "upload"
                    ? lesson.video.filename
                    : ""
            );

        if (!filename) {
            return res.status(404).json({
                message:
                    "No uploaded video found.",
            });
        }

        /**
         * Remove physical video file.
         */
        const videoPath =
            path.join(
                __dirname,
                "..",
                "uploads",
                "videos",
                path.basename(
                    filename
                )
            );

        try {
            if (
                fs.existsSync(videoPath)
            ) {
                fs.unlinkSync(
                    videoPath
                );
            }
        } catch (fileError) {
            console.error(
                "Failed to delete physical video:",
                fileError.message
            );
        }

        /**
         * Remove uploaded video metadata.
         */
        if (lesson.videos) {
            lesson.videos.uploaded =
                null;
        }

        /**
         * Keep legacy field synchronized.
         *
         * IMPORTANT:
         *
         * If an external link exists,
         * the legacy field becomes external.
         *
         * Otherwise it becomes none.
         */
        if (
            lesson.videos?.external?.url
        ) {
            lesson.video = {
                type: "external",

                url:
                    lesson.videos
                        .external.url,

                filename: "",

                title:
                    lesson.videos
                        .external.title ||
                    "",
            };
        } else {
            lesson.video = {
                type: "none",

                url: "",

                filename: "",

                title: "",
            };
        }

        await course.save();

        await safeRefreshDashboard();

        return res.json({
            message:
                "Uploaded video deleted successfully.",

            courseId:
                course._id,

            moduleId:
                module._id,

            lessonId:
                lesson._id,
        });
    } catch (error) {
        console.error(
            "deleteLessonVideo error:",
            error
        );

        return res.status(500).json({
            message:
                "Failed to delete uploaded video.",
            error: error.message,
        });
    }
};


/**
 * ============================================================
 * DELETE EXTERNAL VIDEO LINK
 * ============================================================
 *
 * Deletes ONLY the external video link.
 *
 * An uploaded video is left untouched.
 */
exports.deleteExternalVideo = async (
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
                message:
                    "Course not found.",
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

        if (
            !lesson.videos?.external?.url
        ) {
            return res.status(404).json({
                message:
                    "No external video link found.",
            });
        }

        /**
         * Remove ONLY the external link.
         */
        lesson.videos.external = null;

        /**
         * Synchronize legacy field.
         *
         * If uploaded video still exists,
         * expose that as the legacy video.
         */
        if (
            lesson.videos?.uploaded?.filename
        ) {
            lesson.video = {
                type: "upload",

                url:
                    lesson.videos
                        .uploaded.filename,

                filename:
                    lesson.videos
                        .uploaded.filename,

                title:
                    lesson.videos
                        .uploaded.title ||
                    "",
            };
        } else {
            lesson.video = {
                type: "none",

                url: "",

                filename: "",

                title: "",
            };
        }

        await course.save();

        await safeRefreshDashboard();

        return res.json({
            message:
                "External video link deleted successfully.",
        });
    } catch (error) {
        console.error(
            "deleteExternalVideo error:",
            error
        );

        return res.status(500).json({
            message:
                "Failed to delete external video link.",
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

    console.log("======================================");
    console.log("MATERIAL UPLOAD REQUEST RECEIVED");
    console.log("Course ID:", req.params.courseId);
    console.log("Module ID:", req.params.moduleId);
    console.log("Lesson ID:", req.params.lessonId);
    console.log("File:", req.file);
    console.log("Body:", req.body);
    console.log("======================================");

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
 * COURSE PROGRESSION HELPERS
 * ============================================================
 */

/**
 * Check whether every lesson in a module has been completed.
 */
const areModuleLessonsCompleted = (
    module,
    enrollment
) => {
    const lessons = module.lessons || [];

    if (lessons.length === 0) {
        return true;
    }

    const completedLessonIds = new Set(
        (enrollment.lessonsCompleted || []).map(
            (item) => String(item.lessonId)
        )
    );

    return lessons.every((lesson) =>
        completedLessonIds.has(
            String(lesson._id)
        )
    );
};


/**
 * Get the student's assessment record for a module.
 */
const getModuleAssessmentRecord = (
    enrollment,
    moduleId
) => {
    return (
        enrollment.moduleAssessments || []
    ).find(
        (assessment) =>
            String(assessment.moduleId) ===
            String(moduleId)
    );
};


/**
 * Check whether a module's assignment requirement
 * has been satisfied.
 *
 * If there is no assignment, the requirement is
 * automatically satisfied.
 */
const isModuleAssignmentPassed = (
    module,
    enrollment
) => {
    if (!module.assignment?.enabled) {
        return true;
    }

    const assessment =
        getModuleAssessmentRecord(
            enrollment,
            module._id
        );

    return assessment?.status === "passed";
};


/**
 * Check whether all required module assignments
 * have been passed.
 */
const areAllModuleAssignmentsPassed = (
    modules,
    enrollment
) => {
    return modules.every((module) => {
        if (!module.assignment?.enabled) {
            return true;
        }

        return isModuleAssignmentPassed(
            module,
            enrollment
        );
    });
};

/**
 * ============================================================
 * LESSON LEARNING REQUIREMENTS
 * ============================================================
 *
 * Determines which learning items must be completed before
 * the student can mark a lesson as complete.
 *
 * Requirements:
 *
 * - Every PDF/audio material
 * - Uploaded video, if present
 * - External video, if present
 * ============================================================
 */
const getLessonRequirements = (
    course,
    lessonId
) => {
    const modules = getCourseModules(course);

    for (const module of modules) {
        const lesson = (module.lessons || []).find(
            (item) =>
                String(item._id) ===
                String(lessonId)
        );

        if (!lesson) {
            continue;
        }

        const materials =
            (lesson.materials || []).map(
                (material) => ({
                    materialId: material._id,
                    type: material.type,
                    title:
                        material.title ||
                        material.originalName ||
                        "Course Material",
                    filename:
                        material.filename,
                })
            );

        const uploadedVideo =
            lesson.videos?.uploaded?.filename ||
            (
                lesson.video?.type === "upload"
                    ? lesson.video.filename
                    : ""
            );

        const externalVideo =
            lesson.videos?.external?.url ||
            (
                lesson.video?.type === "external"
                    ? lesson.video.url
                    : ""
            );

        return {
            lessonId: lesson._id,

            materials,

            uploadedVideo: Boolean(
                uploadedVideo
            ),

            externalVideo: Boolean(
                externalVideo
            ),

            totalMaterials:
                materials.length,

            totalRequired:
                materials.length +
                (uploadedVideo ? 1 : 0) +
                (externalVideo ? 1 : 0),
        };
    }

    return null;
};


/**
 * ============================================================
 * GET STUDENT LESSON PROGRESS
 * ============================================================
 */
const getLessonProgress = (
    enrollment,
    lessonId
) => {
    const record =
        (enrollment.lessonProgress || []).find(
            (item) =>
                String(item.lessonId) ===
                String(lessonId)
        );

    if (!record) {
        return {
            lessonId,
            materialsCompleted: [],
            uploadedVideoCompleted: false,
            uploadedVideoCompletedAt: null,
            externalVideoCompleted: false,
            externalVideoCompletedAt: null,
        };
    }

    return record;
};


/**
 * ============================================================
 * CHECK LESSON REQUIREMENTS
 * ============================================================
 *
 * Returns true only when every required learning item
 * has been completed.
 * ============================================================
 */
const areLessonRequirementsCompleted = (
    requirements,
    progress
) => {
    if (!requirements) {
        return false;
    }

    /**
     * Check every PDF/audio material.
     */
    const completedMaterialIds =
        new Set(
            (progress.materialsCompleted || []).map(
                (item) =>
                    String(item.materialId)
            )
        );

    const allMaterialsCompleted =
        requirements.materials.every(
            (material) =>
                material.materialId &&
                completedMaterialIds.has(
                    String(material.materialId)
                )
        );

    /**
     * Check uploaded video.
     */
    const uploadedVideoCompleted =
        !requirements.uploadedVideo ||
        progress.uploadedVideoCompleted === true;

    /**
     * Check external video.
     */
    const externalVideoCompleted =
        !requirements.externalVideo ||
        progress.externalVideoCompleted === true;

    return (
        allMaterialsCompleted &&
        uploadedVideoCompleted &&
        externalVideoCompleted
    );
};


/**
 * ============================================================
 * FIND LESSON
 * ============================================================
 */
const findLessonById = (
    course,
    lessonId
) => {
    const modules = getCourseModules(course);

    for (const module of modules) {
        const lesson = (module.lessons || []).find(
            (item) =>
                String(item._id) ===
                String(lessonId)
        );

        if (lesson) {
            return {
                module,
                lesson,
            };
        }
    }

    return {
        module: null,
        lesson: null,
    };
};

/**
 * ============================================================
 * GET COURSE CONTENT
 * ============================================================
 *
 * Full materials are only available after payment.
 *
 * Progression rules:
 *
 * 1. First module is unlocked.
 * 2. Lessons unlock sequentially.
 * 3. All lessons in a module must be completed before
 *    its assignment becomes available.
 * 4. If a module has an assignment, the assignment must
 *    be passed before the next module unlocks.
 * 5. If a module has no assignment, completing its lessons
 *    is enough to unlock the next module.
 * 6. Final exam requires all required modules/assignments
 *    to be completed.
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
                message:
                    "Course not found.",
            });
        }

        // ----------------------------------------------------
        // CHECK PAID ENROLLMENT
        // ----------------------------------------------------

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

        // ----------------------------------------------------
        // GET MODULES
        // ----------------------------------------------------

        const modules =
            getCourseModules(course);

        // ----------------------------------------------------
        // COMPLETED LESSON IDS
        // ----------------------------------------------------

        const completedLessonIds =
            new Set(
                (
                    enrollment.lessonsCompleted ||
                    []
                ).map(
                    (item) =>
                        String(
                            item.lessonId
                        )
                )
            );

        // ----------------------------------------------------
        // MODULE PROGRESSION
        // ----------------------------------------------------

        const processedModules = [];

        for (
            let moduleIndex = 0;
            moduleIndex < modules.length;
            moduleIndex++
        ) {
            const module =
                modules[moduleIndex];

            const lessons =
                module.lessons || [];

            // ------------------------------------------------
            // ARE ALL LESSONS COMPLETE?
            // ------------------------------------------------

            const lessonsCompleted =
                areModuleLessonsCompleted(
                    module,
                    enrollment
                );

            // ------------------------------------------------
            // ASSIGNMENT
            // ------------------------------------------------

            const assignmentEnabled =
                module.assignment?.enabled ===
                true;

            const assessmentRecord =
                getModuleAssessmentRecord(
                    enrollment,
                    module._id
                );

            const assignmentStatus =
                assignmentEnabled
                    ? assessmentRecord?.status ||
                      "not_started"
                    : "not_required";

            // ------------------------------------------------
            // DETERMINE WHETHER MODULE IS UNLOCKED
            // ------------------------------------------------

            let moduleUnlocked = false;

            if (moduleIndex === 0) {
                /**
                 * First module is always available.
                 */
                moduleUnlocked = true;
            } else {
                /**
                 * Previous module controls access
                 * to this module.
                 */
                const previousModule =
                    modules[
                        moduleIndex - 1
                    ];

                const previousLessonsCompleted =
                    areModuleLessonsCompleted(
                        previousModule,
                        enrollment
                    );

                const previousAssignmentPassed =
                    isModuleAssignmentPassed(
                        previousModule,
                        enrollment
                    );

                moduleUnlocked =
                    previousLessonsCompleted &&
                    previousAssignmentPassed;
            }

            // ------------------------------------------------
            // PROCESS LESSONS
            // ------------------------------------------------

            const processedLessons =
                lessons.map(
                    (
                        lesson,
                        lessonIndex
                    ) => {
                        const completed =
                            completedLessonIds.has(
                                String(
                                    lesson._id
                                )
                            );

                        let lessonUnlocked =
                            false;

                        if (
                            !moduleUnlocked
                        ) {
                            lessonUnlocked =
                                false;
                        } else if (
                            lessonIndex === 0
                        ) {
                            /**
                             * First lesson of an
                             * unlocked module.
                             */
                            lessonUnlocked =
                                true;
                        } else {
                            /**
                             * Every other lesson requires
                             * the previous lesson to be
                             * completed.
                             */
                            const previousLesson =
                                lessons[
                                    lessonIndex -
                                        1
                                ];

                            lessonUnlocked =
                                completedLessonIds.has(
                                    String(
                                        previousLesson._id
                                    )
                                );
                        }

                        const lessonProgress =
                            getLessonProgress(
                                enrollment,
                                lesson._id
                            );

                        const lessonRequirements =
                            getLessonRequirements(
                                course,
                                lesson._id
                            );

                        const learningItemsCompleted =
                            areLessonRequirementsCompleted(
                                lessonRequirements,
                                lessonProgress
                            );

                        return {
                            _id:
                                lesson._id,

                            title:
                                lesson.title,

                            description:
                                lesson.description,

                            duration:
                                lesson.duration,

                            completed,

                            learningItemsCompleted,

                            learningProgress:
                                lessonProgress,

                            learningRequirements:
                                lessonRequirements,

                            unlocked:
                                lessonUnlocked,

                            materials:
                                lesson.materials ||
                                [],

                            videos:
                                lesson.videos || {
                                    uploaded:
                                        null,

                                    external:
                                        null,
                                },

                            /**
                             * Legacy video support.
                             */
                            video:
                                lesson.video || {
                                    type: "none",

                                    url: "",

                                    filename:
                                        "",

                                    title: "",
                                },
                        };
                    }
                );

            // ------------------------------------------------
            // ASSIGNMENT AVAILABILITY
            // ------------------------------------------------

            const assignmentAvailable =
                assignmentEnabled &&
                moduleUnlocked &&
                lessonsCompleted &&
                assignmentStatus !==
                    "passed";

            // ------------------------------------------------
            // MODULE COMPLETION
            // ------------------------------------------------

            const moduleCompleted =
                lessonsCompleted &&
                (
                    !assignmentEnabled ||
                    assignmentStatus ===
                        "passed"
                );

            // ------------------------------------------------
            // SAFE ASSIGNMENT FOR STUDENT
            // ------------------------------------------------

            const assignment =
                module.assignment
                    ? {
                          enabled:
                              module.assignment
                                  .enabled,

                          title:
                              module.assignment
                                  .title,

                          instructions:
                              module.assignment
                                  .instructions,

                          passMark:
                              module.assignment
                                  .passMark,

                          questions:
                              sanitizeQuestionsForStudent(
                                  module
                                      .assignment
                                      .questions
                              ),
                      }
                    : null;

            processedModules.push({
                _id: module._id,

                title: module.title,

                description:
                    module.description,

                order: module.order,

                lessons:
                    processedLessons,

                assignment,

                /**
                 * ------------------------------------------
                 * PROGRESSION INFORMATION
                 * ------------------------------------------
                 */
                progression: {
                    moduleIndex,

                    unlocked:
                        moduleUnlocked,

                    lessonsCompleted,

                    lessonsTotal:
                        lessons.length,

                    assignmentEnabled,

                    assignmentStatus,

                    assignmentAvailable,

                    moduleCompleted,

                    attempts:
                        assessmentRecord?.attempts ||
                        0,

                    percentage:
                        assessmentRecord?.percentage ||
                        0,
                },
            });
        }

        // ----------------------------------------------------
        // CHECK ALL MODULES
        // ----------------------------------------------------

        const allModulesCompleted =
            processedModules.length > 0 &&
            processedModules.every(
                (module) =>
                    module.progression
                        .moduleCompleted
            );

        // ----------------------------------------------------
        // FINAL EXAM
        // ----------------------------------------------------

        const finalExamEnabled =
            course.finalExam?.enabled ===
            true;

        const finalExamStatus =
            enrollment.finalExamStatus ||
            "not_started";

        const finalExamUnlocked =
            finalExamEnabled &&
            allModulesCompleted;

        // ----------------------------------------------------
        // COURSE COMPLETION
        // ----------------------------------------------------

        /**
         * IMPORTANT:
         *
         * We no longer mark a course complete merely
         * because lesson progress reached 100%.
         *
         * If there is a final exam, the final exam must
         * be passed.
         *
         * If there is no final exam, all required modules
         * must be completed.
         */
        const courseCompleted =
            finalExamEnabled
                ? finalExamStatus ===
                  "passed"
                : allModulesCompleted;

        // ----------------------------------------------------
        // UPDATE ENROLLMENT COMPLETION
        // ----------------------------------------------------

        if (
            enrollment.completed !==
            courseCompleted
        ) {
            enrollment.completed =
                courseCompleted;

            enrollment.completedAt =
                courseCompleted
                    ? new Date()
                    : null;
        }

        enrollment.lastAccessed =
            new Date();

        await enrollment.save();

        // ----------------------------------------------------
        // LESSON PROGRESS
        // ----------------------------------------------------

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
            enrollment.lessonsCompleted
                ?.length || 0;

        const progress =
            totalLessons > 0
                ? Math.min(
                      100,
                      Math.round(
                          (
                              completedLessons /
                              totalLessons
                          ) * 100
                      )
                  )
                : 0;

        /**
         * Keep the stored progress synchronized.
         */
        if (
            enrollment.progress !==
            progress
        ) {
            enrollment.progress =
                progress;

            await enrollment.save();
        }

        // ----------------------------------------------------
        // RESPONSE
        // ----------------------------------------------------

        return res.json({
            course: {
                _id: course._id,

                title: course.title,

                description:
                    course.description,

                shortDescription:
                    course.shortDescription,

                category:
                    course.category,

                level:
                    course.level,

                duration:
                    course.duration,

                certificate:
                    course.certificate,

                passMark:
                    course.passMark,
            },

            modules:
                processedModules,

            // ------------------------------------------------
            // FINAL EXAM
            // ------------------------------------------------

            finalExam:
                course.finalExam
                    ? {
                          enabled:
                              course
                                  .finalExam
                                  .enabled,

                          title:
                              course
                                  .finalExam
                                  .title,

                          instructions:
                              course
                                  .finalExam
                                  .instructions,

                          durationMinutes:
                              course
                                  .finalExam
                                  .durationMinutes,

                          passMark:
                              course
                                  .finalExam
                                  .passMark,

                          questions:
                              sanitizeQuestionsForStudent(
                                  course
                                      .finalExam
                                      .questions
                              ),

                          progression: {
                              enabled:
                                  finalExamEnabled,

                              unlocked:
                                  finalExamUnlocked,

                              status:
                                  finalExamStatus,

                              attempts:
                                  enrollment
                                      .finalExamAttempts ||
                                  0,

                              percentage:
                                  enrollment
                                      .finalExamPercentage ||
                                  0,

                              passed:
                                  finalExamStatus ===
                                  "passed",
                          },
                      }
                    : null,

            // ------------------------------------------------
            // ENROLLMENT
            // ------------------------------------------------

            enrollment: {
                _id:
                    enrollment._id,

                progress:
                    enrollment.progress,

                completed:
                    enrollment.completed,

                completedAt:
                    enrollment.completedAt,

                lessonsCompleted:
                    enrollment
                        .lessonsCompleted ||
                    [],

                lessonProgress:
                    enrollment
                        .lessonProgress ||
                    [],

                moduleAssessments:
                    enrollment
                        .moduleAssessments ||
                    [],

                finalExamStatus:
                    enrollment
                        .finalExamStatus ||
                    "not_started",

                finalExamAttempts:
                    enrollment
                        .finalExamAttempts ||
                    0,

                finalExamPercentage:
                    enrollment
                        .finalExamPercentage ||
                    0,

                certificateIssued:
                    enrollment
                        .certificateIssued,

                certificateNumber:
                    enrollment
                        .certificateNumber ||
                    null,

                lastAccessed:
                    enrollment
                        .lastAccessed,
            },

            // ------------------------------------------------
            // OVERALL PROGRESSION
            // ------------------------------------------------

            progression: {
                allModulesCompleted,

                finalExamEnabled,

                finalExamUnlocked,

                finalExamStatus,

                courseCompleted,
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
                const uploadedFilename =
                    lesson.videos?.uploaded
                        ?.filename ||
                    (
                        lesson.video?.type ===
                        "upload"
                            ? lesson.video.filename
                            : ""
                    );

                if (
                    uploadedFilename ===
                    filename
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
 * COMPLETE LESSON MATERIAL
 * ============================================================
 *
 * Records that a student has completed a PDF or audio
 * learning material.
 *
 * The student must have paid for the course.
 * ============================================================
 */
exports.completeLessonMaterial = async (
    req,
    res
) => {
    try {
        const {
            lessonId,
            materialId,
        } = req.body;

        if (!lessonId || !materialId) {
            return res.status(400).json({
                message:
                    "Lesson ID and material ID are required.",
            });
        }

        const course =
            await Course.findById(
                req.params.courseId
            );

        if (!course) {
            return res.status(404).json({
                message:
                    "Course not found.",
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

        const { lesson } =
            findLessonById(
                course,
                lessonId
            );

        if (!lesson) {
            return res.status(404).json({
                message:
                    "Lesson does not belong to this course.",
            });
        }

        const material =
            (lesson.materials || []).find(
                (item) =>
                    String(item._id) ===
                    String(materialId)
            );

        if (!material) {
            return res.status(404).json({
                message:
                    "Material does not belong to this lesson.",
            });
        }

        /**
         * Find or create lesson progress record.
         */
        let lessonProgress =
            enrollment.lessonProgress.find(
                (item) =>
                    String(item.lessonId) ===
                    String(lessonId)
            );

        if (!lessonProgress) {
            enrollment.lessonProgress.push({
                lessonId: lesson._id,
                materialsCompleted: [],
                uploadedVideoCompleted: false,
                externalVideoCompleted: false,
            });

            lessonProgress =
                enrollment.lessonProgress[
                    enrollment.lessonProgress.length - 1
                ];
        }

        /**
         * Do not create duplicate completion records.
         */
        const alreadyCompleted =
            lessonProgress.materialsCompleted.some(
                (item) =>
                    String(item.materialId) ===
                    String(materialId)
            );

        if (!alreadyCompleted) {
            lessonProgress.materialsCompleted.push({
                materialId: material._id,
                completedAt: new Date(),
            });
        }

        enrollment.lastAccessed =
            new Date();

        await enrollment.save();

        const requirements =
            getLessonRequirements(
                course,
                lessonId
            );

        const updatedProgress =
            getLessonProgress(
                enrollment,
                lessonId
            );

        const allCompleted =
            areLessonRequirementsCompleted(
                requirements,
                updatedProgress
            );

        return res.json({
            message:
                "Learning material marked as completed.",

            lessonId,

            materialId,

            allLearningItemsCompleted:
                allCompleted,

            lessonProgress:
                updatedProgress,
        });
    } catch (error) {
        console.error(
            "completeLessonMaterial error:",
            error
        );

        return res.status(500).json({
            message:
                "Failed to update material progress.",
            error: error.message,
        });
    }
};


/**
 * ============================================================
 * COMPLETE LESSON VIDEO
 * ============================================================
 *
 * Records completion of either:
 *
 * - uploaded video
 * - external video
 *
 * The student must have paid for the course.
 * ============================================================
 */
exports.completeLessonVideo = async (
    req,
    res
) => {
    try {
        const {
            lessonId,
            videoType,
        } = req.body;

        if (!lessonId || !videoType) {
            return res.status(400).json({
                message:
                    "Lesson ID and video type are required.",
            });
        }

        if (
            ![
                "uploaded",
                "external",
            ].includes(videoType)
        ) {
            return res.status(400).json({
                message:
                    "Invalid video type.",
            });
        }

        const course =
            await Course.findById(
                req.params.courseId
            );

        if (!course) {
            return res.status(404).json({
                message:
                    "Course not found.",
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

        const { lesson } =
            findLessonById(
                course,
                lessonId
            );

        if (!lesson) {
            return res.status(404).json({
                message:
                    "Lesson does not belong to this course.",
            });
        }

        /**
         * Verify that the requested video actually exists.
         */
        const hasUploadedVideo =
            Boolean(
                lesson.videos?.uploaded?.filename ||
                (
                    lesson.video?.type === "upload" &&
                    lesson.video?.filename
                )
            );

        const hasExternalVideo =
            Boolean(
                lesson.videos?.external?.url ||
                (
                    lesson.video?.type === "external" &&
                    lesson.video?.url
                )
            );

        if (
            videoType === "uploaded" &&
            !hasUploadedVideo
        ) {
            return res.status(404).json({
                message:
                    "This lesson does not have an uploaded video.",
            });
        }

        if (
            videoType === "external" &&
            !hasExternalVideo
        ) {
            return res.status(404).json({
                message:
                    "This lesson does not have an external video.",
            });
        }

        /**
         * Find or create lesson progress.
         */
        let lessonProgress =
            enrollment.lessonProgress.find(
                (item) =>
                    String(item.lessonId) ===
                    String(lessonId)
            );

        if (!lessonProgress) {
            enrollment.lessonProgress.push({
                lessonId: lesson._id,
                materialsCompleted: [],
                uploadedVideoCompleted: false,
                externalVideoCompleted: false,
            });

            lessonProgress =
                enrollment.lessonProgress[
                    enrollment.lessonProgress.length - 1
                ];
        }

        /**
         * Record video completion.
         */
        if (videoType === "uploaded") {
            lessonProgress.uploadedVideoCompleted =
                true;

            lessonProgress.uploadedVideoCompletedAt =
                new Date();
        }

        if (videoType === "external") {
            lessonProgress.externalVideoCompleted =
                true;

            lessonProgress.externalVideoCompletedAt =
                new Date();
        }

        enrollment.lastAccessed =
            new Date();

        await enrollment.save();

        const requirements =
            getLessonRequirements(
                course,
                lessonId
            );

        const updatedProgress =
            getLessonProgress(
                enrollment,
                lessonId
            );

        const allCompleted =
            areLessonRequirementsCompleted(
                requirements,
                updatedProgress
            );

        return res.json({
            message:
                "Video marked as completed.",

            lessonId,

            videoType,

            allLearningItemsCompleted:
                allCompleted,

            lessonProgress:
                updatedProgress,
        });
    } catch (error) {
        console.error(
            "completeLessonVideo error:",
            error
        );

        return res.status(500).json({
            message:
                "Failed to update video progress.",
            error: error.message,
        });
    }
};


/**
 * ============================================================
 * UPDATE PROGRESS
 * ============================================================
 *
 * A lesson can only be marked as completed after ALL required
 * learning items have been completed:
 *
 * - PDF materials
 * - Audio materials
 * - Uploaded video
 * - External video
 *
 * The validation is performed on the backend so that lesson
 * progression cannot be bypassed from the mobile application.
 * ============================================================
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

        /**
         * ----------------------------------------------------
         * FIND COURSE
         * ----------------------------------------------------
         */

        const course =
            await Course.findById(
                req.params.courseId
            );

        if (!course) {
            return res.status(404).json({
                message:
                    "Course not found.",
            });
        }

        /**
         * ----------------------------------------------------
         * REQUIRE PAID ENROLLMENT
         * ----------------------------------------------------
         */

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

        /**
         * ----------------------------------------------------
         * FIND LESSON
         * ----------------------------------------------------
         */

        const {
            lesson,
        } = findLessonById(
            course,
            lessonId
        );

        if (!lesson) {
            return res.status(404).json({
                message:
                    "Lesson does not belong to this course.",
            });
        }

        /**
         * ----------------------------------------------------
         * CHECK ALL LEARNING REQUIREMENTS
         * ----------------------------------------------------
         *
         * A lesson cannot be completed until every required
         * material and video has been completed.
         */

        const requirements =
            getLessonRequirements(
                course,
                lessonId
            );

        const lessonProgress =
            getLessonProgress(
                enrollment,
                lessonId
            );

        const allLearningItemsCompleted =
            areLessonRequirementsCompleted(
                requirements,
                lessonProgress
            );

        if (!allLearningItemsCompleted) {
            return res.status(400).json({
                message:
                    "Please complete all required learning materials and videos before completing this lesson.",

                lessonCompleted:
                    false,

                allLearningItemsCompleted:
                    false,

                lessonProgress:
                    lessonProgress,

                learningRequirements:
                    requirements,
            });
        }

        /**
         * ----------------------------------------------------
         * ADD LESSON TO COMPLETED LESSONS
         * ----------------------------------------------------
         */

        const alreadyCompleted =
            enrollment.lessonsCompleted.some(
                (item) =>
                    String(item.lessonId) ===
                    String(lessonId)
            );

        if (!alreadyCompleted) {
            enrollment.lessonsCompleted.push({
                lessonId:
                    lesson._id,

                completedAt:
                    new Date(),
            });
        }

        /**
         * ----------------------------------------------------
         * CALCULATE COURSE LESSON PROGRESS
         * ----------------------------------------------------
         */

        const modules =
            getCourseModules(course);

        const totalLessons =
            modules.reduce(
                (
                    total,
                    module
                ) =>
                    total +
                    (
                        module.lessons ||
                        []
                    ).length,
                0
            );

        const completedLessons =
            enrollment.lessonsCompleted.length;

        const progress =
            totalLessons > 0
                ? Math.round(
                      (
                          completedLessons /
                          totalLessons
                      ) * 100
                  )
                : 0;

        enrollment.progress =
            Math.min(
                progress,
                100
            );

        /**
         * ----------------------------------------------------
         * COURSE COMPLETION
         * ----------------------------------------------------
         *
         * Completing all lessons does NOT automatically issue
         * a certificate or complete the course.
         *
         * Module assignments and the final exam continue to
         * control actual course completion.
         */

        enrollment.lastAccessed =
            new Date();

        await enrollment.save();

        /**
         * ----------------------------------------------------
         * RESPONSE
         * ----------------------------------------------------
         */

        return res.json({
            message:
                "Lesson completed successfully.",

            lessonId:
                lesson._id,

            progress:
                enrollment.progress,

            completed:
                enrollment.completed,

            lessonCompleted:
                true,

            allLearningItemsCompleted:
                true,

            totalLessons,

            completedLessons,

            lessonProgress:
                getLessonProgress(
                    enrollment,
                    lessonId
                ),
        });
    } catch (error) {
        console.error(
            "updateProgress error:",
            error
        );

        return res.status(500).json({
            message:
                "Failed to update progress.",

            error:
                error.message,
        });
    }
};

/**
 * ============================================================
 * CERTIFICATE ELIGIBILITY
 * ============================================================
 *
 * A student is eligible for a certificate only when:
 *
 * 1. They have a paid enrollment.
 * 2. Every module's lessons are completed.
 * 3. Every enabled module assignment is passed.
 * 4. If a final exam is enabled, it is passed.
 */
const checkCertificateEligibility = (
    course,
    enrollment
) => {
    const modules =
        getCourseModules(course);

    // --------------------------------------------------------
    // CHECK ALL MODULES
    // --------------------------------------------------------

    for (const module of modules) {
        const lessons =
            module.lessons || [];

        const lessonsCompleted =
            areModuleLessonsCompleted(
                module,
                enrollment
            );

        if (!lessonsCompleted) {
            return {
                eligible: false,
                reason:
                    `All lessons in "${module.title}" must be completed.`,
            };
        }

        // ----------------------------------------------------
        // CHECK MODULE ASSIGNMENT
        // ----------------------------------------------------

        if (
            module.assignment?.enabled
        ) {
            const assessment =
                getModuleAssessmentRecord(
                    enrollment,
                    module._id
                );

            if (
                !assessment ||
                assessment.status !==
                    "passed"
            ) {
                return {
                    eligible: false,
                    reason:
                        `The assignment for "${module.title}" must be passed.`,
                };
            }
        }
    }

    // --------------------------------------------------------
    // CHECK FINAL EXAM
    // --------------------------------------------------------

    if (
        course.finalExam?.enabled
    ) {
        if (
            enrollment.finalExamStatus !==
            "passed"
        ) {
            return {
                eligible: false,
                reason:
                    "The final exam must be passed before a certificate can be issued.",
            };
        }
    }

    return {
        eligible: true,
        reason: null,
    };
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
                message:
                    "Course not found.",
            });
        }

        // ----------------------------------------------------
        // FIND PAID ENROLLMENT
        // ----------------------------------------------------

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

        // ----------------------------------------------------
        // CHECK WHETHER COURSE ISSUES CERTIFICATES
        // ----------------------------------------------------

        if (!course.certificate) {
            return res.status(400).json({
                message:
                    "This course does not issue a certificate.",
            });
        }

        // ----------------------------------------------------
        // CHECK ACTUAL COURSE REQUIREMENTS
        // ----------------------------------------------------

        const eligibility =
            checkCertificateEligibility(
                course,
                enrollment
            );

        if (!eligibility.eligible) {
            return res.status(400).json({
                message:
                    eligibility.reason,
            });
        }

        // ----------------------------------------------------
        // MARK COURSE COMPLETE
        // ----------------------------------------------------

        if (!enrollment.completed) {
            enrollment.completed =
                true;

            enrollment.completedAt =
                enrollment.completedAt ||
                new Date();
        }

        // ----------------------------------------------------
        // GENERATE CERTIFICATE NUMBER
        // ----------------------------------------------------

        if (
            !enrollment.certificateNumber
        ) {
            enrollment.certificateNumber =
                `NA-${Date.now()}-${Math.floor(
                    Math.random() * 100000
                )}`;
        }

        enrollment.certificateIssued =
            true;

        await enrollment.save();

        // ----------------------------------------------------
        // RESPONSE
        // ----------------------------------------------------

        return res.json({
            message:
                "Certificate available.",

            certificateNumber:
                enrollment.certificateNumber,

            certificateIssued:
                enrollment.certificateIssued,

            completed:
                enrollment.completed,

            completedAt:
                enrollment.completedAt,
        });
    } catch (error) {
        console.error(
            "issueCertificate error:",
            error
        );

        return res.status(500).json({
            message:
                "Failed to issue certificate.",

            error:
                error.message,
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
                message:
                    "Course not found.",
            });
        }

        // ----------------------------------------------------
        // FIND PAID ENROLLMENT
        // ----------------------------------------------------

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

        // ----------------------------------------------------
        // CHECK CERTIFICATE SETTING
        // ----------------------------------------------------

        if (!course.certificate) {
            return res.status(400).json({
                message:
                    "This course does not issue a certificate.",
            });
        }

        // ----------------------------------------------------
        // VERIFY COURSE REQUIREMENTS
        // ----------------------------------------------------

        const eligibility =
            checkCertificateEligibility(
                course,
                enrollment
            );

        if (!eligibility.eligible) {
            return res.status(400).json({
                message:
                    eligibility.reason,
            });
        }

        // ----------------------------------------------------
        // GENERATE CERTIFICATE NUMBER
        // ----------------------------------------------------

        if (
            !enrollment.certificateNumber
        ) {
            enrollment.certificateNumber =
                `NA-${Date.now()}-${Math.floor(
                    Math.random() * 100000
                )}`;

            enrollment.certificateIssued =
                true;

            enrollment.completed =
                true;

            enrollment.completedAt =
                enrollment.completedAt ||
                new Date();

            await enrollment.save();
        } else if (
            !enrollment.certificateIssued
        ) {
            enrollment.certificateIssued =
                true;

            await enrollment.save();
        }

        const certificateNumber =
            enrollment.certificateNumber;

        // ----------------------------------------------------
        // STUDENT NAME
        // ----------------------------------------------------

        const studentName =
            enrollment.student?.name ||
            "Student";

        // ----------------------------------------------------
        // QR CODE
        // ----------------------------------------------------

        const verificationURL =
            `https://nakkyacademy.co.za/verify-certificate/${certificateNumber}`;

        const qrCode =
            await QRCode.toDataURL(
                verificationURL
            );

        // ----------------------------------------------------
        // CREATE PDF
        // ----------------------------------------------------

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

        // ----------------------------------------------------
        // CERTIFICATE HEADING
        // ----------------------------------------------------

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

        // ----------------------------------------------------
        // QR CODE
        // ----------------------------------------------------

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

                error:
                    error.message,
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