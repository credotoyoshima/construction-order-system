import { NextRequest, NextResponse } from 'next/server';
import { testEmailConfiguration, sendNotificationEmailToAdmins } from '@/lib/email';
import { getAdminUsers, addNotification } from '@/lib/googleSheets';

/**
 * GET /api/test-email
 * メール設定のテスト
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🧪 メール機能テスト開始');

    // 1. メール設定のテスト
    console.log('1. メール設定のテスト...');
    const isEmailConfigValid = await testEmailConfiguration();
    
    if (!isEmailConfigValid) {
      return NextResponse.json({
        success: false,
        error: 'メール設定が正しくありません',
        message: '環境変数を確認してください。必要な変数: EMAIL_USER, EMAIL_PASS'
      }, { status: 500 });
    }

    // 2. 管理者ユーザーの取得
    console.log('2. 管理者ユーザーの取得...');
    const adminUsers = await getAdminUsers();
    console.log(`✅ 管理者ユーザー: ${adminUsers.length}名`);
    
    if (adminUsers.length === 0) {
      return NextResponse.json({
        success: false,
        error: '管理者ユーザーが見つかりません',
        message: 'roleが"admin"のアクティブユーザーが必要です'
      }, { status: 404 });
    }

    // 3. テスト用お知らせの作成とメール送信
    console.log('3. テスト用お知らせの作成...');
    const testNotification = await addNotification({
      type: 'system',
      title: 'メール機能テスト',
      message: 'メール通知機能が正常に動作しています'
    });

    console.log('✅ テスト用お知らせ作成完了');

    return NextResponse.json({
      success: true,
      message: 'メール機能テスト完了',
      data: {
        emailConfigValid: isEmailConfigValid,
        adminUsersCount: adminUsers.length,
        adminUsers: adminUsers.map(user => ({
          id: user.id,
          email: user.email,
          companyName: user.companyName,
          storeName: user.storeName
        })),
        testNotification: testNotification,
        emailSent: '管理者へのメール送信を実行しました（バックグラウンド処理）'
      }
    });

  } catch (error) {
    console.error('❌ メール機能テストエラー:', error);
    return NextResponse.json({
      success: false,
      error: 'メール機能テストに失敗しました',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

/**
 * POST /api/test-email
 * 手動でテストメールを送信
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, message, type = 'system' } = body;

    if (!title || !message) {
      return NextResponse.json({
        success: false,
        error: 'titleとmessageは必須です'
      }, { status: 400 });
    }

    console.log('📧 手動テストメール送信開始');

    // 管理者ユーザーの取得
    const adminUsers = await getAdminUsers();
    
    if (adminUsers.length === 0) {
      return NextResponse.json({
        success: false,
        error: '管理者ユーザーが見つかりません'
      }, { status: 404 });
    }

    // テスト用お知らせの作成
    const testNotification = await addNotification({
      type: type,
      title: title,
      message: message
    });

    return NextResponse.json({
      success: true,
      message: '手動テストメールを送信しました',
      data: {
        notification: testNotification,
        recipients: adminUsers.length
      }
    });

  } catch (error) {
    console.error('❌ 手動テストメール送信エラー:', error);
    return NextResponse.json({
      success: false,
      error: '手動テストメールの送信に失敗しました'
    }, { status: 500 });
  }
} 