import { TRPCError } from "@trpc/server";
import { Resend } from "resend";

export async function sendMagicLinkEmail(email: string, token: string) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "W2S <auth@duvaher.com>",
      to: email,
      subject: "W2S - Verify your email",
      html:
        '<p>Click <a href="https://w2s-api.duvaher.com/auth/verify?token=' +
        token +
        '">here</a> to verify your email.</p>',
    });
  } catch (error) {
    console.error(error);
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to send magic link', cause: error });
  }
}
