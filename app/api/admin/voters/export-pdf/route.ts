import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdminSession } from '@/lib/admin-auth';
import { logAudit } from '@/lib/audit';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Prisma } from "@/app/generated/prisma/client";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdminSession(req);
    if ('response' in auth) return auth.response;

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter') || 'all';

    const statusFilter: Prisma.VoterWhereInput =
      filter === 'registered'   ? { emailVerified: true } :
      filter === 'unregistered' ? { OR: [{ emailVerified: false }, { email: null }] } :
      filter === 'voted'        ? { hasVoted: true } :
      filter === 'not_voted'    ? { hasVoted: false } : {};

    const voters = await prisma.voter.findMany({
      where: statusFilter,
      orderBy: [
        { emailVerified: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    // Summary counts for header
    const [totalAll, totalRegistered, totalVoted] = await Promise.all([
      prisma.voter.count(),
      prisma.voter.count({ where: { emailVerified: true } }),
      prisma.voter.count({ where: { hasVoted: true } }),
    ]);

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // Header
    doc.setFontSize(20);
    doc.setTextColor(30, 64, 175); // brand-800
    doc.text('ELP Moi Chapter — Voter Registry', 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString('en-KE')}`, 14, 28);
    doc.text(`Filter Applied: ${filter.toUpperCase()}`, 14, 33);
    
    // Stats Summary
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text(`Total in System: ${totalAll}`, 180, 20);
    doc.text(`Registered: ${totalRegistered}`, 180, 26);
    doc.text(`Votes Cast: ${totalVoted}`, 180, 32);

    // Table
    autoTable(doc, {
      startY: 40,
      head: [['#', 'Phone Number', 'Name', 'Email Address', 'Reg. Status', 'Vote Status', 'Joined']],
      body: voters.map((v, i) => [
        i + 1,
        v.phone,
        v.name || '—',
        v.email || '—',
        v.email ? (v.emailVerified ? 'Verified' : 'Pending') : '—',
        v.hasVoted ? 'Voted' : 'Not yet',
        new Date(v.createdAt).toLocaleDateString('en-KE'),
      ]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 10 },
        4: { fontStyle: 'bold' }
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 4) {
          const val = data.cell.text[0];
          if (val === 'Verified') data.cell.styles.textColor = [22, 101, 52];
          if (val === 'Pending') data.cell.styles.textColor = [154, 82, 0];
        }
      },
    });

    const pdfArrayBuffer = doc.output('arraybuffer');

    await logAudit(req, auth.admin.id, 'EXPORT_VOTERS_PDF', 'Voter', undefined, {
      count: voters.length,
      filter
    });

    return new NextResponse(pdfArrayBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="voter_registry_${filter}_${Date.now()}.pdf"`,
      },
    });

  } catch (err) {
    console.error('PDF Export Error:', err);
    return new NextResponse(JSON.stringify({ error: 'Failed to generate PDF' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
