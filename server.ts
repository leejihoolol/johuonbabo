import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import nodemailer from 'nodemailer';

function getVerificationEmailHtml(code: string, purpose: string): string {
  const purposeText = purpose === 'signup' ? '신규 계정 생성' : '계정 로그인 및 보안 인증';
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 40px 20px; border-radius: 12px; max-width: 520px; margin: 0 auto;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #f59e0b; margin: 0; font-size: 24px; letter-spacing: -0.5px;">⚔️ Pixel Sword Master</h1>
        <p style="color: #94a3b8; font-size: 14px; margin-top: 6px;">픽셀 검 키우기: 대장장이 보안 인증</p>
      </div>

      <div style="background-color: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 24px; margin-bottom: 20px;">
        <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1; margin-top: 0;">
          안녕하세요 대장장이님!<br/>
          요청하신 <strong style="color: #f59e0b;">${purposeText}</strong>을 위한 6자리 일회용 보안 인증 코드입니다.
        </p>

        <div style="text-align: center; margin: 28px 0;">
          <div style="display: inline-block; background-color: #020617; border: 2px solid #f59e0b; border-radius: 8px; padding: 14px 28px;">
            <span style="font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #fbbf24;">
              ${code}
            </span>
          </div>
          <p style="font-size: 12px; color: #94a3b8; margin-top: 10px;">이 인증 코드는 10분간 유효합니다.</p>
        </div>

        <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin-bottom: 0;">
          본인이 요청하지 않았을 경우 이 메일을 안전하게 무시하시기 바랍니다.
        </p>
      </div>

      <div style="text-align: center; font-size: 11px; color: #64748b;">
        © 2026 Pixel Sword Master. All rights reserved.
      </div>
    </div>
  `;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      resendConfigured: Boolean(process.env.RESEND_API_KEY),
      smtpConfigured: Boolean(process.env.SMTP_USER && process.env.SMTP_PASS),
    });
  });

  // API to dispatch real email verification code
  app.post('/api/auth/send-verification-email', async (req, res) => {
    const { email, code, purpose = 'signup' } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: '이메일과 인증코드가 필요합니다.',
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanCode = String(code).trim();
    const resendApiKey = process.env.RESEND_API_KEY;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    // 1. Try Resend if configured
    if (resendApiKey) {
      try {
        const resendFrom = process.env.RESEND_FROM || 'Pixel Sword Master <onboarding@resend.dev>';
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: resendFrom,
            to: [cleanEmail],
            subject: `[Pixel Sword Master] 대장장이 보안 인증 코드: [${cleanCode}]`,
            html: getVerificationEmailHtml(cleanCode, purpose),
          }),
        });

        const data = await response.json();
        if (response.ok) {
          console.log(`[Email] Resend email successfully dispatched to ${cleanEmail}`);
          return res.json({
            success: true,
            serviceConfigured: true,
            provider: 'resend',
            message: `${cleanEmail} 메일함으로 인증 코드가 성공적으로 전송되었습니다!`,
          });
        } else {
          console.warn('[Email] Resend API returned error:', data);
          let reasonMsg = data?.message || '';
          // If Resend sandbox domain restriction (only allows sending to account owner email)
          if (data?.statusCode === 403 && data?.message?.includes('own email address')) {
            reasonMsg = 'Resend 테스트 도메인 제한: Resend에 가입한 계정 이메일(또는 resend.com/domains에 등록한 도메인)로만 직접 전송이 허용됩니다.';
          }
          return res.json({
            success: false,
            serviceConfigured: true,
            providerError: reasonMsg,
            message: `${reasonMsg || '이메일 발송에 실패했습니다.'} (화면에 표시된 테스트 코드를 입력해주세요)`,
            fallbackCode: cleanCode,
          });
        }
      } catch (err: any) {
        console.error('[Email] Resend dispatch exception:', err);
      }
    }

    // 2. Try SMTP / Nodemailer if configured
    if (smtpUser && smtpPass) {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: parseInt(process.env.SMTP_PORT || '587', 10),
          secure: process.env.SMTP_PORT === '465',
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        });

        await transporter.sendMail({
          from: process.env.SMTP_FROM || `"Pixel Sword Master" <${smtpUser}>`,
          to: cleanEmail,
          subject: `[Pixel Sword Master] 대장장이 보안 인증 코드: [${cleanCode}]`,
          html: getVerificationEmailHtml(cleanCode, purpose),
        });

        console.log(`[Email] SMTP email successfully dispatched to ${cleanEmail}`);
        return res.json({
          success: true,
          serviceConfigured: true,
          provider: 'smtp',
          message: `${cleanEmail} 메일함으로 인증 코드가 성공적으로 전송되었습니다!`,
        });
      } catch (err: any) {
        console.error('[Email] SMTP dispatch exception:', err);
      }
    }

    // 3. Fallback when real email provider is not yet set in environment variables
    console.log(`[Email] No email provider configured. Verification code for ${cleanEmail}: ${cleanCode}`);
    return res.json({
      success: false,
      serviceConfigured: false,
      message: '메일 발송 서비스(RESEND_API_KEY 또는 SMTP)가 설정되지 않아 테스트용 코드를 화면에 표시합니다.',
      fallbackCode: cleanCode,
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
