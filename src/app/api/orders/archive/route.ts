import { NextResponse } from 'next/server';
import { getArchivedOrdersWithItems } from '@/lib/googleSheets';

/**
 * GET /api/orders/archive
 * アーカイブ済み受注データの取得
 */
export async function GET() {
  try {
    const data = await getArchivedOrdersWithItems();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('アーカイブデータ取得エラー:', error);
    return NextResponse.json({ success: false, error: 'データ取得に失敗しました' }, { status: 500 });
  }
} 