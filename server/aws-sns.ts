// AWS SNS SMS Service Alternative
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

const snsClient = new SNSClient({ 
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

export async function sendSNSSMS(to: string, message: string): Promise<boolean> {
  try {
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      console.log('AWS SNS credentials not configured - skipping');
      return false;
    }

    console.log(`Attempting to send SMS via AWS SNS to ${to}: ${message.substring(0, 50)}...`);
    
    const command = new PublishCommand({
      PhoneNumber: to,
      Message: message,
      MessageAttributes: {
        'AWS.SNS.SMS.SMSType': {
          DataType: 'String',
          StringValue: 'Transactional'
        }
      }
    });

    const result = await snsClient.send(command);
    console.log(`AWS SNS SMS sent successfully to ${to}, MessageId: ${result.MessageId}`);
    return true;
  } catch (error) {
    console.error(`AWS SNS SMS failed to ${to}:`, error);
    return false;
  }
}

export async function notifyAdminsViaSNS(title: string, message: string, priority: string = 'medium'): Promise<void> {
  const adminNumbers = ['+18593142300'];
  const priorityText = priority === 'urgent' ? 'URGENT' : priority === 'high' ? 'HIGH' : 'NOTICE';
  const smsText = `${priorityText}: ${title} - ${message}`;
  
  console.log('Sending AWS SNS SMS notifications to admins...');
  
  for (const number of adminNumbers) {
    try {
      const success = await sendSNSSMS(number, smsText);
      if (success) {
        console.log(`AWS SNS SMS delivered to admin at ${number}`);
      } else {
        console.error(`Failed to deliver AWS SNS SMS to admin at ${number}`);
      }
    } catch (error) {
      console.error(`Error sending AWS SNS SMS to ${number}:`, error);
    }
  }
}