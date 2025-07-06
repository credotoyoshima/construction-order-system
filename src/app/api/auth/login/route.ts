import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/googleSheets';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // バリデーション
    if (!email || !password) {
      return NextResponse.json({
        success: false,
        error: 'メールアドレスとパスワードは必須です'
      }, { status: 400 });
    }

    // テスト用認証（実際のGoogle Sheetsが設定されていない場合）
    const testAccounts = [
      { email: 'admin@test.com', password: 'admin123', role: 'admin' },
      { email: 'user@test.com', password: 'user123', role: 'user' }
    ];

    const testAccount = testAccounts.find(account => 
      account.email === email && account.password === password
    );

    if (testAccount) {
      // テストアカウントでログイン成功
      const mockUser = {
        id: testAccount.role === 'admin' ? 'USER001' : 'USER002',
        role: testAccount.role as 'admin' | 'user',
        companyName: testAccount.role === 'admin' ? 'テスト管理会社' : 'サンプル不動産',
        storeName: testAccount.role === 'admin' ? '本社' : '渋谷支店',
        contactPerson: testAccount.role === 'admin' ? '管理者' : 'ユーザー太郎',
        email: testAccount.email,
        phoneNumber: testAccount.role === 'admin' ? '03-1234-5678' : '03-2345-6789',
        address: '東京都渋谷区...',
        createdAt: '2025-01-01T00:00:00Z',
        status: 'active' as const
      };

      return NextResponse.json({
        success: true,
        data: {
          user: mockUser,
          message: 'ログインに成功しました'
        }
      });
    }

    // Google Sheetsでの認証を試行
    try {
      const user = await authenticateUser(email, password);
      
      return NextResponse.json({
        success: true,
        data: {
          user,
          message: 'ログインに成功しました'
        }
      });
    } catch (authError) {
      // 認証失敗
      return NextResponse.json({
        success: false,
        error: 'メールアドレスまたはパスワードが正しくありません'
      }, { status: 401 });
    }
  } catch (error) {
    console.error('ログインAPI エラー:', error);
    
    return NextResponse.json({
      success: false,
      error: 'ログイン処理でエラーが発生しました'
    }, { status: 500 });
  }
} 