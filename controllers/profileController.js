const fs = require("fs");
const path = require("path");

const User = require("../models/user");
const EmployerProfile = require("../models/EmployerProfile");
const CandidateProfile = require("../models/CandidateProfile");
const SavedCandidate = require("../models/SavedCandidate");
const {
  createNotification,
} = require("../services/notificationService");
 const {
          refreshAdminDashboard,
        } = require("../services/socketService");


//
// =====================================================
// CREATE CANDIDATE PROFILE
// =====================================================
//

exports.createCandidateProfile = async (req, res) => {
  try {
    if (req.user.role !== "candidate") {
      return res.status(403).json({
        message: "Only candidates can create profiles.",
      });
    }

    const existingProfile = await CandidateProfile.findOne({
      user: req.user._id,
    });

    if (existingProfile) {
      return res.status(400).json({
        message: "Candidate profile already exists.",
      });
    }

    const profile = await CandidateProfile.create({
      user: req.user._id,

      firstName: req.body.firstName,
      surname: req.body.surname,
      profilePhoto: req.body.profilePhoto,

      gender: req.body.gender,
      dateOfBirth: req.body.dateOfBirth,
      nationality: req.body.nationality,

      languages: req.body.languages || [],

      province: req.body.province,
      city: req.body.city,
      suburb: req.body.suburb,

      bio: req.body.bio,

      workerTypes: req.body.workerTypes || [],

      yearsExperience: req.body.yearsExperience || 0,
      expectedSalary: req.body.expectedSalary || 0,

      skills: req.body.skills || [],

      workPreferences: req.body.workPreferences || [],

      availabilityStatus: req.body.availabilityStatus,

      qualifications: req.body.qualifications || [],
      references: req.body.references || [],

      documents: req.body.documents || {},

      profileCompleted: false,

      // Candidates start active when their profile is created.
      // Admin controls future activation/deactivation.
      profileActive: true,
    });

    return res.status(201).json(profile);
  } catch (err) {
    console.error("CREATE PROFILE ERROR:", err);

    return res.status(500).json({
      message: err.message,
      stack:
        process.env.NODE_ENV === "development"
          ? err.stack
          : undefined,
    });
  }
};

// ======================================
// Upload Candidate Verification Documents
// ======================================
exports.uploadDocuments = async (req, res) => {
    try {

        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                message: "User not found",
            });
        }

        if (user.role !== "candidate") {
            return res.status(403).json({
                message: "Only candidates can upload documents",
            });
        }

        if (!user.hasPaidVerificationFee) {
            return res.status(403).json({
                message: "Please pay the R100 verification fee first.",
            });
        }

        const {
            idDocument,
            policeClearance,
            references,
            qualifications,
        } = req.body;

        if (!idDocument || !references || !qualifications) {
            return res.status(400).json({
                message:
                    "ID document, references and qualifications are required.",
            });
        }

        user.uploadedDocuments = {
            idDocument,
            policeClearance: policeClearance || null,
            references,
            qualifications,
        };

        user.verificationStatus = "pending";
        user.isVerified = false;
        user.verifiedBadge = false;

        user.verificationSubmittedAt = new Date();

        await user.save();

      
        refreshAdminDashboard();

        return res.json({
            message:
                "Documents uploaded successfully. Awaiting admin verification.",
        });

    } catch (error) {

        return res.status(500).json({
            message: error.message,
        });

    }
};


// ======================================
// UPLOAD CANDIDATE PROFILE DOCUMENTS
// ======================================

exports.uploadCandidateProfileDocuments = async (req, res) => {
  try {
    if (req.user.role !== "candidate") {
      return res.status(403).json({
        message: "Only candidates can upload profile documents.",
      });
    }

    const profile = await CandidateProfile.findOne({
      user: req.user._id,
    });

    if (!profile) {
      return res.status(404).json({
        message: "Candidate profile not found.",
      });
    }

    const files = req.files || {};

    // ==========================================
    // ID DOCUMENT
    // ==========================================

    if (files.idDocument?.[0]) {
      profile.documents.idDocument =
        files.idDocument[0].filename;
    }

    // ==========================================
    // POLICE CLEARANCE
    // ==========================================

    if (files.policeClearance?.[0]) {
      profile.documents.policeClearance =
        files.policeClearance[0].filename;
    }

    // ==========================================
    // CV
    // ==========================================

    if (files.cv?.[0]) {
      profile.documents.cv =
        files.cv[0].filename;
    }

    // ==========================================
    // QUALIFICATIONS
    // ==========================================

    if (files.qualifications?.length) {
      files.qualifications.forEach((file) => {
        profile.qualifications.push({
          title: "Qualification",
          institution: "",
          yearCompleted: new Date().getFullYear(),
          certificateFile: file.filename,
        });
      });
    }

    // ==========================================
    // REFERENCES
    // ==========================================

    if (files.references?.length) {
      files.references.forEach((file) => {
        profile.references.push({
          file: file.filename,
        });
      });
    }

    await profile.save();

    return res.json({
      message: "Candidate documents uploaded successfully.",
      documents: profile.documents,
      qualifications: profile.qualifications,
      references: profile.references,
    });

  } catch (error) {
    console.error(
      "UPLOAD CANDIDATE PROFILE DOCUMENTS ERROR:",
      error
    );

    return res.status(500).json({
      message: error.message,
    });
  }
};

