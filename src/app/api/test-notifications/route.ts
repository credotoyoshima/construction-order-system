import { NextRequest, NextResponse } from 'next/server';
import { addNotification, getNotifications, markNotificationAsRead } from '@/lib/googleSheets';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 お知らせ機能テスト開始');

    // 1. テスト用お知らせの追加
    console.log('1. テスト用お知らせの追加');
    const testNotifications = [
      {
        type: 'order' as const,
        title: '新しい受注が追加されました（テスト）',
        message: 'テスト物件の工事依頼が追加されました（テスト用データ）'
      },
      {
        type: 'user' as const,
        title: '新規ユーザーが登録されました（テスト）',
        message: 'テスト株式会社 テスト支店のユーザーアカウントが作成されました'
      },
      {
        type: 'system' as const,
        title: 'システム通知（テスト）',
        message: 'お知らせ機能のテストが正常に動作しています'
      }
    ];

    const addedNotifications = [];
    for (const notification of testNotifications) {
      try {
        const added = await addNotification(notification);
        addedNotifications.push(added);
        console.log(`✅ 追加成功: ${added.id}`);
      } catch (error) {
        console.error('❌ 追加エラー:', error);
      }
    }

    // 2. お知らせ一覧の取得
    console.log('2. お知らせ一覧の取得');
    const allNotifications = await getNotifications();
    console.log(`✅ 取得成功: ${allNotifications.length}件`);

    // 3. 最初のお知らせを既読にする（テスト）
    if (addedNotifications.length > 0) {
      console.log('3. 既読テスト');
      try {
        await markNotificationAsRead(addedNotifications[0].id);
        console.log(`✅ 既読更新成功: ${addedNotifications[0].id}`);
      } catch (error) {
        console.error('❌ 既読更新エラー:', error);
      }
    }

    // 4. 更新後のお知らせ一覧を再取得
    console.log('4. 更新後のお知らせ一覧を再取得');
    const updatedNotifications = await getNotifications();

    return NextResponse.json({
      success: true,
      message: 'お知らせ機能テスト完了',
      data: {
        addedCount: addedNotifications.length,
        totalNotifications: updatedNotifications.length,
        recentNotifications: updatedNotifications.slice(0, 5), // 最新5件
        testResults: {
          addNotification: addedNotifications.length > 0 ? '✅ 成功' : '❌ 失敗',
          getNotifications: allNotifications.length >= 0 ? '✅ 成功' : '❌ 失敗',
          markAsRead: addedNotifications.length > 0 ? '✅ 成功' : '❌ 失敗'
        }
      }
    });

  } catch (error) {
    console.error('❌ お知らせ機能テストエラー:', error);
    return NextResponse.json({
      success: false,
      error: 'お知らせ機能テストに失敗しました',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

/**
 * 手動でお知らせを追加するテスト用エンドポイント
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, title, message, userId } = body;

    if (!type || !title || !message) {
      return NextResponse.json({
        success: false,
        error: 'type, title, messageは必須です'
      }, { status: 400 });
    }

    const notification = await addNotification({
      type,
      title,
      message,
      userId
    });

    return NextResponse.json({
      success: true,
      message: 'テスト用お知らせが追加されました',
      data: notification
    });

  } catch (error) {
    console.error('❌ テスト用お知らせ追加エラー:', error);
    return NextResponse.json({
      success: false,
      error: 'テスト用お知らせの追加に失敗しました'
    }, { status: 500 });
  }
} 