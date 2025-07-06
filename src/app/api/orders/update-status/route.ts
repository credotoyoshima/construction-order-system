import { NextRequest, NextResponse } from 'next/server';
import { updateOrderStatus, createStatusChangeNotification, getOrders } from '@/lib/googleSheets';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, status } = body;

    // バリデーション
    if (!orderId || !status) {
      return NextResponse.json({
        success: false,
        error: 'orderIdとstatusは必須です'
      }, { status: 400 });
    }

    const validStatuses = ['日程待ち', '日程確定', '施工完了', '請求済み', '入金済み', '依頼キャンセル'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({
        success: false,
        error: '無効なステータスです'
      }, { status: 400 });
    }

    console.log(`🔄 受注ステータス更新: ${orderId} → ${status}`);

    // Google Sheetsでステータス更新
    try {
      const updatedRow = await updateOrderStatus(orderId, status);
      
      console.log(`✅ ステータス更新成功: ${orderId}`);

      // 自動お知らせの生成（物件名取得のため受注データを取得）
      try {
        const orders = await getOrders();
        const updatedOrder = orders.find(order => order.id === orderId);
        
        if (updatedOrder) {
          await createStatusChangeNotification(orderId, status, updatedOrder.propertyName, updatedOrder.userId);
          console.log('✅ ステータス変更お知らせ生成成功');
        }
      } catch (notificationError) {
        console.error('⚠️ お知らせ生成エラー（ステータス更新は成功）:', notificationError);
        // お知らせ生成の失敗はステータス更新の成功に影響しない
      }

      return NextResponse.json({
        success: true,
        message: 'ステータスが更新されました',
        data: {
          orderId,
          newStatus: status,
          updatedAt: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error('❌ ステータス更新エラー:', error);
      return NextResponse.json({
        success: false,
        error: `ステータス更新に失敗しました: ${error instanceof Error ? error.message : String(error)}`
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ API エラー:', error);
    return NextResponse.json({
      success: false,
      error: 'ステータス更新処理でエラーが発生しました'
    }, { status: 500 });
  }
} 