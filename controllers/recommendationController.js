const CandidateProfile =
    require("../models/CandidateProfile");

const EmployerProfile =
    require("../models/EmployerProfile");

const JobPost =
    require("../models/JobPost");

const Course =
    require("../models/Course");

const Enrollment =
    require("../models/Enrollment");


// =====================================================
// HELPER FUNCTIONS
// =====================================================

const normalise = (value) => {

    if (
        value === undefined ||
        value === null
    ) {
        return "";
    }

    return String(value)
        .trim()
        .toLowerCase();

};


const arrayNormalise = (value) => {

    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .filter(Boolean)
        .map(item =>
            normalise(item)
        );

};


const hasOverlap = (
    first,
    second
) => {

    const firstArray =
        arrayNormalise(first);

    const secondArray =
        arrayNormalise(second);

    return firstArray.some(
        item =>
            secondArray.includes(item)
    );

};


// =====================================================
// STUDENT → COURSE RECOMMENDATIONS
// Existing functionality
// =====================================================

exports.recommendCourses =
    async (req, res) => {

        try {

            const enrollments =
                await Enrollment.find({
                    student:
                        req.user._id,
                });

            const enrolledCourseIds =
                enrollments.map(
                    enrollment =>
                        enrollment.course
                );

            const courses =
                await Course.find({
                    _id: {
                        $nin:
                            enrolledCourseIds,
                    },
                });

            const ranked =
                courses.map(
                    course => {

                        let score = 0;

                        const title =
                            (
                                course.title ||
                                ""
                            ).toLowerCase();

                        if (
                            title.includes("care")
                        ) {
                            score += 20;
                        }

                        if (
                            title.includes("child")
                        ) {
                            score += 15;
                        }

                        if (
                            title.includes("elder")
                        ) {
                            score += 15;
                        }

                        if (
                            title.includes("first aid")
                        ) {
                            score += 10;
                        }

                        return {
                            course,
                            score
                        };

                    }
                );

            ranked.sort(
                (a, b) =>
                    b.score - a.score
            );

            return res.json(
                ranked.slice(0, 5)
            );

        } catch (error) {

            console.error(
                "RECOMMEND COURSES ERROR:",
                error
            );

            return res.status(500).json({
                message:
                    error.message
            });

        }

    };


// =====================================================
// EMPLOYER → CANDIDATE MATCHING
// =====================================================

