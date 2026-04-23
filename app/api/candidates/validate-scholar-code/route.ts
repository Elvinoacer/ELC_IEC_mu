import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { success, error } from '@/lib/response';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');

  if (!code) {
    return error('Scholar code is required', 400);
  }

  try {
    const existing = await prisma.candidate.findUnique({
      where: { scholarCode: code }
    });

    if (existing) {
      return success({ available: false, message: 'This scholar code is already in use.' });
    }

    return success({ available: true });
  } catch (err) {
    return error('Failed to validate scholar code', 500);
  }
}
