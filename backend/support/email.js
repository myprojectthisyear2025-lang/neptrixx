/** Resend verification/reset mail; never log codes or return them to the browser. */
export async function sendCode(email, code, purpose) {
  const action = purpose !== 'reset' ? 'verify your email' : 'reset your password';
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST', signal: AbortSignal.timeout(15000), headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json',
    }, body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [email],
      ...(process.env.EMAIL_REPLY_TO ? { reply_to: process.env.EMAIL_REPLY_TO } : {}),
      subject: `Your Neptrixx ${purpose !== 'reset' ? 'verification' : 'password reset'} code`,
      text: `Your code to ${action} is ${code}. It expires in 10 minutes. If you did not request it, ignore this email.`,
    }),
  });
  if (!response.ok) { const e = new Error('Email could not be sent. Please try again shortly.'); e.status = 502; throw e; }
}
