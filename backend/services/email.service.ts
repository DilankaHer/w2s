import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendMagicLinkEmail(email: string, token: string) {
    const res = await resend.emails.send({
        from: 'W2S <auth@send.duvaher.com>',
        to: email,
        subject: 'W2S - Verify your email',
        html: '<p>Click <a href="https://w2s-api.duvaher.com/auth/verify?token=' + token + '">here</a> to verify your email.</p>'
    });
}