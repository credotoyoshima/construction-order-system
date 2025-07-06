import { NextRequest, NextResponse } from 'next/server';
import { deleteUser } from '@/lib/googleSheets';

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'ユーザーIDが必要です'
      }, { status: 400 });
    }

    const result = await deleteUser(userId);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'ユーザーが削除されました'
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || 'ユーザーの削除に失敗しました'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('ユーザー削除API エラー:', error);
    return NextResponse.json({
      success: false,
      error: 'サーバーエラーが発生しました'
    }, { status: 500 });
  }
} 