exports.calculateProfileCompletion = (profile) => {
    const checks = [
        profile.profilePhoto,
        profile.bio,
        profile.workerType,
        profile.skills?.length > 0,
        profile.yearsExperience,
        profile.city,
        profile.province,
        profile.uploadedDocuments?.idDocument,
        profile.uploadedDocuments?.references,
        profile.uploadedDocuments?.qualifications,
    ];

    const completed = checks.filter(Boolean).length;

    return {
        percentage: Math.round((completed / checks.length) * 100),

        missing: {
            profilePhoto: !profile.profilePhoto,
            bio: !profile.bio,
            workerType: !profile.workerType,
            skills: !profile.skills?.length,
            yearsExperience: !profile.yearsExperience,
            city: !profile.city,
            province: !profile.province,
            idDocument: !profile.uploadedDocuments?.idDocument,
            references: !profile.uploadedDocuments?.references,
            qualifications:
                !profile.uploadedDocuments?.qualifications,
        },
    };
};