//
// =====================================================
// GET MY CANDIDATE PROFILE
// =====================================================
//

exports.getCandidateProfile = async (req, res) => {
  try {
    if (req.user.role !== "candidate") {
      return res.status(403).json({
        message: "Only candidates can access their candidate profile.",
      });
    }

    const profile = await CandidateProfile.findOne({
      user: req.user._id,
    }).populate(
      "academyCertificates.course",
      "title"
    );

    // IMPORTANT:
    // A newly registered candidate will not have a
    // CandidateProfile until they complete the profile builder.
    if (!profile) {
      return res.status(404).json({
        message: "Candidate profile not found.",
        profileExists: false,
      });
    }

    return res.json(profile);
  } catch (err) {
    console.error("GET CANDIDATE PROFILE ERROR:", err);

    return res.status(500).json({
      message: err.message,
    });
  }
};


//
// =====================================================
// UPDATE / CREATE CANDIDATE PROFILE
// =====================================================
//

exports.updateCandidateProfile = async (req, res) => {
  try {
    if (req.user.role !== "candidate") {
      return res.status(403).json({
        message: "Only candidates can update candidate profiles.",
      });
    }

    let profile = await CandidateProfile.findOne({
      user: req.user._id,
    });

    // ==================================================
    // If the candidate has no profile yet, create it.
    // ==================================================

    if (!profile) {
      profile = new CandidateProfile({
        user: req.user._id,

        firstName: req.body.firstName,
        surname: req.body.surname,
        profilePhoto: req.body.profilePhoto,

        gender: req.body.gender,
        dateOfBirth: req.body.dateOfBirth,
        nationality: req.body.nationality,

        languages: req.body.languages || [],

        province: req.body.province,
        city: req.body.city,
        suburb: req.body.suburb,

        bio: req.body.bio,

        workerTypes: req.body.workerTypes || [],

        yearsExperience: req.body.yearsExperience || 0,
        expectedSalary: req.body.expectedSalary || 0,

        skills: req.body.skills || [],

        workPreferences: req.body.workPreferences || [],

        availabilityStatus: req.body.availabilityStatus,

        qualifications: req.body.qualifications || [],
        references: req.body.references || [],

        documents: req.body.documents || {},

        profileCompleted:
          req.body.profileCompleted === true,

        // A candidate cannot control this value.
        // New profiles start active.
        profileActive: true,
      });
    } else {
      // ==================================================
      // Existing profile — update allowed candidate fields
      // ==================================================

      const fields = [
        "firstName",
        "surname",
        "profilePhoto",
        "gender",
        "dateOfBirth",
        "nationality",
        "languages",
        "province",
        "city",
        "suburb",
        "bio",
        "workerTypes",
        "yearsExperience",
        "expectedSalary",
        "skills",
        "workPreferences",
        "availabilityStatus",
        "qualifications",
        "references",
        "documents",
        "profileCompleted",
      ];

      fields.forEach((field) => {
        if (req.body[field] !== undefined) {
          profile[field] = req.body[field];
        }
      });

      // ==================================================
      // IMPORTANT:
      // profileActive is deliberately NOT included above.
      //
      // Candidates cannot activate themselves after an
      // admin has deactivated their profile.
      // ==================================================
    }

    await profile.save();

    return res.json(profile);
  } catch (err) {
    console.error("UPDATE CANDIDATE PROFILE ERROR:", err);

    return res.status(500).json({
      message: err.message,
    });
  }
};

//
// =====================================================
// CREATE EMPLOYER PROFILE
// =====================================================
//

