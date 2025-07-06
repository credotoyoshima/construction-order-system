import { NextRequest, NextResponse } from 'next/server';
import { getOrders } from '@/lib/googleSheets';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get('dateFrom') || '2025-01';
    const dateTo = searchParams.get('dateTo') || '2025-12';

    console.log('月別データ取得:', { dateFrom, dateTo });

    // 受注データの取得
    const orders = await getOrders();
    
    // 期間フィルタリング
    const filteredOrders = orders.filter(order => {
      const orderDate = new Date(order.orderDate || order.createdAt);
      const orderMonth = orderDate.toISOString().slice(0, 7); // YYYY-MM
      return orderMonth >= dateFrom && orderMonth <= dateTo;
    });

    // 月別にグループ化
    const monthlyStats: { [key: string]: { orders: number; revenue: number } } = {};
    
    filteredOrders.forEach(order => {
      const orderDate = new Date(order.orderDate || order.createdAt);
      const monthKey = orderDate.toISOString().slice(0, 7); // YYYY-MM
      
      if (!monthlyStats[monthKey]) {
        monthlyStats[monthKey] = { orders: 0, revenue: 0 };
      }
      
      monthlyStats[monthKey].orders += 1;
      // デフォルト価格を設定（実際の受注項目データがない場合）
      const defaultOrderValue = 50000; // 5万円をデフォルトとする
      monthlyStats[monthKey].revenue += defaultOrderValue;
    });

    // 期間内の全ての月を生成（データがない月も含める）
    const startDate = new Date(dateFrom + '-01');
    const endDate = new Date(dateTo + '-01');
    const monthlyData = [];

    for (let d = new Date(startDate); d <= endDate; d.setMonth(d.getMonth() + 1)) {
      const monthKey = d.toISOString().slice(0, 7);
      const monthName = d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'short' });
      
      monthlyData.push({
        month: monthName,
        orders: monthlyStats[monthKey]?.orders || 0,
        revenue: monthlyStats[monthKey]?.revenue || 0
      });
    }

    console.log('月別データ:', monthlyData);

    return NextResponse.json({
      success: true,
      data: monthlyData
    });
  } catch (error) {
    console.error('月別データ取得エラー:', error);
    return NextResponse.json({
      success: false,
      error: 'データの取得に失敗しました'
    }, { status: 500 });
  }
} 