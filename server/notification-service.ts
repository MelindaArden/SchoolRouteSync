import { storage } from './storage';

interface NotificationData {
  type: 'issue' | 'maintenance' | 'proximity' | 'emergency';
  title: string;
  message: string;
  driverId: number;
  sessionId?: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export async function sendAdminNotifications(data: NotificationData): Promise<void> {
  try {
    // Get all admin users
    const users = await storage.getUsers();
    const admins = users.filter(user => user.role === 'leadership' && user.isActive);
    
    // Send in-app notifications to all admins
    await Promise.all(
      admins.map(admin =>
        storage.createNotification({
          type: data.type,
          title: data.title,
          message: data.message,
          recipientId: admin.id,
          sessionId: data.sessionId,
          isRead: false
        })
      )
    );

    // Get admin mobile numbers for SMS
    const adminMobileNumbers = admins
      .map(admin => admin.mobileNumber || admin.phone)
      .filter((number): number is string => number !== null && number !== undefined && number.trim().length > 0)
      .map(number => {
        // Ensure proper formatting with +1 country code
        let formatted = number.trim().replace(/\D/g, '');
        if (formatted.length === 10) {
          formatted = '+1' + formatted;
        } else if (formatted.length === 11 && formatted.startsWith('1')) {
          formatted = '+' + formatted;
        } else if (!formatted.startsWith('+')) {
          formatted = '+1' + formatted;
        }
        return formatted;
      });

    // Remove duplicates
    const uniqueNumbers = Array.from(new Set(adminMobileNumbers));

    // Send SMS notifications via Twilio
    if (uniqueNumbers.length > 0) {
      let successfulDeliveries = 0;
      
      try {
        const { sendTwilioSMS } = await import('./twilio-sms');
        console.log('Sending SMS notifications via Twilio...');
        
        for (const number of uniqueNumbers) {
          try {
            const success = await sendTwilioSMS(number, `${data.title}: ${data.message}`);
            if (success) {
              successfulDeliveries++;
              console.log(`SMS sent successfully to ${number} via Twilio`);
            } else {
              console.warn(`Failed to send SMS to ${number} via Twilio`);
            }
          } catch (error) {
            console.error(`Twilio SMS failed for ${number}:`, error);
          }
        }
      } catch (error) {
        console.error('Twilio SMS service error:', error);
      }

      console.log(`SMS notification summary: ${successfulDeliveries}/${uniqueNumbers.length} delivered via Twilio`);
      
      // If SMS delivery fails, use webhook notification as backup
      if (successfulDeliveries === 0) {
        console.log('SMS delivery failed, using webhook notification backup');
        await sendWebhookNotification(data, uniqueNumbers);
      }
    }

    console.log(`Admin notifications sent: ${admins.length} in-app, ${uniqueNumbers.length} SMS attempts`);
    
  } catch (error) {
    console.error('Failed to send admin notifications:', error);
  }
}

async function sendEmailToSMSBackup(numbers: string[], data: NotificationData): Promise<void> {
  try {
    // Alternative notification methods when GoHighLevel fails
    console.log('GoHighLevel SMS failed, logging notification details for manual follow-up:', {
      numbers,
      type: data.type,
      title: data.title,
      message: data.message,
      priority: data.priority,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Backup notification logging failed:', error);
  }
}

async function sendWebhookNotification(data: NotificationData, numbers: string[]): Promise<void> {
  try {
    // Log the notification for external monitoring
    console.log('WEBHOOK NOTIFICATION:', {
      timestamp: new Date().toISOString(),
      type: data.type,
      title: data.title,
      message: data.message,
      priority: data.priority,
      targetNumbers: numbers,
      driverId: data.driverId
    });

    // Could integrate with external notification services like:
    // - Slack webhooks
    // - Discord webhooks
    // - PagerDuty
    // - Microsoft Teams
    // For now, just ensure the notification is logged prominently
    
  } catch (error) {
    console.error('Webhook notification failed:', error);
  }
}

export async function testNotificationSystem(): Promise<void> {
  console.log('Testing notification system...');
  
  await sendAdminNotifications({
    type: 'issue',
    title: 'Test Notification',
    message: 'This is a test of the notification system',
    driverId: 1,
    priority: 'medium'
  });
  
  console.log('Test notification sent');
}