const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

// Placeholder for SendGrid / Nodemailer
const sendEmail = async (to, subject, text) => {
  console.log(`[Email Mock] Sending to ${to}: ${subject}`);
  // e.g., sgMail.send({ to, from: 'hello@neoncuts.com', subject, text })
};

// Placeholder for Twilio / WhatsApp Cloud API
const sendWhatsApp = async (to, message) => {
  console.log(`[WhatsApp Mock] Sending to ${to}: ${message}`);
  // e.g., twilioClient.messages.create({ body: message, from: 'whatsapp:+14155238886', to: `whatsapp:${to}` })
};

exports.onBookingConfirmed = functions.firestore
  .document('bookings/{bookingId}')
  .onUpdate(async (change, context) => {
    const newValue = change.after.data();
    const previousValue = change.before.data();

    // Only trigger when status changes to 'confirmed'
    if (newValue.status === 'confirmed' && previousValue.status !== 'confirmed') {
      const { customerName, customerPhone, date, timeSlot, userId } = newValue;

      try {
        // Fetch user email
        const userRecord = await admin.auth().getUser(userId);
        const email = userRecord.email;

        const message = `Hey ${customerName}! Your Neon Cuts appointment is confirmed for ${date} at ${timeSlot}. Get ready for a fresh look!`;

        // Send Email
        if (email) {
          await sendEmail(email, 'Booking Confirmed - Neon Cuts', message);
        }

        // Send WhatsApp
        if (customerPhone) {
          await sendWhatsApp(customerPhone, message);
        }

        console.log(`Notifications sent for booking ${context.params.bookingId}`);
      } catch (error) {
        console.error('Error sending notifications:', error);
      }
    }
  });
