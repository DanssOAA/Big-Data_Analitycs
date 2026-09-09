export async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = Deno.env.get('RESEND_API_KEY'); const from = Deno.env.get('RESEND_FROM_EMAIL')
  if (!apiKey || !from) throw new Error('El servicio de correo no está configurado.')
  const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from, to: [to], subject, html }) })
  if (!response.ok) throw new Error('No se pudo enviar el correo.')
}
