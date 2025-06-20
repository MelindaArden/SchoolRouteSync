import { sendSMS } from './sms';
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

    // Try multiple SMS delivery methods
    if (uniqueNumbers.length > 0) {
      let successfulDeliveries = 0;
      
      // Method 1: Try GoHighLevel first
      const ghlResults = [];
      try {
        const { sendGHLSMS } = await import('./ghl-sms');
        console.log('Attempting SMS delivery via GoHighLevel...');
        
        for (const number of uniqueNumbers) {
          try {
            const success = await sendGHLSMS(number, `${data.title}: ${data.message}`);
            ghlResults.push({ number, success, method: 'gohighlevel' });
            if (success) {
              successfulDeliveries++;
              console.log(`SMS sent successfully to ${number} via GoHighLevel`);
            }
          } catch (error) {
            console.log(`GoHighLevel failed for ${number}, will try Twilio backup`);
            ghlResults.push({ number, success: false, method: 'gohighlevel', error });
          }
        }
      } catch (error) {
        console.log('GoHighLevel service unavailable, using Twilio backup');
      }

      // Method 2: Use Twilio for failed GoHighLevel attempts
      const failedNumbers = ghlResults.filter(r => !r.success).map(r => r.number);
      const remainingNumbers = ghlResults.length === 0 ? uniqueNumbers : failedNumbers;
      
      if (remainingNumbers.length > 0) {
        try {
          const { sendSMS } = await import('./sms');
          console.log(`Using Twilio backup for ${remainingNumbers.length} numbers...`);
          
          for (const number of remainingNumbers) {
            try {
              const success = await sendSMS(number, `${data.title}: ${data.message}`);
              if (success) {
                successfulDeliveries++;
                console.log(`Backup SMS sent successfully to ${number} via Twilio`);
              }
            } catch (error) {
              console.error(`Twilio backup failed for ${number}:`, error);
            }
          }
        } catch (error) {
          console.error('Twilio backup service error:', error);
        }
      }

      console.log(`SMS notification summary: ${successfulDeliveries}/${uniqueNumbers.length} delivered successfully`);
      
      // Method 3: If all SMS methods fail, use webhook notification
      if (successfulDeliveries === 0) {
        console.log('All SMS methods failed, using webhook notification');
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
    // Use email-to-SMS gateways as backup
    const carriers = [
      '@vtext.com',      // Verizon
      '@txt.att.net',    // AT&T
      '@tmomail.net',    // T-Mobile
      '@messaging.sprintpcs.com', // Sprint
      '@sms.myboostmobile.com'    // Boost
    ];

    // This would require an email service setup
    console.log('Email-to-SMS backup not configured, logging failed numbers:', numbers);
    
  } catch (error) {
    console.error('Email-to-SMS backup failed:', error);
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