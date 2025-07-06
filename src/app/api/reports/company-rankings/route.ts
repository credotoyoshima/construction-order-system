import { NextRequest, NextResponse } from 'next/server';
import { getOrders, getUsers } from '@/lib/googleSheets';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get('dateFrom') || '2025-01';
    const dateTo = searchParams.get('dateTo') || '2025-12';

    console.log('会社別ランキング取得:', { dateFrom, dateTo });

    // 受注データとユーザーデータの取得
    const [orders, users] = await Promise.all([
      getOrders(),
      getUsers()
    ]);
    
    // 期間フィルタリング
    const filteredOrders = orders.filter(order => {
      const orderDate = new Date(order.orderDate || order.createdAt);
      const orderMonth = orderDate.toISOString().slice(0, 7); // YYYY-MM
      return orderMonth >= dateFrom && orderMonth <= dateTo;
    });

    // ユーザーIDから会社名のマップを作成
    const userCompanyMap: { [key: string]: string } = {};
    users.forEach(user => {
      userCompanyMap[user.id] = user.companyName;
    });

    // 会社別に集計
    const companyStats: { [key: string]: { orderCount: number; totalAmount: number } } = {};
    
    filteredOrders.forEach(order => {
      const companyName = userCompanyMap[order.userId] || '不明な会社';
      
      if (!companyStats[companyName]) {
        companyStats[companyName] = { orderCount: 0, totalAmount: 0 };
      }
      
      companyStats[companyName].orderCount += 1;
      // デフォルト価格を設定（実際の受注項目データがない場合）
      const defaultOrderValue = 50000; // 5万円をデフォルトとする
      companyStats[companyName].totalAmount += defaultOrderValue;
    });

    // ランキング形式に変換（売上額順）
    const rankings = Object.entries(companyStats)
      .map(([companyName, stats]) => ({
        companyName,
        orderCount: stats.orderCount,
        totalAmount: stats.totalAmount,
        rank: 0 // 後で設定
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .map((company, index) => ({
        ...company,
        rank: index + 1
      }));

    console.log('会社別ランキング:', rankings);

    return NextResponse.json({
      success: true,
      data: rankings
    });
  } catch (error) {
    console.error('会社別ランキング取得エラー:', error);
    return NextResponse.json({
      success: false,
      error: 'データの取得に失敗しました'
    }, { status: 500 });
  }
} 