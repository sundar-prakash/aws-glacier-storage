import { NextRequest, NextResponse } from 'next/server';
import { encryptSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    const expectedUser = process.env.ADMIN_USER || 'admin';
    const expectedPass = process.env.ADMIN_PASS || 'admin123';

    if (username === expectedUser && password === expectedPass) {
      // Create session
      const sessionToken = await encryptSession({ username });
      
      const response = NextResponse.json({ success: true });
      
      // Set secure HTTP-only cookie
      response.cookies.set({
        name: 'session',
        value: sessionToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      });

      return response;
    }

    return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