exports.createEmployerProfile = async (req, res) => {
  try {
    if (req.user.role !== "employer") {
      return res.status(403).json({
        message: "Only employers can create profiles.",
      });
    }

    const existingProfile = await EmployerProfile.findOne({
      user: req.user._id,
    });

    if (existingProfile) {
      return res.status(400).json({
        message: "Employer profile already exists.",
      });
    }

    const profile = await EmployerProfile.create({
      user: req.user._id,

      contactPerson: req.body.contactPerson,

      employerType: req.body.employerType,

      householdName: req.body.householdName,

      province: req.body.province,

      city: req.body.city,

      suburb: req.body.suburb,

      lookingFor: req.body.lookingFor || [],

      employmentTypes:
        req.body.employmentTypes || [],

      preferredGender:
        req.body.preferredGender || "Any",

      preferredAgeMin:
        req.body.preferredAgeMin || 18,

      preferredAgeMax:
        req.body.preferredAgeMax || 65,

      preferredExperience:
        req.body.preferredExperience || 0,

      preferredNationalities:
        req.body.preferredNationalities || [],

      preferredLanguages:
        req.body.preferredLanguages || [],

      salaryOffered:
        req.body.salaryOffered || 0,

      profileActive: true,

      hiringStatus: "Looking",
    });

    res.status(201).json(profile);

  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
};

//
// =====================================================
// GET MY EMPLOYER PROFILE
// =====================================================
//

exports.getEmployerProfile = async (req, res) => {
  try {

    const profile =
      await EmployerProfile.findOne({
        user: req.user._id,
      }).populate(
        "savedCandidates"
      );

    if (!profile) {
      return res.status(404).json({
        message: "Employer profile not found.",
      });
    }

    res.json(profile);

  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
};

//
// =====================================================
// UPDATE EMPLOYER PROFILE
// =====================================================
//

exports.updateEmployerProfile = async (req, res) => {
  try {

    const profile =
      await EmployerProfile.findOne({
        user: req.user._id,
      });

    if (!profile) {
      return res.status(404).json({
        message: "Employer profile not found.",
      });
    }

    const fields = [

      "contactPerson",

      "employerType",

      "householdName",

      "province",

      "city",

      "suburb",

      "lookingFor",

      "employmentTypes",

      "preferredGender",

      "preferredAgeMin",

      "preferredAgeMax",

      "preferredExperience",

      "preferredNationalities",

      "preferredLanguages",

      "salaryOffered",

      "profileActive",

      "hiringStatus"

    ];

    fields.forEach((field) => {

      if (req.body[field] !== undefined) {

        profile[field] = req.body[field];

      }

    });

    await profile.save();

    res.json(profile);

  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
};

// ======================================
// SAVE CANDIDATE
// ======================================

exports.saveCandidate = async (req, res) => {
  try {
    if (req.user.role !== "employer") {
      return res.status(403).json({
        message: "Only employers can save candidates.",
      });
    }

    const { candidateId } = req.params;

    const candidate = await CandidateProfile.findById(
      candidateId
    );

    if (!candidate) {
      return res.status(404).json({
        message: "Candidate not found.",
      });
    }

    // ==========================================
    // Employers can only save active candidates
    // ==========================================

    if (candidate.profileActive !== true) {
      return res.status(404).json({
        message: "Candidate profile is not available.",
      });
    }

    const existing = await SavedCandidate.findOne({
      employer: req.user._id,
      candidate: candidateId,
    });

    if (existing) {
      return res.status(400).json({
        message: "Candidate already saved.",
      });
    }

    const saved = await SavedCandidate.create({
      employer: req.user._id,
      candidate: candidateId,
    });

    // ==============================
    // Create notification
    // ==============================

    const employer = await User.findById(
      req.user._id
    ).select("firstName name");

    const employerName =
      employer?.firstName ||
      employer?.name?.split(" ")[0] ||
      "An employer";

    await createNotification({
      user: candidate.user,
      sender: req.user._id,
      title: "Profile Saved",
      message: `${employerName} saved your profile.`,
      type: "candidate_saved",
      action: "open_profile",
      actionData: {
        employerId: req.user._id,
        employerName: employerName,
      },
    });

    return res.status(201).json(saved);

  } catch (err) {
    console.error(
      "SAVE CANDIDATE ERROR:",
      err
    );

    return res.status(500).json({
      message: err.message,
    });
  }
};


// ======================================
// GET SAVED CANDIDATES
// ======================================

exports.getSavedCandidates = async (req, res) => {
  try {
    if (req.user.role !== "employer") {
      return res.status(403).json({
        message: "Only employers can access saved candidates.",
      });
    }

    const saved = await SavedCandidate.find({
      employer: req.user._id,
    })
      .populate({
        path: "candidate",
        match: {
          profileActive: true,
        },
        populate: {
          path: "user",
          select:
            "name email profilePhoto verifiedBadge",
        },
      })
      .sort({
        createdAt: -1,
      });

    // ==========================================
    // Mongoose leaves candidate as null when the
    // match condition fails.
    //
    // Remove those inactive candidates from the
    // response while keeping their SavedCandidate
    // record in the database.
    // ==========================================

    const activeSavedCandidates = saved.filter(
      (item) => item.candidate !== null
    );

    return res.json(activeSavedCandidates);

  } catch (err) {
    console.error(
      "GET SAVED CANDIDATES ERROR:",
      err
    );

    return res.status(500).json({
      message: err.message,
    });
  }
};

// ======================================
// REMOVE SAVED CANDIDATE
// ======================================

exports.removeSavedCandidate =
  async (req, res) => {
    try {

      const removed = await SavedCandidate.findOneAndDelete({
        employer: req.user._id,
        candidate: req.params.candidateId,
      });

      if (!removed) {
        return res.status(404).json({
          message: "Saved candidate not found.",
        });
      }

      res.json({
        message: "Candidate removed.",
      });

    } catch (err) {
      res.status(500).json({
        message: err.message,
      });
    }
  };


//
// =====================================================
// SEARCH CANDIDATES
// =====================================================
//

exports.searchCandidates = async (req, res) => {
  try {
    const employerProfile =
        await EmployerProfile.findOne({
            user: req.user._id
        });

    if (!employerProfile) {
        return res.status(404).json({
            message: "Employer profile not found."
        });
    }

    if (!employerProfile.profileActive) {
        return res.status(403).json({
            message:
                "Activate your profile before searching candidates."
        });
    }

    const {
      workerType,
      province,
      city,
      gender,
      nationality,
      language,
      availability,
      workPreference,
      verified,
      minExperience,
      maxExperience,
      minSalary,
      maxSalary,
      keyword
    } = req.query;

    const filter = {
      profileActive: true
    };


    // -----------------------------
    // Worker Type
    // -----------------------------

    if (workerType) {
      filter.workerTypes = workerType;
    }

    // -----------------------------
    // Province
    // -----------------------------

    if (province) {
      filter.province = province;
    }

    // -----------------------------
    // City
    // -----------------------------

    if (city) {
      filter.city = city;
    }

    // -----------------------------
    // Gender
    // -----------------------------

    if (gender) {
      filter.gender = gender;
    }

    // -----------------------------
    // Nationality
    // -----------------------------

    if (nationality) {
      filter.nationality = nationality;
    }

    // -----------------------------
    // Language
    // -----------------------------

    if (language) {
      filter.languages = language;
    }

    // -----------------------------
    // Availability
    // -----------------------------

    if (availability) {
      filter.availabilityStatus = availability;
    }

    // -----------------------------
    // Work Preference
    // -----------------------------

    if (workPreference) {
      filter.workPreferences = workPreference;
    }

    // -----------------------------
    // Experience
    // -----------------------------

    if (minExperience || maxExperience) {

      filter.yearsExperience = {};

      if (minExperience) {
        filter.yearsExperience.$gte =
          Number(minExperience);
      }

      if (maxExperience) {
        filter.yearsExperience.$lte =
          Number(maxExperience);
      }

    }

    // -----------------------------
    // Salary
    // -----------------------------

    if (minSalary || maxSalary) {

      filter.expectedSalary = {};

      if (minSalary) {
        filter.expectedSalary.$gte =
          Number(minSalary);
      }

      if (maxSalary) {
        filter.expectedSalary.$lte =
          Number(maxSalary);
      }

    }

    // -----------------------------
    // Keyword Search
    // -----------------------------

    if (keyword) {

      filter.$or = [

        {
          bio: {
            $regex: keyword,
            $options: "i"
          }
        },

        {
          skills: {
            $in: [
              new RegExp(keyword, "i")
            ]
          }
        },

        {
          workerTypes: {
            $in: [
              new RegExp(keyword, "i")
            ]
          }
        },

        {
          languages: {
            $in: [
              new RegExp(keyword, "i")
            ]
          }
        }

      ];

    }

    // -----------------------------
    // Fetch Candidates
    // -----------------------------

    let candidates =
      await CandidateProfile
        .find(filter)
        .populate(
          "user",
          "name subscriptionStatus verifiedBadge"
        );

    // -----------------------------
    // Verified Filter
    // -----------------------------

    if (verified === "true") {

      candidates = candidates.filter(candidate =>
        candidate.user?.verifiedBadge === true
      );

    }

    res.json(candidates);

  }

  catch (err) {

    res.status(500).json({
      error: err.message
    });

  }

};

//
// =====================================================
// ACTIVATE EMPLOYER PROFILE
// =====================================================
//

exports.activateEmployerProfile = async (req, res) => {
  try {

    const profile = await EmployerProfile.findOne({
      user: req.user._id
    });

    if (!profile) {
      return res.status(404).json({
        message: "Employer profile not found."
      });
    }

    profile.profileActive = true;
    profile.hiringStatus = "Looking";

    await profile.save();

    refreshAdminDashboard();

    res.json({
      message: "Employer profile activated.",
      profile
    });

  } catch (err) {

    res.status(500).json({
      error: err.message
    });

  }
};

//
// =====================================================
// DEACTIVATE EMPLOYER PROFILE
// =====================================================
//

exports.deactivateEmployerProfile = async (req, res) => {
  try {

    const profile = await EmployerProfile.findOne({
      user: req.user._id
    });

    if (!profile) {
      return res.status(404).json({
        message: "Employer profile not found."
      });
    }

    profile.profileActive = false;
    profile.hiringStatus = "Paused";

    await profile.save();

    refreshAdminDashboard();

    res.json({
      message: "Employer profile paused.",
      profile
    });

  } catch (err) {

    res.status(500).json({
      error: err.message
    });

  }
};

//
// =====================================================
// GET CANDIDATE CONTACT DETAILS
// (SUBSCRIBED EMPLOYERS ONLY)
// =====================================================
//

exports.getCandidateContact = async (req, res) => {
  try {

    if (req.user.role !== "employer") {
      return res.status(403).json({
        message: "Employers only."
      });
    }

    const employer = await User.findById(req.user._id);

    if (
      employer.subscriptionStatus !== "active"
    ) {

      return res.status(403).json({
        message:
          "An active subscription is required to view contact details."
      });

    }

    const candidate =
      await CandidateProfile.findById(
        req.params.candidateId
      )
      .populate(
        "user",
        "name email phone"
      );

    if (!candidate) {

      return res.status(404).json({
        message: "Candidate not found."
      });

    }

    res.json({

      firstName: candidate.firstName,

      phone: candidate.user.phone,

      email: candidate.user.email

    });

  }

  catch (err) {

    res.status(500).json({
      error: err.message
    });

  }

};

//
// =====================================================
// ADMIN - GET ALL CANDIDATES
// =====================================================
//

exports.getAllCandidates = async (req, res) => {
  try {

    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Admin only."
      });
    }

    const candidates =
      await CandidateProfile.find()
      .populate(
        "user",
        "name email phone subscriptionStatus verifiedBadge createdAt"
      )
      .sort({
        createdAt: -1
      });

    res.json(candidates);

  } catch (err) {

    res.status(500).json({
      error: err.message
    });

  }
};

