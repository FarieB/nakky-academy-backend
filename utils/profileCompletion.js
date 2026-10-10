
const hasText = (value) =>
  typeof value === "string" && value.trim().length > 0;

const hasItems = (value) =>
  Array.isArray(value) && value.length > 0;

exports.calculateProfileCompletion = (profile) => {
  const missing = {
    profilePhoto: !hasText(profile?.profilePhoto),
    bio: !hasText(profile?.bio),
    workerType: !hasItems(profile?.workerTypes),
    skills: !hasItems(profile?.skills),
    yearsExperience: !(Number(profile?.yearsExperience) > 0),
    city: !hasText(profile?.city),
    province: !hasText(profile?.province),
    idDocument: !hasText(profile?.documents?.idDocument),
    references: !hasItems(profile?.references),
    qualifications: !hasItems(profile?.qualifications),
  };

  const total = Object.keys(missing).length;
  const completed = Object.values(missing).filter(
    (isMissing) => !isMissing
  ).length;

  return {
    percentage: Math.round((completed / total) * 100),
    completed,
    total,
    missing,
  };
};
