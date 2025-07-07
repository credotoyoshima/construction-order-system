import { NextRequest, NextResponse } from 'next/server';
import { updateOrder, createKeyStatusChangeNotification, getOrders } from '@/lib/googleSheets';

export async function PATCH(
  request: NextRequest,
  { params }: any
) {
  try {
    const { keyStatus } = await request.json();
    const orderId = params.id;

    console.log('🔑 鍵ステータス更新API開始:', { orderId, keyStatus });

    if (!keyStatus || !['pending', 'handed'].includes(keyStatus)) {
      console.log('❌ 無効な鍵ステータス:', keyStatus);
      return NextResponse.json({
        success: false,
        error: '有効な鍵ステータスを指定してください'
      }, { status: 400 });
    }

    console.log('📝 Google Sheetsを更新中...');
    const updatedOrder = await updateOrder(orderId, { keyStatus });
    console.log('✅ Google Sheets更新完了:', updatedOrder);

    // 鍵未着から鍵到着済への変更の場合、管理者にメール通知を送信
    if (keyStatus === 'pending') {
      try {
        console.log('📧 鍵到着通知を送信中...');
        await createKeyStatusChangeNotification(orderId, updatedOrder.propertyName);
        console.log('✅ 鍵到着通知送信完了');
      } catch (error) {
        console.error('❌ 鍵到着通知送信エラー:', error);
        // 通知送信失敗してもメイン処理は成功とする
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedOrder
    });
  } catch (error) {
    console.error('💥 鍵ステータス更新API エラー:', error);
    
    return NextResponse.json({
      success: false,
      error: '鍵ステータスの更新に失敗しました'
    }, { status: 500 });
  }
} 