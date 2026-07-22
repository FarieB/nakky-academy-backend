const User = require("../models/User");
const CandidateProfile = require("../models/CandidateProfile");
const EmployerProfile = require("../models/EmployerProfile");

//
// =====================================================
// CREATE CANDIDATE PROFILE
// =====================================================
//

exports.createCandidateProfile = async (req, res) => {
  try {
    if (req.user.role !== "employee") {
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

      yearsExperience:
        req.body.yearsExperience || 0,

      expectedSalary:
        req.body.expectedSalary || 0,

      skills: req.body.skills || [],

      workPreferences:
        req.body.workPreferences || [],

      availabilityStatus:
        req.body.availabilityStatus,

      qualifications:
        req.body.qualifications || [],

      references:
        req.body.references || [],

      documents:
        req.body.documents || {},

      profileCompleted: false,

      profileActive: true,
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
// GET MY CANDIDATE PROFILE
// =====================================================
//

exports.getCandidateProfile = async (req, res) => {
  try {
    const profile = await CandidateProfile.findOne({
      user: req.user._id,
    }).populate(
      "academyCertificates.course",
      "title"
    );

    if (!profile) {
      return res.status(404).json({
        message: "Candidate profile not found.",
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
// UPDATE CANDIDATE PROFILE
// =====================================================
//

exports.updateCandidateProfile = async (req, res) => {
  try {
    const profile = await CandidateProfile.findOne({
      user: req.user._id,
    });

    if (!profile) {
      return res.status(404).json({
        message: "Candidate profile not found.",
      });
    }

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
      "profileActive",
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

//
// =====================================================
// SAVE CANDIDATE
// =====================================================
//

exports.saveCandidate = async (req, res) => {
  try {

    const employer =
      await EmployerProfile.findOne({
        user: req.user._id,
      });

    if (!employer) {
      return res.status(404).json({
        message: "Employer profile not found.",
      });
    }

    if (
      !employer.savedCandidates.includes(
        req.params.candidateId
      )
    ) {

      employer.savedCandidates.push(
        req.params.candidateId
      );

      await employer.save();

    }

    res.json({
      message: "Candidate saved successfully.",
    });

  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
};

//
// =====================================================
// REMOVE SAVED CANDIDATE
// =====================================================
//

exports.removeSavedCandidate = async (req, res) => {
  try {

    const employer =
      await EmployerProfile.findOne({
        user: req.user._id,
      });

    if (!employer) {
      return res.status(404).json({
        message: "Employer profile not found.",
      });
    }

    employer.savedCandidates =
      employer.savedCandidates.filter(
        (candidate) =>
          candidate.toString() !==
          req.params.candidateId
      );

    await employer.save();

    res.json({
      message: "Candidate removed.",
    });

  } catch (err) {
    res.status(500).json({
      error: err.message,
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
// ACTIVATE CANDIDATE PROFILE
// =====================================================
//

exports.activateCandidateProfile = async (req, res) => {
  try {

    const profile = await CandidateProfile.findOne({
      user: req.user._id
    });

    if (!profile) {
      return res.status(404).json({
        message: "Candidate profile not found."
      });
    }

    profile.profileActive = true;

    await profile.save();

    res.json({
      message: "Profile activated.",
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
// DEACTIVATE CANDIDATE PROFILE
// =====================================================
//

exports.deactivateCandidateProfile = async (req, res) => {
  try {

    const profile = await CandidateProfile.findOne({
      user: req.user._id
    });

    if (!profile) {
      return res.status(404).json({
        message: "Candidate profile not found."
      });
    }

    profile.profileActive = false;

    await profile.save();

    res.json({
      message: "Profile deactivated.",
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

//
// =====================================================
// ADMIN - VERIFY CANDIDATE
// =====================================================
//

exports.verifyCandidate = async (req, res) => {
  try {

    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Admin only."
      });
    }

    const candidate =
      await CandidateProfile.findById(
        req.params.candidateId
      );

    if (!candidate) {
      return res.status(404).json({
        message: "Candidate not found."
      });
    }

    candidate.profileVerified = true;

    await candidate.save();

    await User.findByIdAndUpdate(
      candidate.user,
      {
        verifiedBadge: true,
        verificationStatus: "verified",
        isVerified: true
      }
    );

    res.json({
      message: "Candidate verified successfully."
    });

  } catch (err) {

    res.status(500).json({
      error: err.message
    });

  }
};

//
// =====================================================
// ADMIN - REJECT VERIFICATION
// =====================================================
//

exports.rejectCandidate = async (req, res) => {
  try {

    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Admin only."
      });
    }

    const candidate =
      await CandidateProfile.findById(
        req.params.candidateId
      );

    if (!candidate) {
      return res.status(404).json({
        message: "Candidate not found."
      });
    }

    candidate.profileVerified = false;

    await candidate.save();

    await User.findByIdAndUpdate(
      candidate.user,
      {
        verificationStatus: "rejected",
        isVerified: false,
        verifiedBadge: false
      }
    );

    res.json({
      message: "Verification rejected."
    });

  } catch (err) {

    res.status(500).json({
      error: err.message
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

exports.getCandidateById =
  async (req, res) => {
    try {

      const candidate =
        await CandidateProfile.findById(
          req.params.id
        ).populate(
          "user",
          "name profilePhoto verifiedBadge"
        );

      if (!candidate) {
        return res.status(404).json({
          message:
            "Candidate not found",
        });
      }

      res.json(candidate);

    } catch (err) {
      res.status(500).json({
        message: err.message,
      });
    }
  };