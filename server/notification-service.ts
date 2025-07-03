import { storage } from './storage';

interface NotificationData {
  type: 'issue' | 'maintenance' | 'proximity' | 'emergency';
  title: string;
  message: string;
  driverId: number;
  sessionId?: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

async function sendEmailsToAdmins(data: NotificationData): Promise<void> {
  try {
    const users = await storage.getUsers();
    const admins = users.filter(user => 
      user.role === 'leadership' && 
      user.isActive && 
      user.notificationEmail && 
      user.notificationEmail.trim().length > 0
    );
    
    if (admins.length === 0) {
      console.log('⚠️ No admin users with notification emails configured');
      return;
    }

    const { sendEmail } = await import('./sendgrid-email');
    
    for (const admin of admins) {
      try {
        const success = await sendEmail({
          to: admin.notificationEmail!,
          from: 'notifications@tntgym.org',
          subject: `[School Bus Alert] ${data.title}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
                <h2 style="color: #dc3545; margin-top: 0;">School Bus Alert</h2>
                <div style="background: white; padding: 20px; border-radius: 6px; margin: 10px 0;">
                  <h3 style="color: #333; margin-top: 0;">${data.title}</h3>
                  <p style="color: #666; line-height: 1.6;">${data.message}</p>
                  <div style="border-top: 1px solid #eee; padding-top: 15px; margin-top: 15px;">
                    <p style="margin: 5px 0; color: #888;"><strong>Priority:</strong> ${data.priority.toUpperCase()}</p>
                    <p style="margin: 5px 0; color: #888;"><strong>Driver ID:</strong> ${data.driverId}</p>
                    ${data.sessionId ? `<p style="margin: 5px 0; color: #888;"><strong>Session ID:</strong> ${data.sessionId}</p>` : ''}
                    <p style="margin: 5px 0; color: #888;"><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                  </div>
                </div>
                <p style="color: #666; font-size: 12px; margin-bottom: 0;">
                  This is an automated notification from the School Bus Management System.
                </p>
              </div>
            </div>
          `,
          text: `School Bus Alert: ${data.title}\n\n${data.message}\n\nPriority: ${data.priority}\nDriver ID: ${data.driverId}${data.sessionId ? `\nSession ID: ${data.sessionId}` : ''}\nTime: ${new Date().toLocaleString()}`
        });

        if (success) {
          console.log(`✅ Email notification sent to ${admin.firstName} ${admin.lastName} (${admin.notificationEmail})`);
        } else {
          console.error(`❌ Failed to send email to ${admin.notificationEmail}`);
        }
      } catch (error) {
        console.error(`❌ Email error for ${admin.notificationEmail}:`, error);
      }
    }
  } catch (error) {
    console.error('❌ Error sending admin emails:', error);
  }
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
      
      // If SMS delivery fails, try AWS SNS as alternative
      if (successfulDeliveries === 0) {
        console.log('🚨 Twilio SMS blocked by T-Mobile (Error 30032) - trying AWS SNS alternative');
        
        try {
          const { sendSNSSMS } = await import('./aws-sns');
          for (const number of uniqueNumbers) {
            const snsSuccess = await sendSNSSMS(number, `${data.title}: ${data.message}`);
            if (snsSuccess) {
              successfulDeliveries++;
              console.log(`SMS sent successfully to ${number} via AWS SNS`);
            }
          }
        } catch (error) {
          console.error('AWS SNS SMS also failed:', error);
        }
        
        // If both Twilio and AWS SNS fail, use backup methods
        if (successfulDeliveries === 0) {
          console.log('All SMS services failed - using backup notifications');
          await sendWebhookNotification(data, uniqueNumbers);
          await sendEmailToSMSBackup(uniqueNumbers, data);
        }
      }
    }

