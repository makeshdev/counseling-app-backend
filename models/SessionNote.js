const mongoose = require("mongoose");

const SessionNoteSchema = new mongoose.Schema({
  appointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Appointment",
    required: true,
  },
  counselor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  client: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  notes: { type: String, required: true },
  attachments: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("SessionNote", SessionNoteSchema);
