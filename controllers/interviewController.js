const InterviewRequest =
    require("../models/InterviewRequest");

const JobPost =
    require("../models/JobPost");

const User =
    require("../models/user");

const CandidateProfile =
    require("../models/CandidateProfile");

const EmployerProfile =
    require("../models/EmployerProfile");

const {
    hasActiveSubscription,
} = require("../middleware/marketplaceAccess");

const {
    createNotification,
} = require("../services/notificationService");


// ============================================================
// HELPER — GET USER
// ============================================================

const getUser = async (userId) => {
    return await User.findById(userId)
        .select(
            "_id role name firstName lastName email phone subscriptionStatus subscriptionExpiry"
        )
        .lean();
};


// ============================================================
// CREATE INTERVIEW REQUEST
// ============================================================
//
// BOTH parties must have active subscriptions.
//
// Candidate -> Employer
//
// OR
//
// Employer -> Candidate
//
// ============================================================

const createInterviewRequest = async (
    req,
    res
) => {
    try {

        if (!req.user) {
            return res.status(401).json({
                message:
                    "Authentication required.",
            });
        }


        const requester =
            await getUser(
                req.user._id
            );


        if (!requester) {
            return res.status(404).json({
                message:
                    "Your account could not be found.",
            });
        }


        // ====================================================
        // SUBSCRIPTION CHECK — REQUESTER
        // ====================================================

        if (
            !hasActiveSubscription(
                requester
            )
        ) {
            return res.status(403).json({
                message:
                    "An active subscription is required to request an interview.",
                subscriptionRequired: true,
            });
        }


        const {
            recipientId,
            candidateId,
            employerId,
            jobId,
            proposedDate,
            proposedStartTime,
            proposedEndTime,
            meetingType,
            location,
            message,
        } = req.body;


        // ====================================================
        // DETERMINE CANDIDATE / EMPLOYER
        // ====================================================

        let candidateUserId =
            candidateId || null;

        let employerUserId =
            employerId || null;


        /*
         * If recipientId is supplied, determine the roles
         * automatically.
         */

        if (recipientId) {

            const recipient =
                await getUser(
                    recipientId
                );


            if (!recipient) {
                return res.status(404).json({
                    message:
                        "The selected user could not be found.",
                });
            }


            if (
                recipient.role ===
                "candidate"
            ) {
                candidateUserId =
                    recipient._id;

                employerUserId =
                    requester._id;
            }


            if (
                recipient.role ===
                "employer"
            ) {
                employerUserId =
                    recipient._id;

                candidateUserId =
                    requester._id;
            }
        }


        // ====================================================
        // VERIFY ROLES
        // ====================================================

        if (
            !candidateUserId ||
            !employerUserId
        ) {
            return res.status(400).json({
                message:
                    "A candidate and employer are required for an interview request.",
            });
        }


        if (
            String(candidateUserId) ===
            String(employerUserId)
        ) {
            return res.status(400).json({
                message:
                    "A user cannot request an interview with themselves.",
            });
        }


        const candidateUser =
            await getUser(
                candidateUserId
            );

        const employerUser =
            await getUser(
                employerUserId
            );


        if (!candidateUser) {
            return res.status(404).json({
                message:
                    "Candidate account not found.",
            });
        }


        if (!employerUser) {
            return res.status(404).json({
                message:
                    "Employer account not found.",
            });
        }


        if (
            candidateUser.role !==
            "candidate"
        ) {
            return res.status(400).json({
                message:
                    "The selected candidate account is invalid.",
            });
        }


        if (
            employerUser.role !==
            "employer"
        ) {
            return res.status(400).json({
                message:
                    "The selected employer account is invalid.",
            });
        }


        // ====================================================
        // SUBSCRIPTION CHECK — OTHER PARTY
        // ====================================================

        if (
            !hasActiveSubscription(
                candidateUser
            )
        ) {
            return res.status(403).json({
                message:
                    "The candidate must have an active subscription before an interview can be requested.",
                recipientSubscriptionRequired:
                    true,
            });
        }


        if (
            !hasActiveSubscription(
                employerUser
            )
        ) {
            return res.status(403).json({
                message:
                    "The employer must have an active subscription before an interview can be requested.",
                recipientSubscriptionRequired:
                    true,
            });
        }


        // ====================================================
        // VALIDATE DATE
        // ====================================================

        if (!proposedDate) {
            return res.status(400).json({
                message:
                    "An interview date is required.",
            });
        }


        const interviewDate =
            new Date(proposedDate);


        if (
            Number.isNaN(
                interviewDate.getTime()
            )
        ) {
            return res.status(400).json({
                message:
                    "The interview date is invalid.",
            });
        }


        if (
            interviewDate < new Date()
        ) {
            return res.status(400).json({
                message:
                    "The interview date must be in the future.",
            });
        }


        // ====================================================
        // JOB VALIDATION
        // ====================================================

        let job = null;


        if (jobId) {

            job =
                await JobPost.findById(
                    jobId
                );


            if (!job) {
                return res.status(404).json({
                    message:
                        "The selected job could not be found.",
                });
            }


            if (
                String(
                    job.employer
                ) !==
                String(
                    employerUserId
                )
            ) {
                return res.status(403).json({
                    message:
                        "This job does not belong to the selected employer.",
                });
            }


            if (
                !job.isActive ||
                job.status !==
                    "active"
            ) {
                return res.status(400).json({
                    message:
                        "This job is no longer accepting interview requests.",
                });
            }


            if (
                job.allowInterviewRequests ===
                false
            ) {
                return res.status(400).json({
                    message:
                        "Interview requests are disabled for this job.",
                });
            }
        }


        // ====================================================
        // CHECK DUPLICATE PENDING REQUEST
        // ====================================================

        const existingRequest =
            await InterviewRequest.findOne({
                candidate:
                    candidateUserId,

                employer:
                    employerUserId,

                job:
                    jobId || null,

                status:
                    "pending",
            });


        if (existingRequest) {
            return res.status(409).json({
                message:
                    "There is already a pending interview request between these users for this job.",
                interview:
                    existingRequest,
            });
        }


        // ====================================================
        // CREATE REQUEST
        // ====================================================

        const interview =
            await InterviewRequest.create({

                candidate:
                    candidateUserId,

                employer:
                    employerUserId,

                job:
                    jobId || null,

                requestedBy:
                    requester._id,

                status:
                    "pending",

                proposedDate:
                    interviewDate,

                proposedStartTime:
                    proposedStartTime ||
                    "",

                proposedEndTime:
                    proposedEndTime ||
                    "",

                meetingType:
                    meetingType ||
                    "In Person",

                location:
                    location ||
                    "",

                message:
                    message ||
                    "",
            });


        // ====================================================
        // NOTIFICATION
        // ====================================================

        const recipientIdForNotification =
            String(requester._id) ===
            String(candidateUserId)
                ? employerUserId
                : candidateUserId;


        const requesterName =
            requester.firstName ||
            requester.name ||
            "A Nakky Academy user";


        await createNotification({
            user:
                recipientIdForNotification,

            sender:
                requester._id,

            title:
                "New Interview Request",

            message:
                `${requesterName} has requested an interview with you.`,

            type:
                "interview",

            referenceId:
                interview._id,

            referenceModel:
                "InterviewRequest",

            action:
                "open_interview",

            actionData: {
                interviewId:
                    interview._id,
            },
        });


        // ====================================================
        // RESPONSE
        // ====================================================

        const populatedInterview =
            await InterviewRequest.findById(
                interview._id
            )
                .populate(
                    "candidate",
                    "_id name firstName lastName role"
                )
                .populate(
                    "employer",
                    "_id name firstName lastName role"
                )
                .populate(
                    "job",
                    "_id title jobTypes province city"
                );


        return res.status(201).json({
            message:
                "Interview request sent successfully.",

            interview:
                populatedInterview,
        });

    } catch (error) {

        console.error(
            "CREATE INTERVIEW ERROR:",
            error
        );

        return res.status(500).json({
            message:
                "Failed to create interview request.",
        });
    }
};


