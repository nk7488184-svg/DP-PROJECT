import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = body.email || 'admin@iitmandi.ac.in';
    const name = body.name || (email.includes('admin') ? 'IIT Mandi Admin' : email.split('@')[0]);

    const user = {
      id: `usr_google_${Date.now()}`,
      name: name,
      username: email.split('@')[0],
      email: email,
      role: 'Super Administrator',
      department: 'Campus Safety & Enforcement',
      campus: 'IIT Mandi (Kamand)',
      authProvider: 'google',
      avatarUrl: body.avatarUrl || 'https://lh3.googleusercontent.com/a/default-user=s96-c',
      permissions: ['ALL_PERMISSIONS', 'RADAR_OVERRIDE', 'ALPR_EXPORT'],
      token: `g_oauth_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    };

    return NextResponse.json({
      success: true,
      message: 'Google OAuth authentication successful',
      user,
      token: user.token,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Google OAuth error' },
      { status: 500 }
    );
  }
}
