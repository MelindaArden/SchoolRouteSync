import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

if (!accountSid || !authToken || !twilioPhoneNumber) {
  console.warn('Twilio credentials not configured. SMS notifications will not work.');
}

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

export async function sendTwilioSMS(to: string, message: string): Promise<boolean> {
  if (!client || !twilioPhoneNumber) {
    console.error('Twilio not configured - missing credentials');
    return false;
  }

  try {
    console.log(`Attempting to send SMS via Twilio to ${to}: ${message.substring(0, 50)}...`);
    
    // Format phone number to ensure it has country code
    let formattedNumber = to.trim();
    if (!formattedNumber.startsWith('+')) {
      formattedNumber = '+1' + formattedNumber.replace(/\D/g, '');
    }

    const result = await client.messages.create({
      body: message,
      messagingServiceSid: 'MG3bd8243776189a642bb343e4c447c48d', // Use Messaging Service for better T-Mobile delivery
      to: formattedNumber,
    });

    console.log(`SMS sent successfully to ${formattedNumber}, SID: ${result.sid}, Status: ${result.status}`);
    return true;
  } catch (error) {
    console.error(`Failed to send SMS to ${to}:`, error);
    return false;
  }
}

export async function notifyAdminsViaTwilio(title: string, message: string, priority: string = 'medium'): Promise<void> {
  // Admin phone numbers - update with your verified numbers
  const adminNumbers = ['+18593142300']; 
  
  // T-Mobile friendly format - avoid spam trigger words
  const priorityText = priority === 'urgent' ? 'Important' : priority === 'high' ? 'Priority' : 'Notice';
  const smsText = `${priorityText} - ${title}: ${message}`;

  console.log('Sending Twilio SMS notifications to admins...');
  
  for (const number of adminNumbers) {
    try {
      const success = await sendTwilioSMS(number, smsText);
      if (success) {
        console.log(`SMS delivered to admin at ${number}`);
      } else {
        console.error(`Failed to deliver SMS to admin at ${number}`);
      }
    } catch (error) {
      console.error(`Error sending SMS to ${number}:`, error);
    }
  }
}