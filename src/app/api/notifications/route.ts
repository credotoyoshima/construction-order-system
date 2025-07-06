import { NextRequest, NextResponse } from 'next/server';
import { getNotifications, markNotificationAsRead, toggleNotificationReadStatus } from '@/lib/googleSheets';

/**
 * GET /api/notifications
 * お知らせ一覧の取得
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    const notifications = await getNotifications(userId || undefined);

    return NextResponse.json({
      success: true,
      data: notifications
    });
  } catch (error) {
    console.error('お知らせ取得エラー:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'お知らせの取得に失敗しました' 
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notifications
 * 既読状態の切り替え
 */
export async function PATCH(request: NextRequest) {
  try {
    const { notificationId, action } = await request.json();

    if (!notificationId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'notificationIdが必要です' 
        },
        { status: 400 }
      );
    }

    let newReadStatus: boolean;

    if (action === 'toggle') {
      // 既読/未読状態を切り替え
      newReadStatus = await toggleNotificationReadStatus(notificationId);
    } else {
      // 従来の既読にする機能（後方互換性）
      await markNotificationAsRead(notificationId);
      newReadStatus = true;
    }

    return NextResponse.json({
      success: true,
      message: '既読状態を更新しました',
      readStatus: newReadStatus
    });
  } catch (error) {
    console.error('既読更新エラー:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '既読状態の更新に失敗しました' 
      },
      { status: 500 }
    );
  }
} 

/**
 * POST /api/notifications
 * 新しい通知の作成
 */
export async function POST(request: Request) {
  try {
    const { type, orderId, orderDetails, message } = await request.json();
    
    // 既存のGoogle Sheetsライブラリを使用して通知を追加
    const { addNotification } = await import('@/lib/googleSheets');
    
    await addNotification({
      type: type === 'order_cancelled' ? 'order' : 'system',
      title: type === 'order_cancelled' ? '発注がキャンセルされました' : '通知',
      message: `${message} - ${orderDetails.propertyName} ${orderDetails.roomNumber}`
    });

    console.log('通知が正常に追加されました:', {
      type,
      orderId,
      message
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('通知送信エラー:', error);
    return NextResponse.json(
      { success: false, message: '通知送信中にエラーが発生しました' },
      { status: 500 }
    );
  }
} 