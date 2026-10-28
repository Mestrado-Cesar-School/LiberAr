// Envio de e-mail (recuperação de senha). Com SMTP_URL usa nodemailer; sem
// SMTP_URL, o código é apenas logado. Em NODE_ENV=test o último código de
// cada e-mail fica em memória para os testes (getLastResetCode).
import nodemailer, { type Transporter } from "nodemailer";
import { config, isTest } from "../config";

type Logger = { info: (msg: string) => void; error: (obj: unknown, msg?: string) => void };

const lastCodes = new Map<string, string>();
let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!config.SMTP_URL) return null;
  transporter ??= nodemailer.createTransport(config.SMTP_URL);
  return transporter;
}

export async function sendPasswordResetCode(email: string, code: string, log?: Logger): Promise<void> {
  if (isTest) lastCodes.set(email, code);

  const subject = "LiberAr — código para redefinir sua senha";
  const text =
    `Olá!\n\nSeu código para redefinir a senha do LiberAr é: ${code}\n\n` +
    "Ele vale por 15 minutos. Se você não pediu a redefinição, ignore este e-mail.\n\n" +
    "Um respiro de cada vez. — Equipe LiberAr";
  const html =
    `<p>Olá!</p><p>Seu código para redefinir a senha do LiberAr é:</p>` +
    `<p style="font-size:28px;font-weight:700;letter-spacing:6px">${code}</p>` +
    `<p>Ele vale por 15 minutos. Se você não pediu a redefinição, ignore este e-mail.</p>` +
    `<p>Um respiro de cada vez. — Equipe LiberAr</p>`;

  const t = getTransporter();
  if (!t) {
    if (!isTest) {
      const msg = `[mailer] SMTP_URL não configurada — código de recuperação para ${email}: ${code}`;
      if (log) log.info(msg);
      else console.info(msg);
    }
    return;
  }
  await t.sendMail({ from: config.MAIL_FROM, to: email, subject, text, html });
}

/** Somente para testes: último código gerado para o e-mail. */
export function getLastResetCode(email: string): string | undefined {
  return lastCodes.get(email);
}
