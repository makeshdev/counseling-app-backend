const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { check, validationResult } = require("express-validator");
const Appointment = require("../models/Appointment");
const User = require("../models/User");

// Create appointment
router.post(
  "/",
  [
    auth,
    [
      check("counselor", "Counselor ID is required").not().isEmpty(),
      check("date", "Date is required").not().isEmpty(),
      check("time", "Time is required").not().isEmpty(),
      check("type", "Type is required").not().isEmpty(),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { counselor, date, time, duration, type } = req.body;

      // Check if counselor exists
      const counselorUser = await User.findById(counselor);
      if (!counselorUser || counselorUser.role !== "counselor") {
        return res.status(404).json({ msg: "Counselor not found" });
      }

      // Check if slot is available
      const existingAppointment = await Appointment.findOne({
        counselor,
        date,
        time,
        status: "scheduled",
      });
      if (existingAppointment) {
        return res.status(400).json({ msg: "Time slot already booked" });
      }

      // Create new appointment
      const appointment = new Appointment({
        client: req.user.id,
        counselor,
        date,
        time,
        duration: duration || 60,
        type,
        meetingLink: generateMeetingLink(), // Implement this function
      });

      await appointment.save();
      res.json(appointment);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);

// Get user appointments
router.get("/", auth, async (req, res) => {
  try {
    let appointments;
    if (req.user.role === "client") {
      appointments = await Appointment.find({ client: req.user.id }).populate(
        "counselor",
        "firstName lastName specialization"
      );
    } else if (req.user.role === "counselor") {
      appointments = await Appointment.find({
        counselor: req.user.id,
      }).populate("client", "firstName lastName");
    } else {
      return res.status(401).json({ msg: "Not authorized" });
    }
    res.json(appointments);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Update appointment status
router.put("/:id/status", auth, async (req, res) => {
  try {
    const { status } = req.body;

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ msg: "Appointment not found" });
    }

    // Check if user is authorized
    if (
      appointment.client.toString() !== req.user.id &&
      appointment.counselor.toString() !== req.user.id
    ) {
      return res.status(401).json({ msg: "Not authorized" });
    }

    appointment.status = status;
    await appointment.save();
    res.json(appointment);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

module.exports = router;