// ============================================================
// GET MY INTERVIEWS
// ============================================================

const getMyInterviews = async (
    req,
    res
) => {
    try {

        if (!req.user) {
            return res.status(401).json({
                message:
                    "Authentication required.",
            });
        }


        const filter = {
            $or: [
                {
                    candidate:
                        req.user._id,
                },
                {
                    employer:
                        req.user._id,
                },
            ],
        };


        if (req.query.status) {
            filter.status =
                req.query.status;
        }


        const interviews =
            await InterviewRequest.find(
                filter
            )
                .populate(
                    "candidate",
                    "_id name firstName lastName role"
                )
                .populate(
                    "employer",
                    "_id name firstName lastName role"
                )
                .populate(
                    "job",
                    "_id title jobTypes province city"
                )
                .sort({
                    proposedDate: 1,
                    createdAt: -1,
                });


        return res.status(200).json({
            interviews,
        });

    } catch (error) {

        console.error(
            "GET INTERVIEWS ERROR:",
            error
        );

        return res.status(500).json({
            message:
                "Failed to retrieve interviews.",
        });
    }
};


// ============================================================
// GET SINGLE INTERVIEW
// ============================================================

const getInterviewById = async (
    req,
    res
) => {
    try {

        if (!req.user) {
            return res.status(401).json({
                message:
                    "Authentication required.",
            });
        }


        const interview =
            await InterviewRequest.findById(
                req.params.id
            )
                .populate(
                    "candidate",
                    "_id name firstName lastName role"
                )
                .populate(
                    "employer",
                    "_id name firstName lastName role"
                )
                .populate(
                    "job"
                );


        if (!interview) {
            return res.status(404).json({
                message:
                    "Interview request not found.",
            });
        }


        const isParticipant =
            String(
                interview.candidate._id
            ) ===
                String(
                    req.user._id
                ) ||
            String(
                interview.employer._id
            ) ===
                String(
                    req.user._id
                );


        if (!isParticipant) {
            return res.status(403).json({
                message:
                    "You do not have access to this interview.",
            });
        }


        return res.status(200).json({
            interview,
        });

    } catch (error) {

        console.error(
            "GET INTERVIEW ERROR:",
            error
        );

        return res.status(500).json({
            message:
                "Failed to retrieve interview.",
        });
    }
};