//
// =====================================================
// ADMIN - GET ALL EMPLOYERS
// =====================================================
//

exports.getAllEmployers = async (req, res) => {
  try {

    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Admin only."
      });
    }

    const employers =
      await EmployerProfile.find()
      .populate(
        "user",
        "name email phone subscriptionStatus createdAt"
      )
      .sort({
        createdAt: -1
      });

    res.json(employers);

  } catch (err) {

    res.status(500).json({
      error: err.message
    });

  }
};

// =====================================================
// ADMIN - GET SINGLE EMPLOYER PROFILE
// =====================================================

exports.getAdminEmployerById = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Admin only.",
      });
    }

    const employer = await EmployerProfile.findById(
      req.params.employerId
    ).populate(
      "user",
      "name email phone profilePhoto accountStatus subscriptionStatus subscriptionExpiry createdAt lastLogin"
    );

    if (!employer) {
      return res.status(404).json({
        message: "Employer profile not found.",
      });
    }

    return res.json(employer);
  } catch (err) {
    console.error("ADMIN GET EMPLOYER ERROR:", err);

    return res.status(500).json({
      message: err.message,
    });
  }
};

// =====================================================
// ADMIN - VERIFY CANDIDATE
// =====================================================

exports.verifyCandidate = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Admin only.",
      });
    }

    const candidate = await CandidateProfile.findById(
      req.params.candidateId
    );

    if (!candidate) {
      return res.status(404).json({
        message: "Candidate not found.",
      });
    }

    candidate.profileVerified = true;
    candidate.profileVerificationStatus = "verified";

    await candidate.save();

    await User.findByIdAndUpdate(candidate.user, {
      verifiedBadge: true,
      verificationStatus: "verified",
      isVerified: true,
    });

    refreshAdminDashboard();

    // ==========================
    // Notify Candidate
    // ==========================

    await createNotification({
      user: candidate.user,
      sender: req.user._id,
      title: "Verification Approved",
      message:
        "Congratulations! Your profile has been successfully verified.",
      type: "verification_approved",
      action: "open_profile",
      actionData: {
        candidateId: candidate._id,
      },
    });

    return res.json({
      message: "Candidate verified successfully.",
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message,
    });
  }
};

