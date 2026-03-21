const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');

admin.initializeApp();

const RESEND_API_KEY = process.env.RESEND_API_KEY || 're_placeholder_key';

const sendEmail = async (to, subject, text) => {
  console.log(`[Resend API] Sending to ${to}: ${subject}`);
  try {
    const response = await axios.post('https://api.resend.com/emails', {
      from: 'RedStone <onboarding@resend.dev>', // Resend might require verified domain
      to: [to, 'kartikdas.kd21@gmail.com'], // Also notify admin
      reply_to: 'kartikdas.kd21@gmail.com',
      subject: subject,
      text: text,
    }, {
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      }
    });
    console.log(`Email sent successfully to ${to}`);
  } catch (error) {
    console.error('Error sending email via Resend:', error.response ? error.response.data : error.message);
  }
};

// Placeholder for Twilio / WhatsApp Cloud API
const sendWhatsApp = async (to, message) => {
  console.log(`[WhatsApp Mock] Sending to ${to}: ${message}`);
  // e.g., twilioClient.messages.create({ body: message, from: 'whatsapp:+14155238886', to: `whatsapp:${to}` })
};

exports.onBookingStatusUpdate = functions.firestore
  .document('bookings/{bookingId}')
  .onUpdate(async (change, context) => {
    const newValue = change.after.data();
    const previousValue = change.before.data();

    // Only trigger when status changes
    if (newValue.status !== previousValue.status) {
      const { customerName, customerPhone, date, timeSlot, userId, status } = newValue;

      if (status === 'confirmed' || status === 'cancelled') {
        try {
          // Fetch user email
          const userRecord = await admin.auth().getUser(userId);
          const email = userRecord.email;

          let subject = '';
          let message = '';

          if (status === 'confirmed') {
            subject = 'Booking Confirmed - RedStone Barbershop';
            message = `Hey ${customerName}! Your RedStone appointment is confirmed for ${date} at ${timeSlot}. Get ready for a fresh look!`;
          } else if (status === 'cancelled') {
            subject = 'Booking Cancelled - RedStone Barbershop';
            message = `Hello ${customerName}, your appointment for ${date} at ${timeSlot} has been cancelled. We hope to see you again soon!`;
          }

          // Send Email
          if (email) {
            await sendEmail(email, subject, message);
          }

          // Send WhatsApp (if placeholder implemented)
          if (customerPhone && status === 'confirmed') {
            await sendWhatsApp(customerPhone, message);
          }

          console.log(`Notifications sent for booking ${context.params.bookingId} with status ${status}`);
        } catch (error) {
          console.error('Error sending notifications:', error);
        }
      }
    }
  });
