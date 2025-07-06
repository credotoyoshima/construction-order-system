import { NextRequest, NextResponse } from 'next/server';
import { getConstructionItems } from '@/lib/googleSheets';
import { DEFAULT_CONSTRUCTION_ITEMS } from '@/utils/constants';

// 施工項目マスター取得
export async function GET() {
  try {
    const constructionItems = await getConstructionItems();
    
    // アクティブな項目のみフィルタリング
    const activeItems = constructionItems.filter(item => item.active);
    
    return NextResponse.json({
      success: true,
      data: activeItems
    });
  } catch (error) {
    console.error('施工項目マスター取得API エラー:', error);
    
    return NextResponse.json({
      success: false,
      error: 'データの取得に失敗しました'
    }, { status: 500 });
  }
} 