import { NextRequest } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { success, error, serverError } from '@/lib/response';
import { requireAdminSession } from '@/lib/admin-auth';
import { logAudit } from '@/lib/audit';

const positionSchema = z.object({
  title: z.string().min(2, 'Position title must be at least 2 characters'),
});

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdminSession(req);
    if ('response' in auth) return auth.response;

    const positions = await prisma.position.findMany({
      orderBy: { displayOrder: 'asc' },
      include: {
        _count: {
          select: { candidates: true, votes: true }
        }
      }
    });

    return success(positions);
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdminSession(req);
    if ('response' in auth) return auth.response;

    const body = await req.json();
    const result = positionSchema.safeParse(body);

    if (!result.success) {
      return error(result.error.issues[0].message, 400);
    }

    const { title } = result.data;

    // Check if position already exists
    const existing = await prisma.position.findUnique({ where: { title } });
    if (existing) {
      return error('A position with this title already exists', 409);
    }

    // Determine next display order
    const maxOrder = await prisma.position.aggregate({
      _max: { displayOrder: true }
    });
    
    const nextOrder = (maxOrder._max.displayOrder ?? 0) + 1;

    const position = await prisma.position.create({
      data: {
        title,
        displayOrder: nextOrder,
      }
    });

    await logAudit(
      req,
      auth.admin.id,
      'CREATE_POSITION',
      'Position',
      position.id,
      { title: position.title }
    );

    return success({ message: 'Position created successfully', position }, 201);
  } catch (err) {
    return serverError(err);
  }
}
