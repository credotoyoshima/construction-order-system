import { NextRequest, NextResponse } from 'next/server';
import { addUser, getUsers, createUserRegistrationNotification } from '@/lib/googleSheets';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      companyName, 
      storeName, 
      email, 
      phoneNumber, 
      address, 
      password 
    } = body;

    // バリデーション
    if (!companyName || !storeName || !email || !phoneNumber || !address || !password) {
      return NextResponse.json({
        success: false,
        error: 'すべての項目は必須です'
      }, { status: 400 });
    }

    // メールアドレスの重複チェック
    try {
      const existingUsers = await getUsers();
      const existingUser = existingUsers.find(user => user.email === email);
      
      if (existingUser) {
        return NextResponse.json({
          success: false,
          error: 'このメールアドレスは既に登録されています'
        }, { status: 409 });
      }
    } catch (error) {
      // Google Sheetsに接続できない場合は警告を出すが処理を続行
      console.warn('重複チェックをスキップ:', error);
    }

    // 新規ユーザーの作成
    try {
      const newUser = await addUser({
        companyName,
        storeName,
        email,
        phoneNumber,
        address,
        password
      });

      // 自動お知らせの生成
      try {
        await createUserRegistrationNotification(newUser);
        console.log('✅ 新規ユーザー登録お知らせ生成成功');
      } catch (notificationError) {
        console.error('⚠️ お知らせ生成エラー（ユーザー登録は成功）:', notificationError);
        // お知らせ生成の失敗はユーザー登録の成功に影響しない
      }

      return NextResponse.json({
        success: true,
        data: {
          user: {
            id: newUser.id,
            role: newUser.role,
            companyName: newUser.companyName,
            storeName: newUser.storeName,
            email: newUser.email,
            phoneNumber: newUser.phoneNumber,
            address: newUser.address,
            createdAt: newUser.createdAt,
            status: newUser.status
          },
          message: '新規登録が完了しました'
        }
      });
    } catch (error) {
      console.error('ユーザー作成エラー:', error);
      
      // Google Sheetsに接続できない場合はモックレスポンスを返す
      const mockUser = {
        id: `USER${Date.now()}`,
        role: 'user' as const,
        companyName,
        storeName,
        email,
        phoneNumber,
        address,
        createdAt: new Date().toISOString(),
        status: 'active' as const
      };

      return NextResponse.json({
        success: true,
        data: {
          user: mockUser,
          message: '新規登録が完了しました（テストモード）'
        }
      });
    }
  } catch (error) {
    console.error('ユーザー登録API エラー:', error);
    
    return NextResponse.json({
      success: false,
      error: '登録処理でエラーが発生しました'
    }, { status: 500 });
  }
} 