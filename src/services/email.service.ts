import { IEmailService } from "../types/user.types";
import { FE_URL } from "../config/app.config";

export class EmailService implements IEmailService {
  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetLink = `${FE_URL}/reset-password?token=${token}`;

    console.log(`Password reset email sent to ${email}`);
    console.log(`Reset link: ${resetLink}`);

    // Implementation with nodemailer would go here
  }

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const verificationLink = `${FE_URL}/verify-email?token=${token}`;

    console.log(`Verification email sent to ${email}`);
    console.log(`Verification link: ${verificationLink}`);
    console.log(`Password setup required: YES`);

    // Implementation with nodemailer would go here
    /*
    await Transporter.sendMail({
      from: `Grocery App <${process.env.NODEMAILER_USER}>`,
      to: email,
      subject: 'Verify Your Email and Set Password',
      html: this.getVerificationTemplate(verificationLink),
    });
    */
  }

  private getVerificationTemplate(verificationLink: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .button { background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Welcome to Our Grocery App!</h2>
            <p>Thank you for registering. To complete your account setup, please verify your email and set your password.</p>
            <p>Click the button below to verify your email and set your password:</p>
            <a href="${verificationLink}" class="button">Verify Email & Set Password</a>
            <p>This link will expire in 24 hours.</p>
            <p>If you didn't create an account, please ignore this email.</p>
          </div>
        </body>
      </html>
    `;
  }
}
