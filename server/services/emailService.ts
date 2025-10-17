import * as postmark from 'postmark';

class EmailService {
  private client: postmark.ServerClient | null = null;

  constructor() {
    const apiKey = process.env.POSTMARK_API_KEY;

    if (!apiKey) {
      console.warn('⚠️  POSTMARK_API_KEY not set. Email functionality will be disabled.');
    } else {
      this.client = new postmark.ServerClient(apiKey);
      console.log('✅ Postmark email service initialized');
    }
  }

  /**
   * Send invitation email to a user
   */
  async sendInvitationEmail(
    toEmail: string,
    inviterName: string,
    dashboardName: string,
    invitationToken: string,
    personalMessage?: string
  ): Promise<void> {
    if (!this.client) {
      console.error('❌ Cannot send email: Postmark client not initialized');
      throw new Error('Email service is not configured');
    }

    const invitationUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/accept-invitation/${invitationToken}`;

    try {
      console.log(`📧 Sending invitation email to ${toEmail}`);

      const messageBody = `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #2563eb;">You've been invited to view a dashboard! 🎉</h2>

              <p>Hi there!</p>

              <p><strong>${inviterName}</strong> has invited you to view their MongoDB dashboard: <strong>${dashboardName}</strong></p>

              ${personalMessage ? `<div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 0;"><em>"${personalMessage}"</em></p>
              </div>` : ''}

              <p>Click the button below to accept the invitation and set your password:</p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${invitationUrl}"
                   style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                  Accept Invitation & Set Password
                </a>
              </div>

              <p style="color: #666; font-size: 14px;">This invitation will expire in 7 days.</p>

              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

              <p style="color: #999; font-size: 12px;">
                Powered by DashGenAI - AI-Powered MongoDB Dashboard Generator
              </p>
            </div>
          </body>
        </html>
      `;

      await this.client.sendEmail({
        From: process.env.POSTMARK_FROM_EMAIL || 'noreply@dashgenai.com',
        To: toEmail,
        Subject: `${inviterName} invited you to view their MongoDB Dashboard`,
        HtmlBody: messageBody,
        TextBody: `You've been invited by ${inviterName} to view their MongoDB dashboard: ${dashboardName}. Accept the invitation here: ${invitationUrl}`,
        MessageStream: 'outbound',
      });

      console.log(`✅ Invitation email sent successfully to ${toEmail}`);
    } catch (error) {
      console.error(`❌ Failed to send invitation email to ${toEmail}:`, error);
      throw new Error('Failed to send invitation email');
    }
  }

  /**
   * Send welcome email to newly registered user
   */
  async sendWelcomeEmail(
    toEmail: string,
    userName: string,
    dashboardName: string,
    dashboardUrl: string
  ): Promise<void> {
    if (!this.client) {
      console.error('❌ Cannot send email: Postmark client not initialized');
      return;
    }

    try {
      console.log(`📧 Sending welcome email to ${toEmail}`);

      const messageBody = `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #2563eb;">Welcome to DashGenAI! 🎉</h2>

              <p>Hi ${userName || 'there'}!</p>

              <p>Your account has been successfully created. You now have access to the dashboard: <strong>${dashboardName}</strong></p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${dashboardUrl}"
                   style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                  View Dashboard
                </a>
              </div>

              <p>You can access this dashboard anytime by logging into your account.</p>

              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

              <p style="color: #999; font-size: 12px;">
                Powered by DashGenAI - AI-Powered MongoDB Dashboard Generator
              </p>
            </div>
          </body>
        </html>
      `;

      await this.client.sendEmail({
        From: process.env.POSTMARK_FROM_EMAIL || 'noreply@dashgenai.com',
        To: toEmail,
        Subject: 'Welcome to DashGenAI!',
        HtmlBody: messageBody,
        TextBody: `Welcome to DashGenAI! Your account has been created and you have access to ${dashboardName}. View it here: ${dashboardUrl}`,
        MessageStream: 'outbound',
      });

      console.log(`✅ Welcome email sent successfully to ${toEmail}`);
    } catch (error) {
      console.error(`❌ Failed to send welcome email to ${toEmail}:`, error);
      // Don't throw error for welcome email - it's not critical
    }
  }
}

export default new EmailService();
