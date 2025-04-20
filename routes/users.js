const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const User = require("../models/User");

// Get current user
router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Get all counselors
router.get("/counselors", async (req, res) => {
  try {
    const counselors = await User.find({ role: "counselor" }).select(
      "-password"
    );
    res.json(counselors);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Get counselor by ID
router.get("/counselors/:id", async (req, res) => {
  try {
    const counselor = await User.findById(req.params.id).select("-password");
    if (!counselor || counselor.role !== "counselor") {
      return res.status(404).json({ msg: "Counselor not found" });
    }
    res.json(counselor);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Update user profile
router.put("/:id", auth, async (req, res) => {
  try {
    const { firstName, lastName, bio, specialization, availableSlots } =
      req.body;

    let user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Authorization check
    if (user.id !== req.user.id && req.user.role !== "admin") {
      return res.status(401).json({ msg: "Not authorized" });
    }

    // Update fields
    user.firstName = firstName || user.firstName;
    user.lastName = lastName || user.lastName;
    user.bio = bio || user.bio;
    user.specialization = specialization || user.specialization;

    // Only update slots for counselors
    if (user.role === "counselor") {
      user.availableSlots = availableSlots || user.availableSlots;
    }

    await user.save();
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Admin endpoint to generate slots for all counselors
router.post("/counselors/generate-slots", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ msg: "Admin access required" });
    }

    const counselors = await User.find({ role: "counselor" });
    for (const counselor of counselors) {
      counselor.availableSlots = generateDemoSlots();
      await counselor.save();
    }

    res.json({ msg: `Updated slots for ${counselors.length} counselors` });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Reuse the same slot generator from User model
function generateDemoSlots() {
  const slots = [];
  const today = new Date();
  for (let i = 1; i <= 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    const dateStr = date.toISOString().split("T")[0];
    slots.push(
      `${dateStr}T10:00:00`,
      `${dateStr}T14:00:00`,
      `${dateStr}T16:00:00`
    );
  }
  return slots;
}

module.exports = router;