exports.recommendCandidates = async (req, res) => {
  try {
    if (req.user.role !== "employer") {
      return res.status(403).json({
        success: false,
        message: "Only employers can access candidate recommendations.",
      });
    }

    const employer = await EmployerProfile.findOne({ user: req.user._id }).lean();
    if (!employer) {
      return res.status(404).json({ success: false, message: "Employer profile not found." });
    }
    if (employer.profileActive !== true) {
      return res.status(403).json({ success: false, message: "Your employer profile is inactive." });
    }

    // JobPost is the source of truth for vacancy requirements.
    const jobs = await JobPost.find({
      employer: req.user._id,
      isActive: true,
      status: "active",
    }).sort({ createdAt: -1 }).limit(100).lean();

    if (!jobs.length) {
      return res.json({
        success: true,
        candidates: [],
        message: "Create and publish a job post to receive candidate recommendations.",
      });
    }

    const {
      workType,
      province,
      city,
      language,
      availability,
      minExperience,
      maxSalary,
      page = 1,
      limit = 20,
    } = req.query;

    const filter = { profileActive: true, profileCompleted: true };
    if (workType) filter.workerTypes = workType;
    if (province) filter.province = new RegExp(`^${String(province).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
    if (city) filter.city = new RegExp(`^${String(city).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
    if (language) filter.languages = language;
    if (availability) filter.availabilityStatus = availability;
    if (minExperience !== undefined) filter.yearsExperience = { $gte: Number(minExperience) || 0 };
    if (maxSalary !== undefined) filter.expectedSalary = { $lte: Number(maxSalary) };

    const candidates = await CandidateProfile.find(filter)
      .populate({ path: "user", select: "name profilePhoto verifiedBadge isVerified" })
      .lean();

    const norm = (value) => String(value ?? "").trim().toLowerCase();
    const overlap = (a, b) => (Array.isArray(a) ? a : []).some((x) =>
      (Array.isArray(b) ? b : []).some((y) => norm(x) === norm(y))
    );

    const ranked = candidates.map((candidate) => {
      let best = { score: 0, reasons: [], job: null };

      for (const job of jobs) {
        let score = 0;
        const reasons = [];

        if (overlap(candidate.workerTypes, job.jobTypes)) {
          score += 30;
          reasons.push("Your work type matches this job.");
        }
        if (norm(candidate.province) && norm(candidate.province) === norm(job.province)) {
          score += 15;
          reasons.push("You are in the same province.");
        }
        if (norm(candidate.city) && norm(candidate.city) === norm(job.city)) {
          score += 15;
          reasons.push("You are in the same city.");
        }
        if (overlap(candidate.workPreferences, [job.employmentType, job.workArrangement])) {
          score += 10;
          reasons.push("The work arrangement matches your preferences.");
        }
        if (overlap(candidate.languages, job.requiredLanguages)) {
          score += 10;
          reasons.push("You speak a required language.");
        }
        if ((Number(candidate.yearsExperience) || 0) >= (Number(job.requiredExperience) || 0)) {
          score += 10;
          reasons.push("Your experience meets the requirement.");
        }

        const expectedSalary = Number(candidate.expectedSalary) || 0;
        const offeredSalary = Number(job.salaryAmount || job.salaryMax || 0);
        if (!offeredSalary || !expectedSalary || expectedSalary <= offeredSalary) {
          score += 5;
          reasons.push("Your salary expectation may fit this job.");
        }
        if (candidate.availabilityStatus === "Available Immediately") score += 5;

        if (score > best.score) best = { score, reasons, job };
      }

      return {
        candidate,
        matchScore: best.score,
        matchPercentage: Math.min(best.score, 100),
        matchReasons: best.reasons,
        matchedJob: best.job ? {
          _id: best.job._id,
          title: best.job.title,
          jobTypes: best.job.jobTypes,
          province: best.job.province,
          city: best.job.city,
          employmentType: best.job.employmentType,
          workArrangement: best.job.workArrangement,
        } : null,
      };
    }).filter((item) => item.matchScore > 0);

    ranked.sort((a, b) => b.matchScore - a.matchScore);
    const pageNumber = Math.max(Number(page) || 1, 1);
    const pageLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const total = ranked.length;

    return res.json({
      success: true,
      candidates: ranked.slice((pageNumber - 1) * pageLimit, pageNumber * pageLimit),
      pagination: {
        page: pageNumber,
        limit: pageLimit,
        total,
        pages: Math.ceil(total / pageLimit),
      },
    });
  } catch (error) {
    console.error("RECOMMEND CANDIDATES ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to calculate candidate matches.",
    });
  }
};


exports.recommendEmployers = async (req, res) => {
  try {
    if (req.user.role !== "candidate") {
      return res.status(403).json({
        success: false,
        message: "Only candidates can access employer recommendations.",
      });
    }

    const candidate = await CandidateProfile.findOne({ user: req.user._id }).lean();
    if (!candidate) {
      return res.status(404).json({ success: false, message: "Candidate profile not found." });
    }
    if (candidate.profileActive !== true) {
      return res.status(403).json({ success: false, message: "Your candidate profile is inactive." });
    }

    const {
      workType,
      province,
      city,
      language,
      employmentType,
      page = 1,
      limit = 20,
    } = req.query;

    // Recommendations are derived from active JobPost records. EmployerProfile
    // supplies only the employer identity and general location for display.
    const jobs = await JobPost.find({ isActive: true, status: "active" })
      .populate({
        path: "employerProfile",
        select: "contactPerson householdName employerType province city suburb profileActive hiringStatus",
      })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    const norm = (value) => String(value ?? "").trim().toLowerCase();
    const overlap = (a, b) => (Array.isArray(a) ? a : []).some((x) =>
      (Array.isArray(b) ? b : []).some((y) => norm(x) === norm(y))
    );

    const grouped = new Map();
    for (const job of jobs) {
      const employer = job.employerProfile;
      if (!employer || employer.profileActive !== true || employer.hiringStatus === "Paused" || employer.hiringStatus === "Hired") continue;
      if (workType && !(job.jobTypes || []).some((type) => norm(type) === norm(workType))) continue;
      if (province && norm(job.province) !== norm(province)) continue;
      if (city && norm(job.city) !== norm(city)) continue;
      if (employmentType && norm(job.employmentType) !== norm(employmentType)) continue;
      if (language && !(job.requiredLanguages || []).some((item) => norm(item) === norm(language))) continue;

      let score = 0;
      const reasons = [];
      if (overlap(candidate.workerTypes, job.jobTypes)) {
        score += 30;
        reasons.push("The job matches your type of work.");
      }
      if (norm(candidate.province) && norm(candidate.province) === norm(job.province)) {
        score += 15;
        reasons.push("The job is in your province.");
      }
      if (norm(candidate.city) && norm(candidate.city) === norm(job.city)) {
        score += 15;
        reasons.push("The job is in your city.");
      }
      if (overlap(candidate.workPreferences, [job.employmentType, job.workArrangement])) {
        score += 10;
        reasons.push("The work arrangement matches your preferences.");
      }
      if (overlap(candidate.languages, job.requiredLanguages)) {
        score += 10;
        reasons.push("You speak a required language.");
      }
      if ((Number(candidate.yearsExperience) || 0) >= (Number(job.requiredExperience) || 0)) {
        score += 10;
        reasons.push("Your experience meets the requirement.");
      }
      const expectedSalary = Number(candidate.expectedSalary) || 0;
      const offeredSalary = Number(job.salaryAmount || job.salaryMax || 0);
      if (!offeredSalary || !expectedSalary || expectedSalary <= offeredSalary) score += 5;
      if (candidate.availabilityStatus === "Available Immediately") score += 5;

      const employerId = String(employer._id);
      const current = grouped.get(employerId);
      if (!current || score > current.matchScore) {
        grouped.set(employerId, {
          employer,
          matchScore: score,
          matchPercentage: Math.min(score, 100),
          matchReasons: reasons,
          matchedJob: {
            _id: job._id,
            title: job.title,
            jobTypes: job.jobTypes,
            province: job.province,
            city: job.city,
            suburb: job.suburb,
            employmentType: job.employmentType,
            workArrangement: job.workArrangement,
            salaryType: job.salaryType,
            salaryAmount: job.salaryAmount,
            salaryMin: job.salaryMin,
            salaryMax: job.salaryMax,
          },
        });
      }
    }

    const ranked = Array.from(grouped.values())
      .filter((item) => item.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore);
    const pageNumber = Math.max(Number(page) || 1, 1);
    const pageLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);

    return res.json({
      success: true,
      employers: ranked.slice((pageNumber - 1) * pageLimit, pageNumber * pageLimit),
      pagination: {
        page: pageNumber,
        limit: pageLimit,
        total: ranked.length,
        pages: Math.ceil(ranked.length / pageLimit),
      },
    });
  } catch (error) {
    console.error("RECOMMEND EMPLOYERS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to calculate employer matches.",
    });
  }
};
