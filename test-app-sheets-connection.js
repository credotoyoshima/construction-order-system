// アプリケーションのGoogle Sheetsサービステスト
require('dotenv').config({ path: '.env.local' });

// TypeScriptファイルを動的にインポートするためのsetup
require('ts-node/register');

async function testAppConnection() {
  try {
    console.log('🔄 アプリケーションのGoogle Sheets接続テストを開始します...');
    
    // アプリケーションのgoogleSheets.tsをインポート
    const { 
      connectToGoogleSheets, 
      getUsers, 
      getOrders, 
      getConstructionItems 
    } = require('./src/lib/googleSheets.ts');
    
    console.log('✅ googleSheets.tsモジュールの読み込み完了');
    
    // 基本接続テスト
    console.log('\n1. 基本接続テスト...');
    const doc = await connectToGoogleSheets();
    console.log(`✅ 接続成功: ${doc.title}`);
    
    // ユーザーデータ取得テスト
    console.log('\n2. ユーザーデータ取得テスト...');
    const users = await getUsers();
    console.log(`✅ ユーザー数: ${users.length}件`);
    if (users.length > 0) {
      console.log('   最初のユーザー:', {
        id: users[0].id,
        role: users[0].role,
        companyName: users[0].companyName,
        email: users[0].email
      });
    }
    
    // 受注データ取得テスト
    console.log('\n3. 受注データ取得テスト...');
    const orders = await getOrders();
    console.log(`✅ 受注数: ${orders.length}件`);
    if (orders.length > 0) {
      console.log('   最初の受注:', {
        id: orders[0].id,
        userId: orders[0].userId,
        propertyName: orders[0].propertyName,
        status: orders[0].status
      });
    }
    
    // 施工項目データ取得テスト
    console.log('\n4. 施工項目データ取得テスト...');
    const items = await getConstructionItems();
    console.log(`✅ 施工項目数: ${items.length}件`);
    if (items.length > 0) {
      console.log('   最初の項目:', {
        id: items[0].id,
        name: items[0].name,
        price: items[0].price,
        active: items[0].active
      });
    }
    
    console.log('\n🎉 すべてのテストが完了しました！');
    console.log('\n=== テスト結果まとめ ===');
    console.log(`ユーザー: ${users.length}件`);
    console.log(`受注: ${orders.length}件`);
    console.log(`施工項目: ${items.length}件`);
    
  } catch (error) {
    console.error('❌ アプリケーション接続エラー:', error.message);
    console.error('詳細:', error);
    
    // よくあるエラーの解決方法
    if (error.message.includes('Cannot find module')) {
      console.log('\n💡 解決方法:');
      console.log('1. ts-nodeがインストールされていない可能性があります');
      console.log('   npm install --save-dev ts-node');
    }
    
    if (error.message.includes('シートが見つかりません')) {
      console.log('\n💡 解決方法:');
      console.log('1. スプレッドシートのシート名を確認してください');
      console.log('2. 期待されるシート: users, orders, construction_items, order_items, notifications');
    }
  }
}

testAppConnection(); 