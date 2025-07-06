import { NextRequest, NextResponse } from 'next/server';
import { getUsers } from '@/lib/googleSheets';

export async function GET(request: NextRequest) {
  try {
    console.log('ユーザー一覧取得API呼び出し');
    
    const users = await getUsers();
    console.log('取得したユーザー数:', users.length);
    
    // パスワード情報を除外してレスポンス用データを作成
    const safeUsers = users.map(user => ({
      id: user.id,
      role: user.role,
      companyName: user.companyName,
      storeName: user.storeName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      address: user.address,
      createdAt: user.createdAt,
      status: user.status
    }));

    return NextResponse.json({
      success: true,
      data: safeUsers
    });

  } catch (error) {
    console.error('ユーザー一覧取得API エラー:', error);
    
    return NextResponse.json({
      success: false,
      error: `ユーザー情報の取得に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`
    }, { status: 500 });
  }
}

// 開発・テスト用のPOSTエンドポイント
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'debug') {
      // デバッグ情報を返す
      const users = await getUsers();
      
      return NextResponse.json({
        success: true,
        debug: {
          totalUsers: users.length,
          userIds: users.map(u => u.id),
          sampleUser: users[0] || null,
          timestamp: new Date().toISOString()
        },
        data: users.map(user => ({
          id: user.id,
          companyName: user.companyName,
          storeName: user.storeName,
          email: user.email
        }))
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'actionパラメータが必要です (debug)'
      }, { status: 400 });
    }

  } catch (error) {
    console.error('ユーザーAPI POST エラー:', error);
    
    return NextResponse.json({
      success: false,
      error: `処理に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`
    }, { status: 500 });
  }
} 