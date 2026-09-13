const User = require("../models/user");
const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");
const Payment = require("../models/Payment");
const Subscription = require("../models/Subscription");

/**
 * Refresh admin dashboard statistics.
 *
 * This service calculates the current dashboard statistics.
 * It does not store them in a separate collection.
 *
 * The function is intentionally safe so that a dashboard
 * refresh failure does not break course operations.
 */
const refreshAdminDashboard = async () => {
    try {
        const [
            totalUsers,
            totalStudents,
            totalEmployers,
            totalCandidates,
            totalCourses,
            publishedCourses,
            totalEnrollments,
            paidEnrollments,
            pendingPayments,
            paidPayments,
            activeSubscriptions
        ] = await Promise.all([
            User.countDocuments(),

            User.countDocuments({
                role: "student"
            }),

            User.countDocuments({
                role: "employer"
            }),

            User.countDocuments({
                $or: [
                    { role: "candidate" },
                    { role: "employee" }
                ]
            }),

            Course.countDocuments(),

            Course.countDocuments({
                isPublished: true
            }),

            Enrollment.countDocuments(),

            Enrollment.countDocuments({
                paymentStatus: "paid"
            }),

            Payment.countDocuments({
                status: "pending"
            }),

            Payment.countDocuments({
                status: "paid"
            }),

            Subscription.countDocuments({
                status: "active"
            })
        ]);

        const dashboard = {
            users: {
                total: totalUsers,
                students: totalStudents,
                employers: totalEmployers,
                candidates: totalCandidates
            },

            courses: {
                total: totalCourses,
                published: publishedCourses
            },

            enrollments: {
                total: totalEnrollments,
                paid: paidEnrollments
            },

            payments: {
                pending: pendingPayments,
                paid: paidPayments
            },

            subscriptions: {
                active: activeSubscriptions
            },

            refreshedAt: new Date()
        };

        console.log("Admin dashboard refreshed");

        return dashboard;

    } catch (error) {

        console.error(
            "Admin dashboard refresh failed:",
            error.message
        );

        // Do not allow dashboard statistics to break
        // course creation/update/delete operations.
        return null;
    }
};

module.exports = {
    refreshAdminDashboard
};