import { MailService } from '@sendgrid/mail';

const mailService = new MailService();

if (process.env.SENDGRID_API_KEY) {
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
} else {
  console.warn('SendGrid API key not configured. Email notifications will not work.');
}

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    if (!process.env.SENDGRID_API_KEY) {
      console.log('SendGrid not configured - skipping email');
      return false;
    }

    console.log(`Sending email to ${params.to}: ${params.subject}`);
    
    await mailService.send({
      to: params.to,
      from: params.from,
      subject: params.subject,
      text: params.text || '',
      html: params.html || '',
    });

    console.log(`Email sent successfully to ${params.to}`);
    return true;
  } catch (error: any) {
    console.error('SendGrid email error:', error);
    if (error.response?.body?.errors) {
      console.error('SendGrid detailed errors:', JSON.stringify(error.response.body.errors, null, 2));
    }
    return false;
  }
}

export async function sendAdminEmailNotification(title: string, message: string, priority: string = 'medium'): Promise<void> {
  if (!process.env.SENDGRID_API_KEY) {
    console.log('SendGrid not configured - skipping admin email notification');
    return;
  }

  // Get all admin users with notification emails
  const { storage } = await import('./storage');
  const users = await storage.getUsers();
  const adminsWithEmails = users.filter(user => 
    user.role === 'leadership' && 
    user.isActive && 
    user.notificationEmail && 
    user.notificationEmail.trim().length > 0
  );
  
  if (adminsWithEmails.length === 0) {
    console.log('⚠️ No admin users have notification email addresses configured');
    return;
  }
  
  const priorityText = priority === 'urgent' ? 'URGENT' : priority === 'high' ? 'HIGH PRIORITY' : 'NOTICE';
  const subject = `[${priorityText}] AfterCare Alert: ${title}`;
  
  const textContent = `
${priorityText}: ${title}

${message}

Please check the AfterCare admin dashboard for full details.

This is an automated notification from the AfterCare school transportation system.
`;

  const htmlContent = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background-color: ${priority === 'urgent' ? '#dc2626' : priority === 'high' ? '#ea580c' : '#059669'}; color: white; padding: 20px; text-align: center;">
    <h1 style="margin: 0; font-size: 24px;">${priorityText}</h1>
    <h2 style="margin: 10px 0 0 0; font-size: 18px;">${title}</h2>
  </div>
  
  <div style="padding: 20px; background-color: #f9fafb; border: 1px solid #e5e7eb;">
    <p style="font-size: 16px; margin-bottom: 20px;"><strong>Message:</strong></p>
    <p style="font-size: 14px; line-height: 1.5; margin-bottom: 20px;">${message}</p>
    
    <div style="background-color: white; padding: 15px; border-radius: 5px; border-left: 4px solid #3b82f6;">
      <p style="margin: 0; font-size: 14px; color: #374151;">
        <strong>Next Steps:</strong> Please check the AfterCare admin dashboard for full details and any required actions.
      </p>
    </div>
  </div>
  
  <div style="padding: 15px; text-align: center; background-color: #f3f4f6; border-top: 1px solid #e5e7eb;">
    <p style="margin: 0; font-size: 12px; color: #6b7280;">
      This is an automated notification from the AfterCare school transportation system.
    </p>
  </div>
</div>
`;

  // Send emails to ALL admin users with notification emails
  let emailsSent = 0;
  for (const admin of adminsWithEmails) {
    try {
      const success = await sendEmail({
        to: admin.notificationEmail!,
        from: 'melinda@tntgym.org', // Verified sender address
        subject: subject,
        text: textContent,
        html: htmlContent
      });

      if (success) {
        emailsSent++;
        console.log(`✅ Email sent successfully to ${admin.firstName} ${admin.lastName} (${admin.notificationEmail})`);
      } else {
        console.error(`❌ Failed to send email to ${admin.notificationEmail}`);
      }
    } catch (error) {
      console.error(`❌ Email error for ${admin.notificationEmail}:`, error);
    }
  }

  console.log(`📧 Admin email notifications sent to ${emailsSent}/${adminsWithEmails.length} admin users with notification emails`);
  console.log(`Admin email notification sent successfully for: ${title}`);
}