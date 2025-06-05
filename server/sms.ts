import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

if (!accountSid || !authToken || !twilioPhoneNumber) {
  console.warn('Twilio credentials not configured. SMS notifications will not work.');
}

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

export async function sendSMS(to: string, message: string): Promise<boolean> {
  if (!client || !twilioPhoneNumber) {
    console.warn('SMS service not configured');
    return false;
  }

  try {
    await client.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: to,
    });
    console.log(`SMS sent successfully to ${to}`);
    return true;
  } catch (error) {
    console.error('Failed to send SMS:', error);
    return false;
  }
}

export async function sendSMSToAdmins(adminMobileNumbers: string[], message: string): Promise<void> {
  if (!client || !twilioPhoneNumber) {
    console.warn('SMS service not configured - skipping SMS notifications');
    return;
  }

  const sendPromises = adminMobileNumbers
    .filter(number => number && number.trim().length > 0)
    .map(async (number) => {
      try {
        await sendSMS(number, message);
      } catch (error) {
        console.error(`Failed to send SMS to ${number}:`, error);
      }
    });

  await Promise.all(sendPromises);
}