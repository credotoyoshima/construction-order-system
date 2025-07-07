import { NextRequest, NextResponse } from 'next/server';
import { getOrderItems, getConstructionItems } from '@/lib/googleSheets';

// 特定注文の施工項目取得
export async function GET(
  request: NextRequest,
  { params }: any
) {
  try {
    const orderId = params.id;
    
    // 注文の施工項目を取得
    const orderItems = await getOrderItems(orderId);
    
    // 施工項目マスターも取得してデータを結合
    const constructionItems = await getConstructionItems();
    
    // orderItemsに施工項目の詳細情報を追加
    const enrichedOrderItems = orderItems.map(orderItem => ({
      ...orderItem,
      constructionItem: constructionItems.find(ci => ci.id === orderItem.itemId)
    }));

    return NextResponse.json({
      success: true,
      data: enrichedOrderItems
    });
  } catch (error) {
    console.error('施工項目取得API エラー:', error);
    
    return NextResponse.json({
      success: false,
      error: 'データの取得に失敗しました'
    }, { status: 500 });
  }
} 