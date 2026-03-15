const mongoose = require("mongoose");

const VerificationSchema = new mongoose.Schema(
{
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  idDocument: {
    type: String,
    required: true
  },

  policeClearance: {
    type: String
  },

  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending"
  },

  adminNotes: {
    type: String
  }

},
{ timestamps: true }
);

module.exports = mongoose.model("Verification", VerificationSchema);