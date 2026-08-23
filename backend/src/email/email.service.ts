import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private resend: Resend;

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  async sendBookingConfirmation(
    toEmail: string,
    bookingRef: string,
    showTitle: string,
    qrCodeBase64: string,
  ) {
    const base64Data = qrCodeBase64.replace(/^data:image\/png;base64,/, '');

    await this.resend.emails.send({
      from: 'Ticket Booking <onboarding@resend.dev>',
      to: toEmail,
      subject: `Your ticket for ${showTitle} — Booking ${bookingRef}`,
      html: `
        <h2>Booking Confirmed!</h2>
        <p>Show: <strong>${showTitle}</strong></p>
        <p>Booking Reference: <strong>${bookingRef}</strong></p>
        <p>Your QR code ticket is attached to this email.</p>
      `,
      attachments: [
        {
          filename: `ticket-${bookingRef}.png`,
          content: base64Data,
        },
      ],
    });
  }

  async sendWaitlistOffer(toEmail: string, showTitle: string, offerLink: string, minutesToRespond: number) {
    await this.resend.emails.send({
      from: 'Ticket Booking <onboarding@resend.dev>',
      to: toEmail,
      subject: `A seat is available for ${showTitle}!`,
      html: `
        <h2>Good news — a seat opened up!</h2>
        <p>You have <strong>${minutesToRespond} minutes</strong> to claim your seat for <strong>${showTitle}</strong>.</p>
        <p><a href="${offerLink}">Click here to complete your booking</a></p>
        <p>If you don't respond in time, the seat will be offered to the next person in line.</p>
      `,
    });
  }
}