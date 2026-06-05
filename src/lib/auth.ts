import { SignJWT, jwtVerify } from 'jose';

const getSecretKey = () => {
  const secret = process.env.JWT_SECRET || "fallback-secret-key-that-is-at-least-32-characters-long";
  return new TextEncoder().encode(secret);
};

export async function encryptSession(payload: { username: string }): Promise<string> {
  const key = getSecretKey();
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(key);
}

export async function decryptSession(token: string): Promise<{ username: string } | null> {
  try {
    const key = getSecretKey();
    const { payload } = await jwtVerify(token, key, {
      algorithms: ['HS256'],
    });
    return payload as { username: string };
  } catch (error) {
    return null;
  }
}