// ============================================================
// RESPOND TO INTERVIEW
// ============================================================
//
// Recipient can:
// - accept
// - reject
//
// The original requester cannot accept their own request.
// ============================================================

const respondToInterview = async (
    req,
    res
) => {
    try {

        if (!req.user) {
            return res.status(401).json({
                message:
                    "Authentication required.",
            });
        }


        const {
            response,
            responseMessage,
        } = req.body;


        if (
            ![
                "accepted",
                "rejected",
            ].includes(response)
        ) {
            return res.status(400).json({
                message:
                    "Response must be either accepted or rejected.",
            });
        }


        const interview =
            await InterviewRequest.findById(
                req.params.id
            );


        if (!interview) {
            return res.status(404).json({
                message:
                    "Interview request not found.",
            });
        }


        // ====================================================
        // VERIFY PARTICIPANT
        // ====================================================

        const isCandidate =
            String(
                interview.candidate
            ) ===
            String(
                req.user._id
            );


        const isEmployer =
            String(
                interview.employer
            ) ===
            String(
                req.user._id
            );


        if (
            !isCandidate &&
            !isEmployer
        ) {
            return res.status(403).json({
                message:
                    "You do not have access to this interview.",
            });
        }


        // ====================================================
        // ONLY THE RECIPIENT CAN RESPOND
        // ====================================================

        if (
            String(
                interview.requestedBy
            ) ===
            String(
                req.user._id
            )
        ) {
            return res.status(403).json({
                message:
                    "The person who created the interview request cannot respond to their own request.",
            });
        }


        // ====================================================
        // CHECK CURRENT STATUS
        // ====================================================

        if (
            interview.status !==
            "pending"
        ) {
            return res.status(400).json({
                message:
                    `This interview is already ${interview.status}.`,
            });
        }


        // ====================================================
        // UPDATE
        // ====================================================

        interview.status =
            response;

        interview.responseMessage =
            responseMessage ||
            "";

        interview.respondedAt =
            new Date();


        await interview.save();


        // ====================================================
        // NOTIFY REQUESTER
        // ====================================================

        const responderName =
            req.user.firstName ||
            req.user.name ||
            "The other party";


        await createNotification({
            user:
                interview.requestedBy,

            sender:
                req.user._id,

            title:
                response ===
                "accepted"
                    ? "Interview Accepted"
                    : "Interview Rejected",

            message:
                response ===
                "accepted"
                    ? `${responderName} accepted your interview request.`
                    : `${responderName} rejected your interview request.`,

            type:
                "interview",

            referenceId:
                interview._id,

            referenceModel:
                "InterviewRequest",

            action:
                "open_interview",

            actionData: {
                interviewId:
                    interview._id,
            },
        });


        const updatedInterview =
            await InterviewRequest.findById(
                interview._id
            )
                .populate(
                    "candidate",
                    "_id name firstName lastName role"
                )
                .populate(
                    "employer",
                    "_id name firstName lastName role"
                )
                .populate(
                    "job",
                    "_id title jobTypes province city"
                );


        return res.status(200).json({
            message:
                response ===
                "accepted"
                    ? "Interview accepted successfully."
                    : "Interview rejected successfully.",

            interview:
                updatedInterview,
        });

    } catch (error) {

        console.error(
            "RESPOND INTERVIEW ERROR:",
            error
        );

        return res.status(500).json({
            message:
                "Failed to respond to interview.",
        });
    }
};


