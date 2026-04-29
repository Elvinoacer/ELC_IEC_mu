import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdminSession } from '@/lib/admin-auth';
import { logAudit } from '@/lib/audit';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Prisma } from "@/app/generated/prisma/client";
import fs from 'fs';
import path from 'path';

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

    // Load Logo
    let logoBase64 = '';
    try {
      const logoPath = path.join(process.cwd(), 'public', 'image.png');
      if (fs.existsSync(logoPath)) {
        const logoBuffer = fs.readFileSync(logoPath);
        logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
      }
    } catch (e) {
      console.warn('Could not load logo for PDF:', e);
    }

    // Colors
    const colors = {
      primary: [15, 23, 42] as [number, number, number],
      accent: [220, 38, 38] as [number, number, number],
      slate: [100, 116, 139] as [number, number, number],
      gold: [161, 98, 7] as [number, number, number]
    };

    // Header Background
    doc.setFillColor(248, 250, 252);
    doc.rect(0, 0, 297, 45, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.line(0, 45, 297, 45);

    // Logo
    if (logoBase64) {
      doc.addImage(logoBase64, 'PNG', 14, 10, 25, 25);
    }

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.text('OFFICIAL VOTER REGISTRY', 45, 22);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(colors.accent[0], colors.accent[1], colors.accent[2]);
    doc.text('ELP MOI CHAPTER — INDEPENDENT ELECTORAL COMMISSION', 45, 28);

    // Metadata Right Side
    doc.setFontSize(8);
    doc.setTextColor(colors.slate[0], colors.slate[1], colors.slate[2]);
    doc.text(`GENERATED: ${new Date().toLocaleString('en-KE').toUpperCase()}`, 283, 18, { align: 'right' });
    doc.text(`FILTER: ${filter.toUpperCase()}`, 283, 23, { align: 'right' });
    doc.text(`SESSION: ${auth.admin.username.toUpperCase()}`, 283, 28, { align: 'right' });

    // Stats Summary Boxes
    const summaryX = 180;
    const summaryY = 36;
    
    doc.setFontSize(9);
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.text(`TOTAL SYSTEM: ${totalAll}`, 14, 40);
    doc.text(`REGISTERED: ${totalRegistered}`, 60, 40);
    doc.text(`VOTES CAST: ${totalVoted}`, 106, 40);

    // Table
    (autoTable as any)(doc, {
      startY: 50,
      head: [['#', 'PHONE NUMBER', 'FULL NAME', 'EMAIL ADDRESS', 'REGISTRATION', 'VOTING STATUS', 'JOINED ON']],
      body: voters.map((v, i) => [
        String(i + 1).padStart(2, '0'),
        v.phone,
        v.name ? v.name.toUpperCase() : '—',
        v.email || '—',
        v.email ? (v.emailVerified ? 'VERIFIED' : 'PENDING') : 'NOT LINKED',
        v.hasVoted ? 'VOTED' : 'PENDING',
        new Date(v.createdAt).toLocaleDateString('en-KE'),
      ]),
      styles: { 
        fontSize: 8, 
        cellPadding: 4, 
        font: 'helvetica',
        textColor: [51, 65, 85] as [number, number, number],
        lineColor: [241, 245, 249] as [number, number, number],
        lineWidth: 0.1,
      },
      headStyles: { 
        fillColor: colors.primary, 
        textColor: 255, 
        fontStyle: 'bold',
        fontSize: 9,
        halign: 'center'
      },
      alternateRowStyles: { 
        fillColor: [252, 252, 252] as [number, number, number]
      },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        4: { fontStyle: 'bold', halign: 'center' },
        5: { fontStyle: 'bold', halign: 'center' },
        6: { halign: 'center' }
      },
      didParseCell: (data: any) => {
        if (data.section === 'body' && data.column.index === 4) {
          const val = data.cell.text[0];
          if (val === 'VERIFIED') data.cell.styles.textColor = [22, 101, 52] as [number, number, number];
          if (val === 'PENDING') data.cell.styles.textColor = colors.gold;
          if (val === 'NOT LINKED') data.cell.styles.textColor = [153, 27, 27] as [number, number, number];
        }
        if (data.section === 'body' && data.column.index === 5) {
          const val = data.cell.text[0];
          if (val === 'VOTED') data.cell.styles.textColor = [22, 101, 52] as [number, number, number];
        }
      },
      margin: { left: 14, right: 14 },
      didDrawPage: (data: any) => {
        // Footer
        const pageCount = (doc as any).getNumberOfPages();
        doc.setFontSize(7);
        doc.setTextColor(colors.slate[0], colors.slate[1], colors.slate[2]);
        doc.text(
          `This document is an official record of the ELP Moi Chapter IEC. Unauthorized modification is strictly prohibited.`,
          14,
          (doc.internal as any).pageSize.height - 10
        );
        doc.text(
          `Page ${data.pageNumber} of ${pageCount}`,
          (doc.internal as any).pageSize.width - 25,
          (doc.internal as any).pageSize.height - 10
        );
      }
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
