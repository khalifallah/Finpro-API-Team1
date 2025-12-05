import nodemailer from "nodemailer";
import { IEmailService } from "../types/user.types";
import {
  CLIENT_URL,
  NODEMAILER_USER,
  NODEMAILER_PASS,
} from "../config/app.config";
import path from "path";
import fs from "fs";
import handlebars from "handlebars";

// Create Transporter using gmail service
const Transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: NODEMAILER_USER,
    pass: NODEMAILER_PASS,
  },
});

export class EmailService implements IEmailService {
  private templates: {
    passwordReset: HandlebarsTemplateDelegate;
    passwordResetConfirmation: HandlebarsTemplateDelegate;
    verification: HandlebarsTemplateDelegate;
    expiredVerification: HandlebarsTemplateDelegate;
    referralReward: HandlebarsTemplateDelegate;
    welcomeDiscount: HandlebarsTemplateDelegate;
  };

  constructor() {
    // Load and compile all templates
    this.templates = {
      passwordReset: this.loadTemplate("password-reset.hbs"),
      passwordResetConfirmation: this.loadTemplate(
        "password-reset-confirmation.hbs"
      ),
      verification: this.loadTemplate("verification.hbs"),
      expiredVerification: this.loadTemplate("expired-verification.hbs"),
      referralReward: this.loadTemplate("referral-reward.hbs"),
      welcomeDiscount: this.loadTemplate("welcome-discount.hbs"),
    };
  }

  // Helper method to load and compile Handlebars templates
  private loadTemplate(templateName: string): HandlebarsTemplateDelegate {
    try {
      const templatePath = path.join(__dirname, "../templates", templateName);
      const templateContent = fs.readFileSync(templatePath, "utf8");
      return handlebars.compile(templateContent);
    } catch (error) {
      console.error(`Error loading template ${templateName}:`, error);
      throw new Error(`Failed to load template: ${templateName}`);
    }
  }

  // Helper method to get logo as base64 with transparent background
  private getLogoBase64(): string {
    try {
      const logoPath = path.join(
        __dirname,
        "/../../public/Beyond_Market_compressed.png"
      );
      const logoBuffer = fs.readFileSync(logoPath);
      return logoBuffer.toString("base64");
    } catch (error) {
      console.warn("Logo not found, using text brand instead");
      return "";
    }
  }

  // Helper method to get logo HTML
  private getLogoHtml(): string {
    const logoBase64 = this.getLogoBase64();
    return logoBase64
      ? `<img src="data:image/png;base64,${logoBase64}" alt="Grocery App" style="color: black; max-width: 200px; margin-bottom: 20px; background: transparent;">`
      : `<h1 style="color: #9ec79fff; margin-bottom: 20px;">🛒 Grocery App</h1>`;
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetLink = `${CLIENT_URL}/reset-password/confirm?token=${token}`;
    console.log(`Password reset email sent to ${email}`);
    console.log(`Reset link: ${resetLink}`);
    try {
      const html = this.templates.passwordReset({
        logoHtml: this.getLogoHtml(),
        resetLink: resetLink,
      });
      await Transporter.sendMail({
        from: `Grocery App <${NODEMAILER_USER}>`,
        to: email,
        subject: "Password Reset Request - Expires in 1 Hour",
        html: html,
      });
      console.log(`Password reset email successfully sent to ${email}`);
    } catch (emailError) {
      console.error("Error sending password reset email:", emailError);
    }
  }

