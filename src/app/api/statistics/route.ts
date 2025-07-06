import { NextResponse } from 'next/server';
import { getStatistics } from '@/lib/googleSheets';

export async function GET() {
  try {
    const statistics = await getStatistics();
    
    return NextResponse.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    console.error('統計データ取得API エラー:', error);
    
    return NextResponse.json({
      success: false,
      error: 'データの取得に失敗しました'
    }, { status: 500 });
  }
} 