const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { check, validationResult } = require("express-validator");
const SessionNote = require("../models/SessionNote");
const Appointment = require("../models/Appointment");

// Create session note
router.post(
  "/",
  [
    auth,
    [
      check("appointment", "Appointment ID is required").not().isEmpty(),
      check("notes", "Notes are required").not().isEmpty(),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { appointment, notes, attachments } = req.body;

      // Check if appointment exists and belongs to counselor
      const appointmentDoc = await Appointment.findById(appointment);
      if (!appointmentDoc) {
        return res.status(404).json({ msg: "Appointment not found" });
      }
      if (appointmentDoc.counselor.toString() !== req.user.id) {
        return res.status(401).json({ msg: "Not authorized" });
      }

      // Create session note
      const sessionNote = new SessionNote({
        appointment,
        counselor: req.user.id,
        client: appointmentDoc.client,
        notes,
        attachments: attachments || [],
      });

      await sessionNote.save();
      res.json(sessionNote);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);

// Get session notes for appointment
router.get("/appointment/:id", auth, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ msg: "Appointment not found" });
    }

    // Check if user is authorized (client or counselor for this appointment)
    if (
      appointment.client.toString() !== req.user.id &&
      appointment.counselor.toString() !== req.user.id
    ) {
      return res.status(401).json({ msg: "Not authorized" });
    }

    const sessionNotes = await SessionNote.find({
      appointment: req.params.id,
    }).sort({ createdAt: -1 });
    res.json(sessionNotes);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

module.exports = router;
