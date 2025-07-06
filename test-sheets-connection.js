const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config({ path: '.env.local' });

async function testConnection() {
  try {
    console.log('🔄 Google Sheets API接続テストを開始します...');
    
    // 環境変数の確認
    const requiredEnvVars = [
      'GOOGLE_SHEETS_CLIENT_EMAIL',
      'GOOGLE_SHEETS_PRIVATE_KEY',
      'GOOGLE_SPREADSHEET_ID'
    ];
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      console.error('❌ 以下の環境変数が設定されていません:', missingVars);
      return;
    }
    
    console.log('✅ 環境変数が正しく設定されています');
    
    // JWT認証の設定
    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      key: process.env.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    
    console.log('✅ JWT認証設定完了');
    
    // スプレッドシートに接続
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SPREADSHEET_ID, serviceAccountAuth);
    
    console.log('✅ スプレッドシートインスタンス作成完了');
    
    // スプレッドシートの情報を読み込み
    await doc.loadInfo();
    
    console.log('✅ スプレッドシートに接続成功!');
    console.log(`📄 スプレッドシート名: ${doc.title}`);
    
    // シート一覧を表示
    console.log('📋 利用可能なシート:');
    doc.sheetsByIndex.forEach((sheet, index) => {
      console.log(`  ${index + 1}. ${sheet.title}`);
    });
    
    // 各シートの詳細を確認
    console.log('\n📊 各シートの詳細:');
    for (const sheet of doc.sheetsByIndex) {
      try {
        await sheet.loadHeaderRow();
        console.log(`  ${sheet.title}:`);
        console.log(`    - 行数: ${sheet.rowCount}`);
        console.log(`    - 列数: ${sheet.columnCount}`);
        if (sheet.headerValues && sheet.headerValues.length > 0) {
          console.log(`    - ヘッダー: ${sheet.headerValues.join(', ')}`);
        } else {
          console.log(`    - ヘッダー: 未設定またはデータなし`);
        }
      } catch (error) {
        console.log(`  ${sheet.title}: ヘッダー読み込みエラー (${error.message})`);
      }
    }
    
    console.log('\n🎉 接続テストが完了しました！');
    
  } catch (error) {
    console.error('❌ 接続エラーが発生しました:');
    console.error(error.message);
    
    if (error.message.includes('No access, refresh token') || error.message.includes('insufficientPermissions')) {
      console.log('\n💡 解決方法:');
      console.log('1. スプレッドシートがサービスアカウントと共有されているか確認してください');
      console.log('2. サービスアカウントのメールアドレス:', process.env.GOOGLE_SHEETS_CLIENT_EMAIL);
      console.log('3. 共有権限が「編集者」以上になっているか確認してください');
    }
    
    if (error.message.includes('Invalid credentials') || error.message.includes('invalid_grant')) {
      console.log('\n💡 解決方法:');
      console.log('1. GOOGLE_SHEETS_PRIVATE_KEY が正しく設定されているか確認してください');
      console.log('2. 改行文字が正しく設定されているか確認してください');
      console.log('3. GOOGLE_SHEETS_CLIENT_EMAIL が正しく設定されているか確認してください');
    }
    
    if (error.message.includes('Requested entity was not found')) {
      console.log('\n💡 解決方法:');
      console.log('1. GOOGLE_SPREADSHEET_ID が正しく設定されているか確認してください');
      console.log('2. スプレッドシートが存在し、アクセス可能であることを確認してください');
    }
  }
}

testConnection(); 