// =====================================================
// ADMIN - REJECT VERIFICATION
// =====================================================

exports.rejectCandidate = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Admin only.",
      });
    }

    const candidate = await CandidateProfile.findById(
      req.params.candidateId
    );

    if (!candidate) {
      return res.status(404).json({
        message: "Candidate not found.",
      });
    }

    candidate.profileVerified = false;
    candidate.profileVerificationStatus = "rejected";

    await candidate.save();

    await User.findByIdAndUpdate(candidate.user, {
      verificationStatus: "rejected",
      isVerified: false,
      verifiedBadge: false,
    });

    refreshAdminDashboard();

    // ==========================
    // Notify Candidate
    // ==========================

    await createNotification({
      user: candidate.user,
      sender: req.user._id,
      title: "Verification Rejected",
      message:
        "Unfortunately your verification was not approved. Please review your documents and submit them again.",
      type: "verification_rejected",
      action: "open_profile",
      actionData: {
        candidateId: candidate._id,
      },
    });

    return res.json({
      message: "Verification rejected.",
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message,
    });
  }
};

//
// =====================================================
// ADMIN - DASHBOARD STATS
// =====================================================
//

exports.getRecruitmentStats = async (req, res) => {
  try {

    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Admin only."
      });
    }

    const [
      candidates,
      employers,
      verifiedCandidates,
      activeCandidates,
      activeEmployers
    ] = await Promise.all([

      CandidateProfile.countDocuments(),

      EmployerProfile.countDocuments(),

      CandidateProfile.countDocuments({
        profileVerified: true
      }),

      CandidateProfile.countDocuments({
        profileActive: true
      }),

      EmployerProfile.countDocuments({
        profileActive: true
      })

    ]);

    res.json({

      candidates,

      employers,

      verifiedCandidates,

      activeCandidates,

      activeEmployers

    });

  } catch (err) {

    res.status(500).json({
      error: err.message
    });

  }
};