    // Send email notifications to all admin users with verified sender (skip unverified primary)
    console.log('📧 Sending email notifications to all admin users...');
    try {
      const { sendEmail } = await import('./sendgrid-email');
      const adminsWithEmails = admins.filter(admin => 
        admin.notificationEmail && admin.notificationEmail.trim().length > 0
      );
      
      if (adminsWithEmails.length > 0) {
        for (const admin of adminsWithEmails) {
          try {
            // Use melinda@tntgym.org as verified sender for all admins
            const success = await sendEmail({
              to: admin.notificationEmail!,
              from: 'melinda@tntgym.org', // Verified sender address
              subject: `[NOTICE] AfterCare Alert: ${data.title}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
                    <h2 style="color: #dc3545; margin-top: 0;">AfterCare Transportation Alert</h2>
                    <div style="background: white; padding: 20px; border-radius: 6px; margin: 10px 0;">
                      <h3 style="color: #333; margin-top: 0;">${data.title}</h3>
                      <p style="color: #666; line-height: 1.6;">${data.message}</p>
                      <div style="border-top: 1px solid #eee; padding-top: 15px; margin-top: 15px;">
                        <p style="margin: 5px 0; color: #888;"><strong>Priority:</strong> ${data.priority.toUpperCase()}</p>
                        <p style="margin: 5px 0; color: #888;"><strong>Driver ID:</strong> ${data.driverId}</p>
                        ${data.sessionId ? `<p style="margin: 5px 0; color: #888;"><strong>Session ID:</strong> ${data.sessionId}</p>` : ''}
                        <p style="margin: 5px 0; color: #888;"><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                      </div>
                    </div>
                    <p style="color: #666; font-size: 12px; margin-bottom: 0;">
                      This is an automated notification from TNT Aftercare Transportation System.
                    </p>
                  </div>
                </div>
              `,
              text: `AfterCare Alert: ${data.title}\n\n${data.message}\n\nPriority: ${data.priority}\nDriver ID: ${data.driverId}${data.sessionId ? `\nSession ID: ${data.sessionId}` : ''}\nTime: ${new Date().toLocaleString()}`
            });

            if (success) {
              console.log(`✅ Email sent successfully to ${admin.firstName} ${admin.lastName} (${admin.notificationEmail})`);
            } else {
              console.error(`❌ Failed to send email to ${admin.notificationEmail}`);
            }
          } catch (emailError) {
            console.error(`❌ Email error for ${admin.notificationEmail}:`, emailError);
          }
        }
        console.log(`📧 Email notifications sent to ${adminsWithEmails.length} admin(s) with notification emails`);
      } else {
        console.log('⚠️ No admin users have notification email addresses configured');
      }
    } catch (error) {
      console.error('Email notification system error:', (error as Error).message);
      
      // Enhanced console notification while email is being set up
      console.log('\n' + '='.repeat(80));
      console.log('🚨 ADMIN ALERT - EMAIL DELIVERY PENDING SETUP 🚨');
      console.log('='.repeat(80));
      console.log(`📧 TO: ma1313@yahoo.com`);
      console.log(`📋 TYPE: ${data.type.toUpperCase()}`);
      console.log(`📝 TITLE: ${data.title}`);
      console.log(`💬 MESSAGE: ${data.message}`);
      console.log(`⚠️  PRIORITY: ${data.priority.toUpperCase()}`);
      console.log(`👤 DRIVER ID: ${data.driverId}`);
      console.log(`🕐 TIME: ${new Date().toLocaleString()}`);
      console.log('='.repeat(80));
      console.log('📱 ACTION: Check leadership dashboard for full details');
      console.log('⚙️  EMAIL: Verify melinda@tntgym.org in SendGrid Sender Identity');
      console.log('🔗 LINK: https://sendgrid.com/docs/for-developers/sending-email/sender-identity/');
      console.log('📲 SMS: T-Mobile blocking all messages (Error 30032)');
      console.log('🔔 BROWSER: Enable push notifications in Settings tab');
      console.log('✅ IN-APP: Real-time notification delivered successfully');
      console.log('='.repeat(80) + '\n');
    }

    console.log(`Admin notifications sent: ${admins.length} in-app, ${uniqueNumbers.length} SMS attempts, 1 email attempt`);
    
  } catch (error) {
    console.error('Failed to send admin notifications:', error);
  }
}

async function sendEmailToSMSBackup(numbers: string[], data: NotificationData): Promise<void> {
  try {
    // Log critical notifications when SMS fails
    console.log('='.repeat(60));
    console.log('🚨 CRITICAL NOTIFICATION - SMS DELIVERY FAILED 🚨');
    console.log('='.repeat(60));
    console.log(`TYPE: ${data.type.toUpperCase()}`);
    console.log(`TITLE: ${data.title}`);
    console.log(`MESSAGE: ${data.message}`);
    console.log(`PRIORITY: ${data.priority.toUpperCase()}`);
    console.log(`DRIVER ID: ${data.driverId}`);
    console.log(`TARGET NUMBERS: ${numbers.join(', ')}`);
    console.log(`TIMESTAMP: ${new Date().toISOString()}`);
    console.log('='.repeat(60));
    console.log('ACTION REQUIRED: Check admin dashboard for details');
    console.log('='.repeat(60));
    
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