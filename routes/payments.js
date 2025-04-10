const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { check, validationResult } = require("express-validator");
const Payment = require("../models/Payment");
const Appointment = require("../models/Appointment");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// Create payment intent
router.post(
  "/create-payment-intent",
  [
    auth,
    [
      check("appointment", "Appointment ID is required").not().isEmpty(),
      check("amount", "Amount is required").isNumeric(),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { appointment, amount } = req.body;

      // Check if appointment exists and belongs to client
      const appointmentDoc = await Appointment.findById(appointment);
      if (!appointmentDoc) {
        return res.status(404).json({ msg: "Appointment not found" });
      }
      if (appointmentDoc.client.toString() !== req.user.id) {
        return res.status(401).json({ msg: "Not authorized" });
      }

      // Create payment intent with Stripe
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount * 100, // amount in cents
        currency: "usd",
        metadata: { appointment: appointment },
      });

      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);

// Confirm payment
router.post(
  "/confirm",
  [
    auth,
    [
      check("appointment", "Appointment ID is required").not().isEmpty(),
      check("amount", "Amount is required").isNumeric(),
      check("paymentMethod", "Payment method is required").not().isEmpty(),
      check("transactionId", "Transaction ID is required").not().isEmpty(),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { appointment, amount, paymentMethod, transactionId } = req.body;

      // Check if appointment exists and belongs to client
      const appointmentDoc = await Appointment.findById(appointment);
      if (!appointmentDoc) {
        return res.status(404).json({ msg: "Appointment not found" });
      }
      if (appointmentDoc.client.toString() !== req.user.id) {
        return res.status(401).json({ msg: "Not authorized" });
      }

      // Create payment record
      const payment = new Payment({
        appointment,
        client: req.user.id,
        counselor: appointmentDoc.counselor,
        amount,
        paymentMethod,
        status: "completed",
        transactionId,
      });

      await payment.save();

      // Update appointment status
      appointmentDoc.status = "scheduled";
      await appointmentDoc.save();

      res.json(payment);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);

// Get user payments
router.get("/", auth, async (req, res) => {
  try {
    let payments;
    if (req.user.role === "client") {
      payments = await Payment.find({ client: req.user.id })
        .populate("counselor", "firstName lastName")
        .populate("appointment", "date time type");
    } else if (req.user.role === "counselor") {
      payments = await Payment.find({ counselor: req.user.id })
        .populate("client", "firstName lastName")
        .populate("appointment", "date time type");
    } else {
      return res.status(401).json({ msg: "Not authorized" });
    }
    res.json(payments);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

module.exports = router;