//
// =====================================================
// RETURNS SINGLE CANDIDATE
// =====================================================
//

exports.getCandidateById = async (req, res) => {
  try {
    const candidate = await CandidateProfile.findById(
      req.params.id
    ).populate(
      "user",
      "name profilePhoto verifiedBadge"
    );

    if (!candidate) {
      return res.status(404).json({
        message: "Candidate not found",
      });
    }

    // ==================================================
    // EMPLOYERS CAN ONLY VIEW ACTIVE CANDIDATES
    // ==================================================
    if (
      req.user.role === "employer" &&
      candidate.profileActive !== true
    ) {
      return res.status(404).json({
        message: "Candidate profile is not available.",
      });
    }

    return res.json(candidate);

  } catch (err) {
    console.error(
      "GET CANDIDATE BY ID ERROR:",
      err
    );

    return res.status(500).json({
      message: err.message,
    });
  }
};

// =====================================================
// ADMIN - GET SINGLE CANDIDATE PROFILE
// =====================================================

exports.getAdminCandidateById = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Admin only.",
      });
    }

    const candidate = await CandidateProfile.findById(
      req.params.candidateId
    ).populate(
      "user",
      "name email phone profilePhoto accountStatus subscriptionStatus subscriptionExpiry verifiedBadge isVerified verificationStatus hasPaidVerificationFee uploadedDocuments createdAt lastLogin"
    );

    if (!candidate) {
      return res.status(404).json({
        message: "Candidate profile not found.",
      });
    }

    return res.json(candidate);
  } catch (err) {
    console.error("ADMIN GET CANDIDATE ERROR:", err);

    return res.status(500).json({
      message: err.message,
    });
  }
};


  // ======================================
