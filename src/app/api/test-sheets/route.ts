import { NextRequest, NextResponse } from 'next/server';
import { 
  connectToGoogleSheets, 
  getUsers, 
  getOrders, 
  getConstructionItems 
} from '@/lib/googleSheets';

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Google Sheets接続テストAPI開始...');
    
    const results = {
      connection: false,
      spreadsheetName: '',
      users: { count: 0, data: [] as any[], error: null as string | null },
      orders: { count: 0, data: [] as any[], error: null as string | null },
      constructionItems: { count: 0, data: [] as any[], error: null as string | null },
      timestamp: new Date().toISOString()
    };

    // 基本接続テスト
    try {
      const doc = await connectToGoogleSheets();
      results.connection = true;
      results.spreadsheetName = doc.title;
      console.log('✅ 基本接続成功:', doc.title);
    } catch (error) {
      console.error('❌ 基本接続エラー:', error);
      return NextResponse.json({
        success: false,
        error: `基本接続エラー: ${error instanceof Error ? error.message : String(error)}`,
        results
      }, { status: 500 });
    }

    // ユーザーデータ取得テスト
    try {
      const users = await getUsers();
      results.users.count = users.length;
      results.users.data = users.slice(0, 3); // 最初の3件のみ返す
      console.log('✅ ユーザーデータ取得成功:', users.length, '件');
    } catch (error) {
      console.error('❌ ユーザーデータ取得エラー:', error);
      results.users.error = error instanceof Error ? error.message : String(error);
    }

    // 受注データ取得テスト
    try {
      const orders = await getOrders();
      results.orders.count = orders.length;
      results.orders.data = orders.slice(0, 3); // 最初の3件のみ返す
      console.log('✅ 受注データ取得成功:', orders.length, '件');
    } catch (error) {
      console.error('❌ 受注データ取得エラー:', error);
      results.orders.error = error instanceof Error ? error.message : String(error);
    }

    // 施工項目データ取得テスト
    try {
      const items = await getConstructionItems();
      results.constructionItems.count = items.length;
      results.constructionItems.data = items.slice(0, 3); // 最初の3件のみ返す
      console.log('✅ 施工項目データ取得成功:', items.length, '件');
    } catch (error) {
      console.error('❌ 施工項目データ取得エラー:', error);
      results.constructionItems.error = error instanceof Error ? error.message : String(error);
    }

    console.log('🎉 Google Sheets接続テスト完了');

    return NextResponse.json({
      success: true,
      message: 'Google Sheets接続テスト完了',
      results
    });

  } catch (error) {
    console.error('❌ 予期しないエラー:', error);
    return NextResponse.json({
      success: false,
      error: `予期しないエラー: ${error instanceof Error ? error.message : String(error)}`
    }, { status: 500 });
  }
} 