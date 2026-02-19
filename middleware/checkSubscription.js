const checkSubscription = (req, res, next) => {
  const user = req.user;
  const today = new Date();

  if (user.role !== "employer")
    return res.status(403).json({ message: "Access denied" });

  if (user.subscriptionStatus !== "active" || new Date(user.subscriptionExpiry) < today)
    return res.status(403).json({ message: "Subscription inactive. Pay R100 to continue." });

  next();
};

module.exports = checkSubscription;