// GET USER PRESENCE
// ======================================

exports.getUserPresence = async (req, res) => {
  try {

    const user = await User.findById(req.params.userId)
      .select("isOnline lastSeen");

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    res.json({
      isOnline: user.isOnline,
      lastSeen: user.lastSeen
    });

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }
};

// =====================================================
// ADMIN - ACTIVATE CANDIDATE
// =====================================================

exports.adminActivateCandidate = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Admin only.",
      });
    }

    const candidate = await CandidateProfile.findById(
      req.params.candidateId
    );

    if (!candidate) {
      return res.status(404).json({
        message: "Candidate profile not found.",
      });
    }

    candidate.profileActive = true;
    await candidate.save();

    // Reactivate the associated user account
    await User.findByIdAndUpdate(candidate.user, {
      accountStatus: "active",
    });

    return res.json({
      message: "Candidate profile and account activated.",
      profile: candidate,
      accountStatus: "active",
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message,
    });
  }
};


// =====================================================
// ADMIN - DEACTIVATE CANDIDATE
// =====================================================

exports.adminDeactivateCandidate = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Admin only.",
      });
    }

    const candidate = await CandidateProfile.findById(
      req.params.candidateId
    );

    if (!candidate) {
      return res.status(404).json({
        message: "Candidate profile not found.",
      });
    }

    candidate.profileActive = false;
    await candidate.save();

    // Deactivate the associated user account
    await User.findByIdAndUpdate(candidate.user, {
      accountStatus: "inactive",
    });

    return res.json({
      message: "Candidate profile and account deactivated.",
      profile: candidate,
      accountStatus: "inactive",
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message,
    });
  }
};


// =====================================================
// ADMIN - ACTIVATE EMPLOYER
// =====================================================

exports.adminActivateEmployer = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Admin only.",
      });
    }

    const employer = await EmployerProfile.findById(
      req.params.employerId
    );

    if (!employer) {
      return res.status(404).json({
        message: "Employer profile not found.",
      });
    }

    employer.profileActive = true;
    employer.hiringStatus = "Looking";

    await employer.save();

    // Reactivate the associated user account
    await User.findByIdAndUpdate(employer.user, {
      accountStatus: "active",
    });

    return res.json({
      message: "Employer profile and account activated.",
      profile: employer,
      accountStatus: "active",
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message,
    });
  }
};


// =====================================================
// ADMIN - DEACTIVATE EMPLOYER
// =====================================================

exports.adminDeactivateEmployer = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Admin only.",
      });
    }

    const employer = await EmployerProfile.findById(
      req.params.employerId
    );

    if (!employer) {
      return res.status(404).json({
        message: "Employer profile not found.",
      });
    }

    employer.profileActive = false;
    employer.hiringStatus = "Paused";

    await employer.save();

    // Deactivate the associated user account
    await User.findByIdAndUpdate(employer.user, {
      accountStatus: "inactive",
    });

    return res.json({
      message: "Employer profile and account deactivated.",
      profile: employer,
      accountStatus: "inactive",
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message,
    });
  }
};


// =====================================================
// EMPLOYER - VIEW CANDIDATE DOCUMENT
// =====================================================

