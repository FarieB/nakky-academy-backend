exports.calculateProfileCompletion = (profile) => {

    if (!profile) {
        return {
            percentage: 0,
            missing: {
                profilePhoto: true,
                bio: true,
                workerType: true,
                skills: true,
                yearsExperience: true,
                city: true,
                province: true,
                idDocument: true,
                references: true,
                qualifications: true,
            },
        };
    }

    const checks = [
        profile.profilePhoto,
        profile.bio,
        profile.workerTypes?.length > 0,
        profile.skills?.length > 0,
        profile.yearsExperience > 0,
        profile.city,
        profile.province,
        profile.documents?.idDocument,
        profile.documents?.references,
        profile.documents?.qualifications,
    ];

    const completed = checks.filter(Boolean).length;

    return {
        percentage: Math.round(
            (completed / checks.length) * 100
        ),

        missing: {
            profilePhoto: !profile.profilePhoto,
            bio: !profile.bio,
            workerType: !(profile.workerTypes?.length),
            skills: !(profile.skills?.length),
            yearsExperience: !(profile.yearsExperience > 0),
            city: !profile.city,
            province: !profile.province,
            idDocument: !profile.documents?.idDocument,
            references: !profile.documents?.references,
            qualifications: !profile.documents?.qualifications,
        },
    };
};