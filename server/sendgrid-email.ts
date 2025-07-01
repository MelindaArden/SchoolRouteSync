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
      text: params.text,
      html: params.html,
    });

    console.log(`Email sent successfully to ${params.to}`);
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

export async function sendAdminEmailNotification(title: string, message: string, priority: string = 'medium'): Promise<void> {
  const adminEmail = 'admin@aftercareapp.com'; // Replace with your admin email
  const fromEmail = 'noreply@aftercareapp.com'; // Replace with your verified sender email
  
  if (!process.env.SENDGRID_API_KEY) {
    console.log('SendGrid not configured - skipping admin email notification');
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

  try {
    const success = await sendEmail({
      to: adminEmail,
      from: fromEmail,
      subject: subject,
      text: textContent,
      html: htmlContent
    });

    if (success) {
      console.log(`Admin email notification sent successfully for: ${title}`);
    } else {
      console.error(`Failed to send admin email notification for: ${title}`);
    }
  } catch (error) {
    console.error('Admin email notification failed:', error);
  }
}