exports.viewCandidateDocument = async (req, res) => {
  try {
    // ==========================================
    // ADMIN OR EMPLOYER ONLY
    // ==========================================

    if (
      req.user.role !== "admin" &&
      req.user.role !== "employer"
    ) {
      return res.status(403).json({
        message:
          "You are not authorized to view candidate documents.",
      });
    }

    // ==========================================
    // EMPLOYER SUBSCRIPTION CHECK
    // ADMINS BYPASS THIS CHECK
    // ==========================================

    if (req.user.role === "employer") {
      const employer = await User.findById(req.user._id);

      const subscriptionActive =
        employer?.subscriptionStatus === "active" &&
        employer?.subscriptionExpiry &&
        new Date(employer.subscriptionExpiry) > new Date();

      if (!subscriptionActive) {
        return res.status(403).json({
          message:
            "An active subscription is required to view candidate documents.",
          subscriptionRequired: true,
        });
      }
    }

    // ==========================================
    // FIND CANDIDATE
    // ==========================================

    const candidate = await CandidateProfile.findById(
      req.params.candidateId
    );

    if (!candidate) {
      return res.status(404).json({
        message: "Candidate not found.",
      });
    }

    // ==========================================
    // DOCUMENT TYPE
    // ==========================================

    const { type } = req.params;
    const index =
      req.params.index !== undefined
        ? Number(req.params.index)
        : null;

    let storedFile = null;

    // ==========================================
    // ID DOCUMENT
    // ==========================================

    if (type === "idDocument") {
      storedFile = candidate.documents?.idDocument;
    }

    // ==========================================
    // POLICE CLEARANCE
    // ==========================================

    else if (type === "policeClearance") {
      storedFile = candidate.documents?.policeClearance;
    }

    // ==========================================
    // CV
    // ==========================================

    else if (type === "cv") {
      storedFile = candidate.documents?.cv;
    }

    // ==========================================
    // REFERENCE
    // ==========================================

    else if (type === "reference") {
      if (
        index === null ||
        !Number.isInteger(index) ||
        index < 0
      ) {
        return res.status(400).json({
          message: "Invalid reference index.",
        });
      }

      storedFile =
        candidate.references?.[index]?.file;
    }

    // ==========================================
    // QUALIFICATION CERTIFICATE
    // ==========================================

    else if (type === "qualification") {
      if (
        index === null ||
        !Number.isInteger(index) ||
        index < 0
      ) {
        return res.status(400).json({
          message: "Invalid qualification index.",
        });
      }

      storedFile =
        candidate.qualifications?.[index]?.certificateFile;
    }

    // ==========================================
    // INVALID DOCUMENT TYPE
    // ==========================================

    else {
      return res.status(400).json({
        message: "Invalid document type.",
      });
    }

    // ==========================================
    // DOCUMENT DOES NOT EXIST
    // ==========================================

    if (!storedFile) {
      return res.status(404).json({
        message: "Document not found.",
      });
    }

    // ==========================================
    // CLEAN STORED FILE PATH
    // ==========================================

    let filename = String(storedFile);

    // Remove full URL if one was stored
    try {
      if (
        filename.startsWith("http://") ||
        filename.startsWith("https://")
      ) {
        const parsedUrl = new URL(filename);
        filename = parsedUrl.pathname;
      }
    } catch (_error) {
      // Continue using original filename
    }

    // Remove leading slash
    filename = filename.replace(/^\/+/, "");

    // Remove uploads/ prefix if already included
    filename = filename.replace(/^uploads[\\/]/i, "");

    // Prevent path traversal
    filename = path.basename(filename);

    // ==========================================
    // BUILD ACTUAL FILE PATH
    // ==========================================

    const filePath = path.join(
      process.cwd(),
      "private-documents",
      filename
    );

    // ==========================================
    // CHECK FILE EXISTS
    // ==========================================

    if (!fs.existsSync(filePath)) {
      console.error(
        "CANDIDATE DOCUMENT NOT FOUND:",
        filePath
      );

      return res.status(404).json({
        message: "Document file not found on server.",
      });
    }

    // ==========================================
    // DETERMINE MIME TYPE
    // ==========================================

    const extension =
      path.extname(filename).toLowerCase();

    const mimeTypes = {
      ".pdf": "application/pdf",

      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",

      ".doc": "application/msword",
      ".docx":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

      ".xls": "application/vnd.ms-excel",
      ".xlsx":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

      ".txt": "text/plain",
    };

    const mimeType =
      mimeTypes[extension] ||
      "application/octet-stream";

    // ==========================================
    // SEND FILE INLINE
    // ==========================================

    res.setHeader(
      "Content-Type",
      mimeType
    );

    res.setHeader(
      "Content-Disposition",
      `inline; filename="${filename.replace(/"/g, "")}"`
    );

    res.setHeader(
      "Cache-Control",
      "private, no-store, max-age=0"
    );

    return res.sendFile(
      filePath,
      (err) => {
        if (err && !res.headersSent) {
          console.error(
            "DOCUMENT SEND ERROR:",
            err
          );

          return res.status(500).json({
            message: "Unable to open document.",
          });
        }
      }
    );

  } catch (error) {
    console.error(
      "VIEW CANDIDATE DOCUMENT ERROR:",
      error
    );

    return res.status(500).json({
      message: "Unable to view candidate document.",
    });
  }
};