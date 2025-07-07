import { NextResponse } from 'next/server';
import { getChatMessages, sendChatMessage, markChatMessageAsRead, getOrders, getUsers, getAdminUsers } from '@/lib/googleSheets';
import { sendNotificationEmailToAdmins } from '@/lib/email';
import type { Notification } from '@/types';

/**
 * GET /api/chat/[orderId]
 * チャットメッセージの取得
 */
export async function GET(
  request: Request,
  { params }: any
) {
  try {
    const { orderId } = params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'orderIdが必要です' },
        { status: 400 }
      );
    }

    const messages = await getChatMessages(orderId);
    
    // 未読数をメッセージ配列から計算
    let unreadCount = 0;
    if (userId) {
      unreadCount = messages.filter(msg => msg.userId !== userId && !msg.isRead).length;
    }

    return NextResponse.json({
      success: true,
      data: {
        messages,
        unreadCount
      }
    });
  } catch (error) {
    console.error('チャットメッセージ取得エラー:', error);
    return NextResponse.json(
      { success: false, error: 'チャットメッセージの取得に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/chat/[orderId]
 * チャットメッセージの送信
 */
export async function POST(
  request: Request,
  { params }: any
) {
  try {
    const { orderId } = params;
    const { userId, userName, userRole, message, messageType, fileUrl, fileName } = await request.json();

    if (!orderId || !userId || !userName || !userRole || !message) {
      return NextResponse.json(
        { success: false, error: '必要なパラメータが不足しています' },
        { status: 400 }
      );
    }

    const newMessage = await sendChatMessage({
      orderId,
      userId,
      userName,
      userRole,
      message,
      messageType: messageType || 'text',
      fileUrl,
      fileName
    });

    // メール通知
    const now = new Date().toISOString();
    if (userRole === 'admin') {
      // 管理者からユーザーへの通知
      const orders = await getOrders();
      const order = orders.find(o => o.id === orderId);
      if (order) {
        const users = await getUsers();
        const customer = users.find(u => u.id === order.userId);
        if (customer) {
          const notification: Notification = {
            id: '',
            userId: customer.id,
            type: 'system',
            title: 'チャットメッセージが届きました',
            message: message,
            read: false,
            createdAt: now
          };
          sendNotificationEmailToAdmins(notification, [customer], {
            orderId: order.id,
            propertyName: order.propertyName,
            roomNumber: order.roomNumber,
            companyName: customer.companyName,
            storeName: customer.storeName,
            contactPerson: order.contactPerson
          });
        }
      }
    } else if (userRole === 'user') {
      // ユーザーから管理者への通知（管理者向けメールにも顧客情報を付与）
      const adminUsers = await getAdminUsers();
      if (adminUsers.length > 0) {
        const orders = await getOrders();
        const order = orders.find(o => o.id === orderId);
        if (order) {
          const users = await getUsers();
          const customer = users.find(u => u.id === userId);
          if (customer) {
            const notification: Notification = {
              id: '',
              userId: undefined,
              type: 'system',
              title: 'チャットメッセージが届きました',
              message: message,
              read: false,
              createdAt: now
            };
            sendNotificationEmailToAdmins(notification, adminUsers, {
              orderId: order.id,
              propertyName: order.propertyName,
              roomNumber: order.roomNumber,
              companyName: customer.companyName,
              storeName: customer.storeName,
              contactPerson: order.contactPerson
            });
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: newMessage
    });
  } catch (error) {
    console.error('チャットメッセージ送信エラー:', error);
    return NextResponse.json(
      { success: false, error: 'チャットメッセージの送信に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/chat/[orderId]
 * チャットメッセージの既読処理
 */
export async function PATCH(
  request: Request
) {
  try {
    const { messageId } = await request.json();

    if (!messageId) {
      return NextResponse.json(
        { success: false, error: 'messageIdが必要です' },
        { status: 400 }
      );
    }

    await markChatMessageAsRead(messageId);

    return NextResponse.json({
      success: true,
      message: 'メッセージを既読にしました'
    });
  } catch (error) {
    console.error('チャットメッセージ既読更新エラー:', error);
    return NextResponse.json(
      { success: false, error: 'チャットメッセージの既読更新に失敗しました' },
      { status: 500 }
    );
  }
} 