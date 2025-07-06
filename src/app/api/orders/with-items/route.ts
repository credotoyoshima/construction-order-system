import { NextResponse } from 'next/server';
import { getOrdersWithItems } from '@/lib/googleSheets';

// 施工内容を含む受注データの取得
export async function GET() {
  try {
    const orders = await getOrdersWithItems();
    
    return NextResponse.json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('施工内容付き受注データ取得API エラー:', error);
    
    return NextResponse.json({
      success: false,
      error: 'データの取得に失敗しました'
    }, { status: 500 });
  }
} 