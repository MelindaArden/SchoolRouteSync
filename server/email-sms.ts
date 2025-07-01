// Email-to-SMS gateway for T-Mobile delivery
import fetch from 'node-fetch';

export async function sendEmailToSMS(phoneNumber: string, message: string): Promise<boolean> {
  try {
    // T-Mobile email-to-SMS gateway
    const tmobileEmail = phoneNumber.replace(/\D/g, '').replace(/^1/, '') + '@tmomail.net';
    
    console.log(`Attempting email-to-SMS delivery to T-Mobile: ${tmobileEmail}`);
    
    // Use a webhook service to send email (placeholder for actual email service)
    const webhookUrl = 'https://maker.ifttt.com/trigger/sms_notification/with/key/YOUR_IFTTT_KEY';
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        value1: tmobileEmail,
        value2: 'AfterCare Alert',
        value3: message
      })
    });
    
    console.log(`Email-to-SMS gateway response: ${response.status}`);
    return response.ok;
  } catch (error) {
    console.error('Email-to-SMS gateway failed:', error);
    return false;
  }
}

export async function sendTMobileNotification(title: string, message: string, priority: string = 'medium'): Promise<void> {
  const phoneNumber = '8593142300'; // T-Mobile number without +1
  const priorityText = priority === 'urgent' ? 'URGENT' : priority === 'high' ? 'HIGH' : 'NOTICE';
  const smsText = `${priorityText}: ${title} - ${message}`;
  
  console.log('Attempting T-Mobile notification via email-to-SMS...');
  
  const success = await sendEmailToSMS(phoneNumber, smsText);
  
  if (success) {
    console.log('T-Mobile notification sent via email-to-SMS gateway');
  } else {
    console.error('T-Mobile notification failed via email-to-SMS gateway');
  }
}