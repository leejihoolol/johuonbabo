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

export default async function handler(req: any, res: any) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { email, code, purpose = 'signup' } = req.body || {};

  if (!email || !code) {
    return res.status(400).json({
      success: false,
      message: '이메일과 인증코드가 필요합니다.',
    });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const cleanCode = String(code).trim();
  const resendApiKey = process.env.RESEND_API_KEY;

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

      const data: any = await response.json();
      if (response.ok) {
        return res.status(200).json({
          success: true,
          serviceConfigured: true,
          provider: 'resend',
          message: `${cleanEmail} 메일함으로 인증 코드가 성공적으로 전송되었습니다!`,
        });
      } else {
        let reasonMsg = data?.message || '';
        if (data?.statusCode === 403 && data?.message?.includes('own email address')) {
          reasonMsg = 'Resend 테스트 도메인 제한: Resend에 가입한 계정 이메일(또는 resend.com/domains에 등록한 도메인)로만 직접 전송이 허용됩니다.';
        }
        return res.status(200).json({
          success: false,
          serviceConfigured: true,
          providerError: reasonMsg,
          message: `${reasonMsg || '이메일 발송에 실패했습니다.'} (화면에 표시된 테스트 코드를 입력해주세요)`,
          fallbackCode: cleanCode,
        });
      }
    } catch (err: any) {
      console.error('Resend serverless error:', err);
    }
  }

  return res.status(200).json({
    success: false,
    serviceConfigured: Boolean(resendApiKey),
    message: '메일 발송 서비스가 설정되지 않아 화면에 테스트용 코드를 표시합니다.',
    fallbackCode: cleanCode,
  });
}
