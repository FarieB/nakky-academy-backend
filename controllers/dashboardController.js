const Message =
  require("../models/Message");

const NotificationModel =
  require("../models/Notification");

const User =
  require("../models/user");

const CandidateProfile =
  require("../models/CandidateProfile");

const Enrollment =
  require("../models/Enrollment");

const Course =
  require("../models/Course");

const Payment =
  require("../models/Payment");

const EmployerProfile =
  require("../models/EmployerProfile");

const SavedCandidate =
  require("../models/SavedCandidate");

const {
  calculateProfileCompletion,
} = require("../utils/profileCompletion");

// =====================================================
// UNIFIED DASHBOARD
// =====================================================

exports.getUnifiedDashboard =
  async (req, res) => {

    const startTime = Date.now();

    try {

      const userId =
        req.user._id;

      const role =
        req.user.role;

      // ===================================================
      // EMPLOYER
      // ===================================================

      if (role === "employer") {

        const user =
          await User.findById(userId)
            .select(
              "name email role phone subscriptionStatus subscriptionExpiry profilePhoto"
            )
            .lean();

        if (!user) {

          return res.status(404).json({
            message:
              "User not found.",
          });

        }

        const isActive =
          user.subscriptionExpiry &&
          new Date(
            user.subscriptionExpiry
          ) > new Date();

        // -----------------------------------------------
        // Employer profile
        // -----------------------------------------------

        const employerProfilePromise =
          EmployerProfile
            .findOne({
              user: userId,
            })
            .lean();

        // -----------------------------------------------
        // Candidate count
        // -----------------------------------------------

        const totalCandidatesPromise =
          CandidateProfile.countDocuments({
            profileActive: true,
            profileCompleted: true,
          });

        // -----------------------------------------------
        // Saved candidates
        // -----------------------------------------------

        const savedCandidatePromise =
          SavedCandidate
            .find({
              employer: userId,
            })
            .sort({
              createdAt: -1,
            })
            .limit(10)
            .populate({
              path: "candidate",
              match: {
                profileActive: true,
              },
              select:
                "firstName workerTypes city province yearsExperience profilePhoto profileVerified profileActive",
            })
            .lean();

        const [
          employerProfile,
          totalCandidates,
          savedCandidateRecords,
        ] = await Promise.all([
          employerProfilePromise,
          totalCandidatesPromise,
          savedCandidatePromise,
        ]);

        const activeSavedCandidateRecords =
          savedCandidateRecords.filter(
            (record) =>
              record.candidate
          );

        // -----------------------------------------------
        // Recommendations
        // -----------------------------------------------

        let recommendedCandidates = [];

        if (
          employerProfile
        ) {

          const recommendationFilter = {
            profileActive: true,
            profileCompleted: true,
          };

          if (
            employerProfile.lookingFor &&
            employerProfile
              .lookingFor.length > 0
          ) {

            recommendationFilter.workerTypes =
              {
                $in:
                  employerProfile.lookingFor,
              };

          }

          if (
            employerProfile.province
          ) {

            recommendationFilter.province =
              employerProfile.province;

          }

          recommendedCandidates =
            await CandidateProfile
              .find(
                recommendationFilter
              )
              .select(
                "firstName workerTypes city province yearsExperience profilePhoto profileVerified"
              )
              .sort({
                profileVerified: -1,
                yearsExperience: -1,
                createdAt: -1,
              })
              .limit(5)
              .lean();

        }

        console.log(
          `[DASHBOARD:EMPLOYER] ${Date.now() - startTime}ms`
        );

        return res.json({

          role: "employer",

          subscriptionStatus:
            isActive
              ? "active"
              : "inactive",

          subscriptionExpiry:
            user.subscriptionExpiry ||
            null,

          profile:
            employerProfile,

          stats: {

            totalCandidates,

            savedCandidates:
              activeSavedCandidateRecords
                .length,

            recommendedCandidates:
              recommendedCandidates
                .length,

          },

          savedCandidates:
            activeSavedCandidateRecords,

          recommendedCandidates,

        });

      }

      // ===================================================
      // CANDIDATE
      // ===================================================

      if (role === "candidate") {

        const [
          profile,
          enrollments,
          recommendedCourses,
          messages,
          notifications,
        ] = await Promise.all([

          CandidateProfile
            .findOne({
              user: userId,
            })
            .populate(
              "user",
              "name email role profilePhoto phone"
            )
            .lean(),

          Enrollment
            .find({
              student: userId,
            })
            .populate(
              "course"
            )
            .lean(),

          Course
            .find({
              published: true,
            })
            .select(
              "title shortDescription category level duration price image published certificate passMark createdAt"
            )
            .sort({
              createdAt: -1,
            })
            .limit(5)
            .lean(),

          Message
            .find({
              $or: [
                {
                  sender: userId,
                },
                {
                  receiver: userId,
                },
              ],
            })
            .select(
              "sender receiver message status deliveredAt readAt createdAt"
            )
            .sort({
              createdAt: -1,
            })
            .limit(10)
            .populate(
              "sender",
              "name firstName profilePhoto"
            )
            .populate(
              "receiver",
              "name firstName profilePhoto"
            )
            .lean(),

          NotificationModel
            .find({
              user: userId,
            })
            .sort({
              createdAt: -1,
            })
            .limit(10)
            .lean(),

        ]);

        const completedCourses =
          enrollments.filter(
            (enrollment) =>
              enrollment.progress >=
                100 ||
              enrollment.status ===
                "completed" ||
              enrollment.completed ===
                true
          );

        const certificates =
          enrollments.filter(
            (enrollment) =>
              enrollment.certificateIssued ===
              true
          );

        const completion =
          calculateProfileCompletion(
            profile
          );

        console.log(
          `[DASHBOARD:CANDIDATE] ${Date.now() - startTime}ms`
        );

        return res.json({

          role: "candidate",

          profile,

          stats: {

            enrolledCourses:
              enrollments.length,

            verificationStatus:
              profile?.verificationStatus ||
              "unverified",

            verifiedBadge:
              profile?.verifiedBadge ||
              false,

          },

          enrollments,

          completedCourses,

          certificates,

          recommendedCourses,

          profileCompletion:
            completion,

          messages,

          notifications,

        });

      }

      // ===================================================
      // STUDENT
      // ===================================================

      if (role === "student") {

        const [
          profile,
          enrollments,
        ] = await Promise.all([

          User
            .findById(userId)
            .select(
              "-password"
            )
            .lean(),

          Enrollment
            .find({
              student: userId,
            })
            .populate(
              "course"
            )
            .lean(),

        ]);

        const enrolledIds =
          enrollments
            .map(
              (enrollment) =>
                enrollment.course?._id
            )
            .filter(Boolean);

        const recommendedCourses =
          await Course
            .find({
              _id: {
                $nin:
                  enrolledIds,
              },
              published: true,
            })
            .select(
              "title shortDescription category level duration price image published certificate passMark createdAt"
            )
            .sort({
              createdAt: -1,
            })
            .limit(5)
            .lean();

        const certificates =
          enrollments.filter(
            (enrollment) =>
              enrollment.certificateIssued
          );

        const completedCourses =
          enrollments.filter(
            (enrollment) =>
              enrollment.completed ||
              enrollment.progress >=
                100
          );

        const announcements = [
          {
            title:
              "Welcome to Nakky Academy",

            message:
              "Continue learning and complete your courses to earn certificates.",
          },

          {
            title:
              "New Courses Available",

            message:
              "Browse our latest professional caregiving courses.",
          },
        ];

        console.log(
          `[DASHBOARD:STUDENT] ${Date.now() - startTime}ms`
        );

        return res.json({

          role: "student",

          profile,

          enrollments,

          recommendedCourses,

          certificates,

          completedCourses,

          announcements,

        });

      }

      // ===================================================
      // ADMIN
      // ===================================================

      if (role === "admin") {

        const [
          profile,
          totalUsers,
          totalStudents,
          totalEmployers,
          totalCandidates,
          totalCourses,
          totalEnrollments,
          revenue,
          pendingVerifications,
          recentUsers,
        ] = await Promise.all([

          User
            .findById(userId)
            .select("-password")
            .lean(),

          User.countDocuments(),

          User.countDocuments({
            role: "student",
          }),

          User.countDocuments({
            role: "employer",
          }),

          CandidateProfile.countDocuments(),

          Course.countDocuments(),

          Enrollment.countDocuments(),

          Payment.aggregate([
            {
              $match: {
                status: "paid",
              },
            },

            {
              $group: {
                _id: null,

                total: {
                  $sum: "$amount",
                },

              },
            },
          ]),

          CandidateProfile
            .find({
              verificationStatus:
                "pending",
            })
            .select(
              "firstName surname profilePhoto verificationStatus user"
            )
            .populate(
              "user",
              "name email"
            )
            .limit(5)
            .lean(),

          User
            .find()
            .sort({
              createdAt: -1,
            })
            .limit(5)
            .select(
              "name role createdAt"
            )
            .lean(),

        ]);

        console.log(
          `[DASHBOARD:ADMIN] ${Date.now() - startTime}ms`
        );

        return res.json({

          role: "admin",

          profile,

          stats: {

            totalUsers,

            totalStudents,

            totalEmployers,

            totalCandidates,

            totalCourses,

            totalEnrollments,

            revenue:
              revenue[0]?.total ||
              0,

          },

          pendingVerifications,

          recentUsers,

          recentActivity: [

            {
              message:
                "New candidate registered",
            },

            {
              message:
                "Employer subscription activated",
            },

            {
              message:
                "New course created",
            },

            {
              message:
                "Candidate verification approved",
            },

            {
              message:
                "Student enrolled in a course",
            },

          ],

        });

      }

      return res.status(403).json({
        message:
          "Unauthorized role",
      });

    } catch (err) {

      console.error(
        "DASHBOARD ERROR:",
        err
      );

      return res.status(500).json({
        message:
          err.message ||
          "Unable to load dashboard.",
      });

    }

  };
