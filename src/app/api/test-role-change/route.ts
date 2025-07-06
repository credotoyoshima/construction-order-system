import { NextRequest, NextResponse } from 'next/server';
import { getUsers, connectToGoogleSheets } from '@/lib/googleSheets';

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 現在のユーザー権限一覧を取得中...');
    
    const users = await getUsers();
    
    const userRoles = users.map(user => ({
      id: user.id,
      email: user.email,
      companyName: user.companyName,
      storeName: user.storeName,
      role: user.role,
      status: user.status
    }));

    return NextResponse.json({
      success: true,
      message: '現在のユーザー権限一覧',
      data: userRoles,
      totalUsers: userRoles.length,
      adminCount: userRoles.filter(u => u.role === 'admin').length,
      userCount: userRoles.filter(u => u.role === 'user').length
    });

  } catch (error) {
    console.error('❌ ユーザー権限取得エラー:', error);
    return NextResponse.json({
      success: false,
      error: `エラー: ${error instanceof Error ? error.message : String(error)}`
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, newRole } = body;

    if (!email || !newRole) {
      return NextResponse.json({
        success: false,
        error: 'emailとnewRoleは必須です'
      }, { status: 400 });
    }

    if (!['admin', 'user'].includes(newRole)) {
      return NextResponse.json({
        success: false,
        error: 'newRoleは"admin"または"user"である必要があります'
      }, { status: 400 });
    }

    console.log(`🔄 ${email}の権限を${newRole}に変更中...`);

    // Google Sheetsから対象ユーザーを検索して更新
    const doc = await connectToGoogleSheets();
    const usersSheet = doc.sheetsByTitle['users'];
    
    if (!usersSheet) {
      throw new Error('usersシートが見つかりません');
    }

    const rows = await usersSheet.getRows();
    const targetRow = rows.find(row => row.get('email') === email);
    
    if (!targetRow) {
      return NextResponse.json({
        success: false,
        error: `メールアドレス ${email} のユーザーが見つかりません`
      }, { status: 404 });
    }

    const oldRole = targetRow.get('role');
    targetRow.set('role', newRole);
    await targetRow.save();

    console.log(`✅ 権限変更成功: ${email} (${oldRole} → ${newRole})`);

    return NextResponse.json({
      success: true,
      message: '権限変更が完了しました',
      data: {
        email,
        oldRole,
        newRole,
        note: 'ユーザーは再ログインする必要があります'
      }
    });

  } catch (error) {
    console.error('❌ 権限変更エラー:', error);
    return NextResponse.json({
      success: false,
      error: `権限変更エラー: ${error instanceof Error ? error.message : String(error)}`
    }, { status: 500 });
  }
} 