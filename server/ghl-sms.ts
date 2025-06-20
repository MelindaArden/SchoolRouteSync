import fetch from 'node-fetch';

const ghlApiKey = process.env.GHL_API_KEY;
const ghlLocationId = process.env.GHL_LOCATION_ID;

if (!ghlApiKey || !ghlLocationId) {
  console.warn('GoHighLevel credentials not configured. SMS notifications will not work.');
}

export async function sendGHLSMS(to: string, message: string): Promise<boolean> {
  if (!ghlApiKey || !ghlLocationId) {
    console.error('GoHighLevel not configured - missing API key or location ID');
    return false;
  }

  try {
    console.log(`Attempting to send SMS via GoHighLevel to ${to}: ${message.substring(0, 50)}...`);
    
    // Format phone number for GoHighLevel (remove any non-digits, ensure it has country code)
    let formattedNumber = to.replace(/\D/g, '');
    if (formattedNumber.length === 10) {
      formattedNumber = '1' + formattedNumber;
    }
    if (!formattedNumber.startsWith('1')) {
      formattedNumber = '1' + formattedNumber;
    }

    // Use the webhook/outbound SMS endpoint which is more direct
    const smsResponse = await fetch(`https://services.leadconnectorhq.com/hooks/yCZdLLRmyGvISyq4qYgP/webhook-trigger/sms-outbound`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ghlApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: `+${formattedNumber}`,
        message: message,
        locationId: ghlLocationId
      })
    });

    // If webhook fails, try the direct messaging API
    if (!smsResponse.ok) {
      console.log('Webhook approach failed, trying direct messaging API...');
      
      const directResponse = await fetch(`https://services.leadconnectorhq.com/messaging/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ghlApiKey}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28'
        },
        body: JSON.stringify({
          type: 'sms',
          contactPhone: `+${formattedNumber}`,
          message: message,
          locationId: ghlLocationId
        })
      });
      
      return directResponse;
    }
    
    return smsResponse;

    if (smsResponse.ok) {
      const result = await smsResponse.json() as { id?: string };
      console.log(`GoHighLevel SMS sent successfully to ${to}, Message ID: ${result.id || 'unknown'}`);
      return true;
    } else {
      const errorText = await smsResponse.text();
      console.error(`GoHighLevel SMS failed for ${to}:`, smsResponse.status, errorText);
      return false;
    }
  } catch (error) {
    console.error(`Failed to send GoHighLevel SMS to ${to}:`, error);
    return false;
  }
}

export async function notifyAdminsViaGHL(title: string, message: string, priority: string = 'medium'): Promise<void> {
  // Admin phone numbers - update these with your actual admin numbers
  const adminNumbers = ['+18593142300']; // Update with your verified GoHighLevel numbers
  
  const priorityEmoji = priority === 'urgent' ? '🚨🚨' : priority === 'high' ? '🚨' : '⚠️';
  const smsText = `${priorityEmoji} ${title}

${message}

Check admin dashboard for details.`;

  console.log('Sending GoHighLevel SMS notifications to admins...');
  
  for (const number of adminNumbers) {
    try {
      const success = await sendGHLSMS(number, smsText);
      if (success) {
        console.log(`GoHighLevel SMS delivered to admin at ${number}`);
      } else {
        console.error(`Failed to deliver GoHighLevel SMS to admin at ${number}`);
      }
    } catch (error) {
      console.error(`Error sending GoHighLevel SMS to ${number}:`, error);
    }
  }
}