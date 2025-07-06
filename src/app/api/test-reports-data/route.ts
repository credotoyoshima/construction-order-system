import { NextRequest, NextResponse } from 'next/server';
import { getOrders, getUsers, getConstructionItems } from '@/lib/googleSheets';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 レポートデータ接続テスト開始');

    // 各データの取得をテスト
    const startTime = Date.now();
    
    const [orders, users, constructionItems] = await Promise.all([
      getOrders().catch(err => {
        console.error('❌ 受注データ取得エラー:', err);
        return [];
      }),
      getUsers().catch(err => {
        console.error('❌ ユーザーデータ取得エラー:', err);
        return [];
      }),
      getConstructionItems().catch(err => {
        console.error('❌ 施工項目データ取得エラー:', err);
        return [];
      })
    ]);

    const endTime = Date.now();

    console.log('📊 データ取得結果:', {
      orders: orders.length,
      users: users.length,
      constructionItems: constructionItems.length,
      responseTime: `${endTime - startTime}ms`
    });

    // サンプルデータの表示
    console.log('📋 受注データサンプル:');
    orders.slice(0, 3).forEach((order, index) => {
      console.log(`  ${index + 1}. ID: ${order.id}, 日付: ${order.orderDate || order.createdAt}, ステータス: ${order.status}, ユーザーID: ${order.userId}`);
    });

    console.log('👥 ユーザーデータサンプル:');
    users.slice(0, 3).forEach((user, index) => {
      console.log(`  ${index + 1}. ID: ${user.id}, 会社: ${user.companyName}, メール: ${user.email}`);
    });

    console.log('🔧 施工項目データサンプル:');
    constructionItems.slice(0, 3).forEach((item, index) => {
      console.log(`  ${index + 1}. ID: ${item.id}, 名前: ${item.name}, 価格: ${item.price}`);
    });

    // 日付フォーマットの確認
    if (orders.length > 0) {
      console.log('📅 日付フォーマット確認:');
      orders.slice(0, 5).forEach((order, index) => {
        const orderDate = new Date(order.orderDate || order.createdAt);
        const orderMonth = orderDate.toISOString().slice(0, 7);
        console.log(`  ${index + 1}. ${order.id}: orderDate="${order.orderDate}", createdAt="${order.createdAt}", parsed="${orderDate}", month="${orderMonth}"`);
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          orders: orders.length,
          users: users.length,
          constructionItems: constructionItems.length,
          responseTime: endTime - startTime
        },
        samples: {
          orders: orders.slice(0, 3).map(o => ({
            id: o.id,
            orderDate: o.orderDate,
            createdAt: o.createdAt,
            status: o.status,
            userId: o.userId
          })),
          users: users.slice(0, 3).map(u => ({
            id: u.id,
            companyName: u.companyName,
            email: u.email
          })),
          constructionItems: constructionItems.slice(0, 3).map(i => ({
            id: i.id,
            name: i.name,
            price: i.price
          }))
        }
      }
    });
  } catch (error) {
    console.error('🚨 レポートデータテストエラー:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'データの取得に失敗しました',
      details: error
    }, { status: 500 });
  }
} 