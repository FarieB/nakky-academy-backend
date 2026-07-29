const mongoose = require("mongoose");

const SavedCandidateSchema = new mongoose.Schema(
  {
    employer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CandidateProfile",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate saves
SavedCandidateSchema.index(
  {
    employer: 1,
    candidate: 1,
  },
  {
    unique: true,
  }
);

module.exports =
  mongoose.models.SavedCandidate ||
  mongoose.model(
    "SavedCandidate",
    SavedCandidateSchema
  );