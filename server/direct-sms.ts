import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

let twilioClient: twilio.Twilio | null = null;

if (accountSid && authToken) {
  twilioClient = twilio(accountSid, authToken);
}

export async function sendDirectSMS(to: string, message: string): Promise<boolean> {
  if (!twilioClient || !twilioPhoneNumber) {
    console.error('Twilio not configured - missing credentials');
    return false;
  }

  try {
    console.log(`Attempting to send SMS to ${to}: ${message.substring(0, 50)}...`);
    
    const result = await twilioClient.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: to
    });

    console.log(`SMS sent successfully to ${to}, SID: ${result.sid}, Status: ${result.status}`);
    return true;
  } catch (error) {
    console.error(`Failed to send SMS to ${to}:`, error);
    return false;
  }
}

export async function notifyAdminsDirectly(title: string, message: string, priority: string = 'medium'): Promise<void> {
  // Hardcoded admin numbers for reliable delivery
  // Update this with your verified phone number
  const adminNumbers = ['+18593142300']; // Change this to your verified number
  
  const priorityEmoji = priority === 'urgent' ? '🚨🚨' : priority === 'high' ? '🚨' : '⚠️';
  const smsText = `${priorityEmoji} ${title}

${message}

Check admin dashboard for details.`;

  console.log('Sending direct SMS notifications to admins...');
  
  for (const number of adminNumbers) {
    try {
      const success = await sendDirectSMS(number, smsText);
      if (success) {
        console.log(`Direct SMS delivered to admin at ${number}`);
      } else {
        console.error(`Failed to deliver SMS to admin at ${number}`);
      }
    } catch (error) {
      console.error(`Error sending SMS to ${number}:`, error);
    }
  }
}