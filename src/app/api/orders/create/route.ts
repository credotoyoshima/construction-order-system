import { NextRequest, NextResponse } from 'next/server';
import { addOrder, createOrderNotification } from '@/lib/googleSheets';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // バリデーション
    const {
      userId,
      contactPerson,
      propertyName,
      roomNumber,
      roomArea,
      address,
      constructionDate,
      keyLocation,
      keyReturn,
      notes,
      constructionItems,
      status
    } = body;

    // 必須フィールドのチェック
    if (!userId || !contactPerson || !propertyName || !roomNumber || !address || !constructionDate || !keyLocation || !keyReturn || !status) {
      return NextResponse.json({
        success: false,
        error: '必須フィールドが不足しています'
      }, { status: 400 });
    }

    console.log('📝 新規発注データ受信:', {
      userId,
      contactPerson,
      propertyName,
      roomNumber,
      roomArea,
      address,
      constructionDate,
      keyLocation,
      keyReturn,
      notes,
      constructionItems,
      status
    });

    // Google Sheetsに新規受注を追加
    try {
      const newOrder = await addOrder({
        userId,
        contactPerson,
        propertyName,
        roomNumber,
        roomArea,
        address,
        constructionDate,
        keyLocation,
        keyReturn,
        status,
        notes: notes || '',
        constructionItems: constructionItems || []
      });

      console.log('✅ 新規発注データ保存成功:', newOrder.id);

      // 自動お知らせの生成
      try {
        await createOrderNotification(newOrder);
        console.log('✅ 新規受注お知らせ生成成功');
      } catch (notificationError) {
        console.error('⚠️ お知らせ生成エラー（受注処理は成功）:', notificationError);
        // お知らせ生成の失敗は受注処理の成功に影響しない
      }

      return NextResponse.json({
        success: true,
        message: '発注が正常に登録されました',
        data: newOrder
      });

    } catch (googleSheetsError) {
      console.error('❌ Google Sheets保存エラー:', googleSheetsError);
      return NextResponse.json({
        success: false,
        error: `データの保存に失敗しました: ${googleSheetsError instanceof Error ? googleSheetsError.message : String(googleSheetsError)}`
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ 新規発注API エラー:', error);
    return NextResponse.json({
      success: false,
      error: '発注処理中にエラーが発生しました'
    }, { status: 500 });
  }
} 