// ============================================================
// CANCEL INTERVIEW
// ============================================================

const cancelInterview = async (
    req,
    res
) => {
    try {

        if (!req.user) {
            return res.status(401).json({
                message:
                    "Authentication required.",
            });
        }


        const interview =
            await InterviewRequest.findById(
                req.params.id
            );


        if (!interview) {
            return res.status(404).json({
                message:
                    "Interview request not found.",
            });
        }


        const isParticipant =
            String(
                interview.candidate
            ) ===
                String(
                    req.user._id
                ) ||
            String(
                interview.employer
            ) ===
                String(
                    req.user._id
                );


        if (!isParticipant) {
            return res.status(403).json({
                message:
                    "You do not have access to this interview.",
            });
        }


        if (
            [
                "rejected",
                "cancelled",
                "completed",
            ].includes(
                interview.status
            )
        ) {
            return res.status(400).json({
                message:
                    `This interview is already ${interview.status}.`,
            });
        }


        interview.status =
            "cancelled";


        await interview.save();


        // ====================================================
        // NOTIFY OTHER PARTICIPANT
        // ====================================================

        const recipient =
            String(
                interview.candidate
            ) ===
            String(
                req.user._id
            )
                ? interview.employer
                : interview.candidate;


        const cancellerName =
            req.user.firstName ||
            req.user.name ||
            "A user";


        await createNotification({
            user:
                recipient,

            sender:
                req.user._id,

            title:
                "Interview Cancelled",

            message:
                `${cancellerName} cancelled the interview request.`,

            type:
                "interview",

            referenceId:
                interview._id,

            referenceModel:
                "InterviewRequest",

            action:
                "open_interview",

            actionData: {
                interviewId:
                    interview._id,
            },
        });


        return res.status(200).json({
            message:
                "Interview cancelled successfully.",

            interview,
        });

    } catch (error) {

        console.error(
            "CANCEL INTERVIEW ERROR:",
            error
        );

        return res.status(500).json({
            message:
                "Failed to cancel interview.",
        });
    }
};


// ============================================================
// MARK INTERVIEW COMPLETED
// ============================================================

const completeInterview = async (
    req,
    res
) => {
    try {

        if (!req.user) {
            return res.status(401).json({
                message:
                    "Authentication required.",
            });
        }


        const interview =
            await InterviewRequest.findById(
                req.params.id
            );


        if (!interview) {
            return res.status(404).json({
                message:
                    "Interview request not found.",
            });
        }


        const isParticipant =
            String(
                interview.candidate
            ) ===
                String(
                    req.user._id
                ) ||
            String(
                interview.employer
            ) ===
                String(
                    req.user._id
                );


        if (!isParticipant) {
            return res.status(403).json({
                message:
                    "You do not have access to this interview.",
            });
        }


        if (
            interview.status !==
            "accepted"
        ) {
            return res.status(400).json({
                message:
                    "Only accepted interviews can be marked as completed.",
            });
        }


        interview.status =
            "completed";

        interview.completedAt =
            new Date();


        await interview.save();


        const recipient =
            String(
                interview.candidate
            ) ===
            String(
                req.user._id
            )
                ? interview.employer
                : interview.candidate;


        const completerName =
            req.user.firstName ||
            req.user.name ||
            "A user";


        await createNotification({
            user:
                recipient,

            sender:
                req.user._id,

            title:
                "Interview Completed",

            message:
                `${completerName} marked the interview as completed.`,

            type:
                "interview",

            referenceId:
                interview._id,

            referenceModel:
                "InterviewRequest",

            action:
                "open_interview",

            actionData: {
                interviewId:
                    interview._id,
            },
        });


        return res.status(200).json({
            message:
                "Interview marked as completed.",

            interview,
        });

    } catch (error) {

        console.error(
            "COMPLETE INTERVIEW ERROR:",
            error
        );

        return res.status(500).json({
            message:
                "Failed to complete interview.",
        });
    }
};


// ============================================================
// EXPORTS
// ============================================================

module.exports = {

    createInterviewRequest,

    getMyInterviews,

    getInterviewById,

    respondToInterview,

    cancelInterview,

    completeInterview,

};