  async sendPasswordResetConfirmation(email: string): Promise<void> {
    console.log(`Password reset confirmation email sent to ${email}`);

    try {
      const html = this.templates.passwordResetConfirmation({
        logoHtml: this.getLogoHtml(),
      });
      await Transporter.sendMail({
        from: `Grocery App <${NODEMAILER_USER}>`,
        to: email,
        subject: "Password Reset Successful",
        html: html,
      });
      console.log(
        `Password reset confirmation email successfully sent to ${email}`
      );
    } catch (emailError) {
      console.error(
        "Error sending password reset confirmation email:",
        emailError
      );
    }
  }

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const verificationLink = `${CLIENT_URL}/verify-email?token=${token}&email=${encodeURIComponent(
      email
    )}`;
    console.log(`Verification email sent to ${email}`);
    console.log(`Verification link: ${verificationLink}`);
    console.log(`Token expires in: 1 hour`);
    try {
      const html = this.templates.verification({
        logoHtml: this.getLogoHtml(),
        verificationLink: verificationLink,
        CLIENT_URL: CLIENT_URL,
        email: email,
        token: token,
      });
      await Transporter.sendMail({
        from: `Grocery App <${NODEMAILER_USER}>`,
        to: email,
        subject: "Verify Your Email - Expires in 1 Hour",
        html: html,
      });
      console.log(`Verification email successfully sent to ${email}`);
    } catch (emailError) {
      console.error("Error sending verification email:", emailError);
    }
  }

  async sendVerificationExpiredEmail(
    email: string,
    newToken: string
  ): Promise<void> {
    const verificationLink = `${CLIENT_URL}/verify-email?token=${newToken}&email=${encodeURIComponent(
      email
    )}`;
    console.log(
      `New verification email sent to ${email} (previous token expired)`
    );
    console.log(`New verification link: ${verificationLink}`);
    try {
      const html = this.templates.expiredVerification({
        logoHtml: this.getLogoHtml(),
        verificationLink: verificationLink,
      });
      await Transporter.sendMail({
        from: `Grocery App <${NODEMAILER_USER}>`,
        to: email,
        subject: "New Verification Link - Your Previous Link Expired",
        html: html,
      });
      console.log(`Expired verification email successfully sent to ${email}`);
    } catch (emailError) {
      console.error("Error sending expired verification email:", emailError);
    }
  }

  async sendReferralRewardEmail(
    referringUserEmail: string,
    referringUserName: string,
    newUserEmail: string,
    referralVoucherCode: string,
    rewardDescription: string = "15% discount coupon"
  ): Promise<void> {
    console.log(`Sending referral reward email to: ${referringUserEmail}`);
    console.log(`Referred user: ${newUserEmail}`);
    console.log(`Referral voucher code: ${referralVoucherCode}`);
    try {
      const html = this.templates.referralReward({
        logoHtml: this.getLogoHtml(),
        referringUserName: referringUserName,
        newUserEmail: newUserEmail,
        referralVoucherCode: referralVoucherCode,
        rewardDescription: rewardDescription,
      });
      await Transporter.sendMail({
        from: `Grocery App <${NODEMAILER_USER}>`,
        to: referringUserEmail,
        subject: "You've Earned Referral Rewards!",
        html: html,
      });
      console.log(
        `Referral reward email successfully sent to ${referringUserEmail}`
      );
    } catch (emailError) {
      console.error("Error sending referral reward email:", emailError);
      throw emailError;
    }
  }

  async sendWelcomeDiscountEmail(
    newUserEmail: string,
    newUserName: string,
    welcomeVoucherCode: string,
    rewardDescription: string = "10% welcome discount coupon"
  ): Promise<void> {
    console.log(`Sending welcome discount email to: ${newUserEmail}`);
    console.log(`Welcome voucher code: ${welcomeVoucherCode}`);
    try {
      const html = this.templates.welcomeDiscount({
        logoHtml: this.getLogoHtml(),
        newUserName: newUserName,
        welcomeVoucherCode: welcomeVoucherCode,
        rewardDescription: rewardDescription,
      });
      await Transporter.sendMail({
        from: `Grocery App <${NODEMAILER_USER}>`,
        to: newUserEmail,
        subject: "Welcome to Grocery App! Your Discount is Here 🎉",
        html: html,
      });
      console.log(
        `Welcome discount email successfully sent to ${newUserEmail}`
      );
    } catch (emailError) {
      console.error("Error sending welcome discount email:", emailError);
      throw emailError;
    }
  }
}
