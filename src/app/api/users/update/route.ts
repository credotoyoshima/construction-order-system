import { NextRequest, NextResponse } from 'next/server';
import { updateUser } from '@/lib/googleSheets';

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, ...updateData } = body;

    console.log('ユーザー更新API呼び出し:', { userId, updateData });

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'ユーザーIDが必要です'
      }, { status: 400 });
    }

    // 必要なフィールドのバリデーション
    const requiredFields = ['companyName', 'storeName', 'email', 'phoneNumber', 'address'];
    for (const field of requiredFields) {
      if (!updateData[field]) {
        return NextResponse.json({
          success: false,
          error: `${field}は必須項目です`
        }, { status: 400 });
      }
    }

    // メールアドレスの形式チェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(updateData.email)) {
      return NextResponse.json({
        success: false,
        error: 'メールアドレスの形式が正しくありません'
      }, { status: 400 });
    }

    const result = await updateUser(userId, updateData);

    if (result.success) {
      console.log('ユーザー更新成功:', result.data);
      return NextResponse.json({
        success: true,
        message: 'ユーザー情報が更新されました',
        data: result.data
      });
    } else {
      console.error('ユーザー更新エラー:', result.error);
      return NextResponse.json({
        success: false,
        error: result.error || 'ユーザー情報の更新に失敗しました'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('ユーザー更新API エラー:', error);
    return NextResponse.json({
      success: false,
      error: 'サーバーエラーが発生しました'
    }, { status: 500 });
  }
} 