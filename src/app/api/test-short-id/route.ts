import { NextRequest, NextResponse } from 'next/server';
import { addUser, addOrder, getUsers, getOrders } from '@/lib/googleSheets';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'test-user') {
      // テストユーザーの作成
      const testUser = await addUser({
        companyName: 'テスト会社',
        storeName: 'テスト店舗',
        email: `test-${Date.now()}@example.com`,
        phoneNumber: '03-0000-0000',
        address: 'テスト住所',
        password: 'password123'
      });

      return NextResponse.json({
        success: true,
        message: '短縮IDでテストユーザーを作成しました',
        data: testUser
      });

    } else if (action === 'test-order') {
      // 既存ユーザーでテスト注文の作成
      const users = await getUsers();
      if (users.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'テスト注文を作成するには、まずユーザーが必要です'
        }, { status: 400 });
      }

      const testOrder = await addOrder({
        userId: users[0].id, // 最初のユーザーを使用
        contactPerson: 'テスト担当者',
        propertyName: 'テスト物件',
        roomNumber: '101',
        address: 'テスト住所',
        constructionDate: '2025-02-01',
        keyLocation: 'テスト管理室',
        keyReturn: 'テスト管理室',
        notes: 'テスト注文です'
      });

      return NextResponse.json({
        success: true,
        message: '短縮IDでテスト注文を作成しました',
        data: testOrder
      });

    } else if (action === 'check-ids') {
      // 現在のID状況を確認
      const [users, orders] = await Promise.all([
        getUsers(),
        getOrders()
      ]);

      const userIds = users.map(u => u.id).sort();
      const orderIds = orders.map(o => o.id).sort();

      return NextResponse.json({
        success: true,
        message: '現在のID状況',
        data: {
          totalUsers: users.length,
          totalOrders: orders.length,
          userIds: userIds,
          orderIds: orderIds,
          lastUserId: userIds[userIds.length - 1] || 'なし',
          lastOrderId: orderIds[orderIds.length - 1] || 'なし'
        }
      });

    } else {
      return NextResponse.json({
        success: false,
        error: 'actionパラメータが必要です (test-user, test-order, check-ids)'
      }, { status: 400 });
    }

  } catch (error) {
    console.error('短縮IDテストAPI エラー:', error);
    
    return NextResponse.json({
      success: false,
      error: `テスト実行エラー: ${error instanceof Error ? error.message : '不明なエラー'}`
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: '短縮IDテストAPI',
    usage: {
      method: 'POST',
      actions: [
        'test-user: テストユーザーを短縮IDで作成',
        'test-order: テスト注文を短縮IDで作成',
        'check-ids: 現在のID状況を確認'
      ],
      example: '{ "action": "check-ids" }'
    }
  });
} 