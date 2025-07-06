import nodemailer from 'nodemailer';
import type { Notification, User } from '@/types';

// メール送信設定
const EMAIL_CONFIG = {
  service: process.env.EMAIL_SERVICE || 'gmail',
  user: process.env.EMAIL_USER,
  pass: process.env.EMAIL_PASS,
  from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
};

/**
 * メール送信トランスポーターの作成
 */
function createTransporter() {
  if (!EMAIL_CONFIG.user || !EMAIL_CONFIG.pass) {
    console.warn('⚠️ メール設定が不完全です。環境変数を確認してください。');
    return null;
  }

  return nodemailer.createTransport({
    service: EMAIL_CONFIG.service,
    auth: {
      user: EMAIL_CONFIG.user,
      pass: EMAIL_CONFIG.pass,
    },
  });
}

/**
 * お知らせメールのテンプレート生成
 */
function generateNotificationEmailTemplate(
  notification: Notification, 
  customerInfo?: {
    orderId?: string;
    propertyName?: string;
    roomNumber?: string;
    companyName?: string;
    storeName?: string;
    contactPerson?: string;
  }
): { subject: string; html: string } {
  const subject = notification.title;
  
  const typeLabels: Record<string, string> = {
    order: '受注',
    user: 'ユーザー',
    schedule: 'スケジュール',
    system: 'システム',
    key_status_change: '鍵管理'
  };

  const typeLabel = typeLabels[notification.type] || 'お知らせ';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${subject}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.4; color: #333; margin: 0; padding: 20px; background-color: #f9f9f9; }
        .container { max-width: 500px; margin: 0 auto; background: white; border: 1px solid #ddd; }
        .header { background: #f5f5f5; padding: 15px 20px; border-bottom: 1px solid #ddd; }
        .header h1 { margin: 0; font-size: 18px; color: #333; }
        .content { padding: 20px; }
        .notification-type { display: inline-block; background: #f0f0f0; color: #666; padding: 4px 8px; border-radius: 3px; font-size: 11px; margin-bottom: 15px; }
        .notification-title { font-size: 16px; font-weight: bold; color: #333; margin-bottom: 10px; }
        .notification-message { font-size: 14px; color: #555; margin-bottom: 20px; }
        .customer-info { background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px; border-left: 4px solid #007bff; }
        .customer-info h3 { margin: 0 0 10px 0; font-size: 14px; color: #333; font-weight: bold; }
        .customer-info p { margin: 5px 0; font-size: 13px; color: #666; }
                 .btn { display: inline-block; background: #e5e5e5; color: #333; padding: 10px 20px; text-decoration: none; border-radius: 3px; font-weight: normal; margin-top: 10px; border: 1px solid #ccc; }
        .notification-time { font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 10px; margin-top: 15px; }
        .footer { background: #f5f5f5; padding: 15px 20px; text-align: center; font-size: 11px; color: #666; border-top: 1px solid #ddd; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>工事受注システム</h1>
        </div>
        <div class="content">
          <div class="notification-type">${typeLabel}</div>
          <div class="notification-title">${notification.title}</div>
          <div class="notification-message">${notification.message}</div>
          ${customerInfo ? `
          <div class="customer-info">
            <h3>顧客情報</h3>
            ${customerInfo.orderId ? `<p><strong>受注ID:</strong> ${customerInfo.orderId}</p>` : ''}
            ${customerInfo.propertyName ? `<p><strong>物件名:</strong> ${customerInfo.propertyName}</p>` : ''}
            ${customerInfo.roomNumber ? `<p><strong>部屋番号:</strong> ${customerInfo.roomNumber}</p>` : ''}
            ${customerInfo.companyName ? `<p><strong>会社名:</strong> ${customerInfo.companyName}</p>` : ''}
            ${customerInfo.storeName ? `<p><strong>店舗名:</strong> ${customerInfo.storeName}</p>` : ''}
            ${customerInfo.contactPerson ? `<p><strong>担当者:</strong> ${customerInfo.contactPerson}</p>` : ''}
          </div>
          ` : ''}
          <a href="http://localhost:3001/admin" class="btn">管理画面で確認する</a>
          <div class="notification-time">
            ${new Date(notification.createdAt).toLocaleString('ja-JP', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        </div>
        <div class="footer">
          <p>この通知は工事受注システムから自動送信されています。</p>
          <p>© 2025 Credo co.,ltd.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}

/**
 * 管理者にお知らせメールを送信
 */
export async function sendNotificationEmailToAdmins(
  notification: Notification, 
  adminUsers: User[], 
  customerInfo?: {
    orderId?: string;
    propertyName?: string;
    roomNumber?: string;
    companyName?: string;
    storeName?: string;
    contactPerson?: string;
  }
): Promise<void> {
  const transporter = createTransporter();
  
  if (!transporter) {
    console.warn('⚠️ メール送信をスキップ: トランスポーター作成失敗');
    return;
  }

  if (adminUsers.length === 0) {
    console.warn('⚠️ メール送信をスキップ: 管理者ユーザーが見つかりません');
    return;
  }

  const { subject, html } = generateNotificationEmailTemplate(notification, customerInfo);
  
  try {
    // 各管理者にメール送信
    const emailPromises = adminUsers.map(async (admin) => {
      if (!admin.email) {
        console.warn(`⚠️ 管理者 ${admin.id} のメールアドレスが設定されていません`);
        return;
      }

      const mailOptions = {
        from: EMAIL_CONFIG.from,
        to: admin.email,
        subject: subject,
        html: html,
      };

      try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ メール送信成功: ${admin.email} (${admin.companyName} ${admin.storeName})`);
      } catch (error) {
        console.error(`❌ メール送信失敗 ${admin.email}:`, error instanceof Error ? error.message : String(error));
      }
    });

    await Promise.all(emailPromises);
    console.log(`📧 管理者への通知メール送信完了: ${adminUsers.length}名`);
    
  } catch (error) {
    console.error('❌ メール送信処理エラー:', error instanceof Error ? error.message : String(error));
  }
}

/**
 * メール設定のテスト
 */
export async function testEmailConfiguration(): Promise<boolean> {
  const transporter = createTransporter();
  
  if (!transporter) {
    console.error('❌ メール設定テスト失敗: トランスポーター作成失敗');
    return false;
  }

  try {
    await transporter.verify();
    console.log('✅ メール設定テスト成功');
    return true;
  } catch (error) {
    console.error('❌ メール設定テスト失敗:', error instanceof Error ? error.message : String(error));
    return false;
  }
} 