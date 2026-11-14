import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    const normalizedUser = (username || '').trim().toLowerCase();
    const validUsers = ['admin', 'admin@iitmandi.ac.in', 'superadmin', 'neeraj', 'g18'];

    if ((validUsers.includes(normalizedUser) || normalizedUser.includes('admin')) && (password === 'admin@123' || password === 'admin' || password === 'RoadSentinel#2026')) {
      const user = {
        id: 'usr_admin_001',
        name: 'IIT Mandi Admin',
        username: 'admin',
        email: 'admin@iitmandi.ac.in',
        role: 'Super Administrator',
        department: 'Campus Safety & Edge Enforcement',
        campus: 'IIT Mandi (Kamand)',
        authProvider: 'credentials',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
        permissions: ['ALL_PERMISSIONS', 'RADAR_OVERRIDE', 'ALPR_EXPORT', 'HAZARD_APPROVE'],
        token: `jwt_rs_adm_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      };

      return NextResponse.json({
        success: true,
        message: 'Admin authentication successful',
        user,
        token: user.token,
      });
    }

    return NextResponse.json(
      {
        success: false,
        message: 'Invalid credentials. Use admin@iitmandi.ac.in / admin@123',
      },
      { status: 401 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Authentication error' },
      { status: 500 }
    );
  }
}
