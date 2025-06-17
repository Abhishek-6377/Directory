const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();

router.post('/send-mail', async (req, res) => {
  const { name, email, couponCode, paymentAmount } = req.body;

  try {
    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    const mailOptions = {
      // 🔥 FIX: "from" not "form"
      from: `"Your Brand" <${process.env.MAIL_USER}>`, 
      to: email,
      // 🔥 FIX: "subject" not "sbject"
      subject: `🎉 Welcome, ${name}!`,
      html: `
        <h2>Thanks for joining, ${name}!</h2>
        <p>You've successfully applied coupon <strong>${couponCode}</strong>.</p>
        <p>Total payment: <strong>$${paymentAmount}</strong></p>
        <p>We'll be in touch soon!</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ success: true, message: 'Email sent successfully' });
  } catch (err) {
    console.error('Email send error:', err);
    res.status(500).json({ success: false, message: 'Failed to send email' });
  }
});

module.exports = router;
