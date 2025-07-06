import { NextRequest, NextResponse } from 'next/server';
import { updateOrder, getOrders, createScheduleChangeNotification, createStatusChangeNotification } from '@/lib/googleSheets';
import type { Order } from '@/types';

// 特定注文の取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id;
    const orders = await getOrders();
    const order = orders.find(o => o.id === orderId);
    
    if (!order) {
      return NextResponse.json({
        success: false,
        error: '注文が見つかりません'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('注文取得API エラー:', error);
    
    return NextResponse.json({
      success: false,
      error: 'データの取得に失敗しました'
    }, { status: 500 });
  }
}

// 注文の更新
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id;
    const body = await request.json();
    
    console.log('🔄 注文更新API呼び出し:', orderId);
    console.log('📥 受信データ:', body);
    
    const { 
      propertyName,
      roomNumber,
      address,
      roomArea,
      constructionDate,
      keyLocation,
      keyReturn,
      notes,
      contactPerson,
      status,
      orderItems
    } = body;

    // 変更前の施工予定日を取得
    const ordersList = await getOrders();
    const oldOrder = ordersList.find(o => o.id === orderId);
    const oldConstructionDate = oldOrder?.constructionDate;

    console.log('📋 施工項目（API側）:', orderItems);

    // バリデーション
    if (!propertyName || !address || !constructionDate) {
      console.error('❌ バリデーションエラー: 必須項目不足');
      return NextResponse.json({
        success: false,
        error: '必須項目が不足しています'
      }, { status: 400 });
    }

          console.log('✅ バリデーション通過、データ保存開始...');

    const updatedOrder = await updateOrder(orderId, {
      propertyName,
      roomNumber: roomNumber || '',
      address,
      roomArea: roomArea ? parseFloat(roomArea) : undefined,
      constructionDate,
      keyLocation: keyLocation || '',
      keyReturn: keyReturn || '',
      notes: notes || '',
      contactPerson: contactPerson || '',
      status,
      orderItems: orderItems || []
    });

          console.log('✅ データ保存完了:', updatedOrder.id);

    // ステータスが変更された場合、通知を生成
    if (status && oldOrder && oldOrder.status !== status) {
      try {
        await createStatusChangeNotification(orderId, status, updatedOrder.propertyName, updatedOrder.userId);
      } catch (error) {
        console.error('❌ ステータス変更通知エラー:', error);
      }
    }

    // 施工予定日が変更された場合、管理者へメール通知
    if (oldConstructionDate && oldConstructionDate !== constructionDate) {
      try {
        await createScheduleChangeNotification(orderId, oldConstructionDate, constructionDate);
      } catch (error) {
        console.error('❌ 施工予定日変更通知エラー:', error);
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedOrder
    });
  } catch (error) {
    console.error('💥 注文更新API エラー:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '注文の更新に失敗しました'
    }, { status: 500 });
  }
} 