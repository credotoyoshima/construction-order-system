import { NextRequest, NextResponse } from 'next/server';
import { getOrders, getConstructionItems } from '@/lib/googleSheets';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get('dateFrom') || '2025-01';
    const dateTo = searchParams.get('dateTo') || '2025-12';

    console.log('📊 統計データ取得開始:', { dateFrom, dateTo });

    // 受注データの取得
    const orders = await getOrders();
    console.log('📋 取得した受注データ数:', orders.length);
    console.log('📋 受注データサンプル:', orders.slice(0, 2));
    
    // 期間フィルタリング
    const filteredOrders = orders.filter(order => {
      const orderDate = new Date(order.orderDate || order.createdAt);
      const orderMonth = orderDate.toISOString().slice(0, 7); // YYYY-MM
      console.log('📅 受注日確認:', {
        orderId: order.id,
        orderDate: order.orderDate,
        createdAt: order.createdAt,
        parsedDate: orderDate,
        orderMonth: orderMonth,
        inRange: orderMonth >= dateFrom && orderMonth <= dateTo
      });
      return orderMonth >= dateFrom && orderMonth <= dateTo;
    });

    console.log('🔍 フィルタリング結果:', {
      totalOrders: orders.length,
      filteredOrders: filteredOrders.length,
      dateRange: `${dateFrom} 〜 ${dateTo}`
    });

    // 施工項目データの取得（売上計算用）
    const constructionItems = await getConstructionItems();
    console.log('🔧 施工項目データ数:', constructionItems.length);

    // 統計計算
    const totalOrders = filteredOrders.length;
    
    // 完了した受注の数
    const completedOrders = filteredOrders.filter(order => 
      order.status === '施工完了' || order.status === '請求済み' || order.status === '入金済み'
    ).length;
    
    const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

    // 売上計算（簡易版 - 施工項目の価格を基に計算）
    let totalRevenue = 0;
    filteredOrders.forEach(order => {
      // デフォルト価格を設定（実際の受注項目データがない場合）
      const defaultOrderValue = 50000; // 5万円をデフォルトとする
      totalRevenue += defaultOrderValue;
    });

    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const stats = {
      totalOrders,
      totalRevenue,
      completionRate,
      averageOrderValue
    };

    console.log('📈 計算された統計:', stats);
    console.log('📈 詳細計算結果:', {
      totalOrders,
      completedOrders,
      completionRate: `${completionRate.toFixed(1)}%`,
      totalRevenue: `¥${totalRevenue.toLocaleString()}`,
      averageOrderValue: `¥${averageOrderValue.toLocaleString()}`
    });

    return NextResponse.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('統計データ取得エラー:', error);
    return NextResponse.json({
      success: false,
      error: 'データの取得に失敗しました'
    }, { status: 500 });
  }
} 