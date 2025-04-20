const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ["client", "counselor", "admin"],
    default: "client",
  },
  specialization: {
    type: String,
    required: function () {
      return this.role === "counselor";
    },
  },
  bio: { type: String },
  profilePicture: { type: String },
  availableSlots: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
});

// Auto-generate slots for new counselors
UserSchema.pre("save", function (next) {
  if (this.role === "counselor" && this.availableSlots.length === 0) {
    this.availableSlots = generateDemoSlots();
  }
  next();
});

// Password hashing
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Helper function to generate demo slots
function generateDemoSlots() {
  const slots = [];
  const today = new Date();

  // Generate slots for next 7 days
  for (let i = 1; i <= 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    const dateStr = date.toISOString().split("T")[0];
    // Add slots at 10:00, 14:00, and 16:00
    slots.push(`${dateStr}T10:00:00`);
    slots.push(`${dateStr}T14:00:00`);
    slots.push(`${dateStr}T16:00:00`);
  }
  return slots;
}

module.exports = mongoose.model("User", UserSchema);
