const checkVerified = (req, res, next) => {
  const user = req.user;

  if (user.role !== "candidate")
    return res.status(403).json({ message: "Access denied" });

  if (!user.isVerified)
    return res.status(403).json({ message: "Profile not verified. Upload documents for verification." });

  next();
  return null;
};

module.exports = checkVerified;
