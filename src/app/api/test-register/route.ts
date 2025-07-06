import { NextRequest, NextResponse } from 'next/server';
import { addUser, connectToGoogleSheets } from '@/lib/googleSheets';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 ユーザー登録テスト開始...');
    
    const body = await request.json();
    console.log('📥 受信データ:', body);
    
    const { 
      companyName, 
      storeName, 
      email, 
      phoneNumber, 
      address, 
      password 
    } = body;

    // 基本接続テスト
    console.log('1. Google Sheets接続テスト...');
    try {
      const doc = await connectToGoogleSheets();
      console.log('✅ 接続成功:', doc.title);
      
      // シート一覧確認
      console.log('📋 利用可能なシート:', Object.keys(doc.sheetsByTitle));
      
      // usersシートの存在確認
      const usersSheet = doc.sheetsByTitle['users'];
      if (usersSheet) {
        console.log('✅ usersシート見つかりました');
        console.log('   - 行数:', usersSheet.rowCount);
        console.log('   - 列数:', usersSheet.columnCount);
        
        // ヘッダー確認
        await usersSheet.loadHeaderRow();
        console.log('   - ヘッダー:', usersSheet.headerValues);
      } else {
        console.error('❌ usersシートが見つかりません');
        return NextResponse.json({
          success: false,
          error: 'usersシートが見つかりません',
          availableSheets: Object.keys(doc.sheetsByTitle)
        }, { status: 500 });
      }
    } catch (error) {
      console.error('❌ 接続エラー:', error);
      return NextResponse.json({
        success: false,
        error: `接続エラー: ${error instanceof Error ? error.message : String(error)}`
      }, { status: 500 });
    }

    // 実際の登録処理テスト
    console.log('2. ユーザー登録テスト...');
    try {
      const testUserData = {
        companyName: companyName || 'テスト会社',
        storeName: storeName || 'テスト店舗',
        email: email || `test${Date.now()}@example.com`,
        phoneNumber: phoneNumber || '03-1234-5678',
        address: address || 'テスト住所',
        password: password || 'test123'
      };
      
      console.log('📝 登録データ:', testUserData);
      
      const newUser = await addUser(testUserData);
      console.log('✅ ユーザー登録成功:', newUser);
      
      return NextResponse.json({
        success: true,
        message: 'テスト登録成功',
        data: newUser
      });
      
    } catch (error) {
      console.error('❌ 登録エラー:', error);
      return NextResponse.json({
        success: false,
        error: `登録エラー: ${error instanceof Error ? error.message : String(error)}`,
        stack: error instanceof Error ? error.stack : undefined
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ 予期しないエラー:', error);
    return NextResponse.json({
      success: false,
      error: `予期しないエラー: ${error instanceof Error ? error.message : String(error)}`
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'テスト登録API',
    usage: 'POST /api/test-register',
    sampleData: {
      companyName: 'テスト株式会社',
      storeName: 'テスト支店',
      email: 'test@example.com',
      phoneNumber: '03-1234-5678',
      address: '東京都テスト区1-2-3',
      password: 'password123'
    }
  });
} 