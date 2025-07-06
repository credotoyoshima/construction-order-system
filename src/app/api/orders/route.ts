import { NextRequest, NextResponse } from 'next/server';
import { getOrders, addOrder } from '@/lib/googleSheets';

// 受注データの取得
export async function GET() {
  try {
    const orders = await getOrders();
    
    return NextResponse.json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('受注データ取得API エラー:', error);
    
    return NextResponse.json({
      success: false,
      error: 'データの取得に失敗しました'
    }, { status: 500 });
  }
}

// 新規受注の作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { 
      userId, 
      propertyName, 
      roomNumber, 
      address, 
      constructionDate, 
      keyLocation, 
      keyReturn, 
      notes 
    } = body;

    // バリデーション
    if (!userId || !propertyName || !address || !constructionDate) {
      return NextResponse.json({
        success: false,
        error: '必須項目が不足しています'
      }, { status: 400 });
    }

    const newOrder = await addOrder({
      userId,
      propertyName,
      roomNumber: roomNumber || '',
      address,
      constructionDate,
      keyLocation: keyLocation || '',
      keyReturn: keyReturn || '',
      notes: notes || ''
    });

    return NextResponse.json({
      success: true,
      data: newOrder
    });
  } catch (error) {
    console.error('新規受注作成API エラー:', error);
    
    return NextResponse.json({
      success: false,
      error: '受注の作成に失敗しました'
    }, { status: 500 });
  }
} 