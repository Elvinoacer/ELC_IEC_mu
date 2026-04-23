import { NextRequest } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { success, error, serverError } from '@/lib/response';

const updateSchema = z.object({
  title: z.string().min(2).optional(),
  displayOrder: z.number().int().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const positionId = parseInt(id, 10);
    if (isNaN(positionId)) return error('Invalid position ID', 400);

    const body = await req.json();
    const result = updateSchema.safeParse(body);

    if (!result.success) {
      return error(result.error.issues[0].message, 400);
    }

    const position = await prisma.position.findUnique({ where: { id: positionId } });
    if (!position) return error('Position not found', 404);

    // If title is being updated, check for duplicates
    if (result.data.title && result.data.title !== position.title) {
      const existing = await prisma.position.findUnique({ where: { title: result.data.title } });
      if (existing) return error('A position with this title already exists', 409);
    }

    const updated = await prisma.position.update({
      where: { id: positionId },
      data: result.data
    });

    return success({ message: 'Position updated', position: updated });
  } catch (err) {
    return serverError(err);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const positionId = parseInt(id, 10);
    if (isNaN(positionId)) return error('Invalid position ID', 400);

    const position = await prisma.position.findUnique({ 
      where: { id: positionId },
      include: {
        _count: {
          select: { candidates: true, votes: true }
        }
      }
    });

    if (!position) return error('Position not found', 404);

    if (position._count.candidates > 0) {
      return error('Cannot delete position: there are candidates registered for this position.', 409);
    }
    if (position._count.votes > 0) {
      return error('Cannot delete position: votes have already been cast for this position.', 409);
    }

    await prisma.position.delete({ where: { id: positionId } });

    return success({ message: 'Position deleted successfully' });
  } catch (err) {
    return serverError(err);
  }
}
