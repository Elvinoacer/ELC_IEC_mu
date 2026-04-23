import { NextRequest } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { success, error, serverError } from '@/lib/response';
import { verifyCandidateRegToken } from '@/lib/jwt';
import { uploadFile, validateFile, validateMagicBytes } from '@/lib/upload';
import { sendSMS, SMS_TEMPLATES } from '@/lib/sms';

export async function POST(req: NextRequest) {
  try {
    // 1. Verify candidate session
    const token = req.cookies.get('candidate_reg_session')?.value;
    if (!token) {
      return error('Session expired or unauthorized. Please verify your phone number again.', 401);
    }
    
    const payload = await verifyCandidateRegToken(token);
    if (!payload) {
      return error('Invalid or expired registration session.', 401);
    }

    const sessionPhone = payload.phone;

    // 2. Parse FormData
    const formData = await req.formData();
    
    const name = formData.get('name') as string;
    const phone = formData.get('phone') as string;
    const school = formData.get('school') as string;
    const yearOfStudy = formData.get('yearOfStudy') as string;
    const position = formData.get('position') as string;
    const scholarCode = formData.get('scholarCode') as string;
    const photo = formData.get('photo') as File | null;

    // Basic required field checks
    if (!name || !phone || !school || !yearOfStudy || !position || !scholarCode || !photo) {
      return error('All fields are required, including the candidate photo.', 400);
    }

    // Phone from form MUST match the phone verified via OTP
    if (phone !== sessionPhone) {
      return error('The submitted phone number does not match the verified phone number.', 403);
    }

    // 3. Validation checks against DB
    const [existingScholarCode, existingCandidate] = await Promise.all([
      prisma.candidate.findUnique({ where: { scholarCode } }),
      prisma.candidate.findUnique({ where: { phone: sessionPhone } })
    ]);

    if (existingScholarCode) {
      return error('This scholar code is already in use by another candidate.', 409);
    }

    if (existingCandidate) {
      if (existingCandidate.status === 'PENDING') return error('You already have a pending application.', 409);
      if (existingCandidate.status === 'APPROVED') return error('You are already an approved candidate.', 409);
      // REJECTED can re-apply, we will overwrite or delete the old one below.
    }

    // 4. Check if registration is open
    const config = await prisma.votingConfig.findUnique({ where: { id: 1 } });
    if (config) {
      const now = new Date();
      if (config.candidateRegOpensAt && now < config.candidateRegOpensAt) {
        return error('Candidate registration has not opened yet.', 403);
      }
      if (config.candidateRegClosesAt && now > config.candidateRegClosesAt) {
        return error('Candidate registration has closed.', 403);
      }
    }

    // 4. Upload photo
    const buffer = Buffer.from(await photo.arrayBuffer());
    const validation = validateFile(photo.name, photo.size, photo.type);
    if (!validation.valid) {
      return error(validation.error || 'Invalid file.', 400);
    }

    if (!validateMagicBytes(buffer, photo.type)) {
      return error('Invalid photo content detected.', 400);
    }
    
    let photoUrl = '';
    try {
      photoUrl = await uploadFile(buffer, photo.name, photo.type);
    } catch (err) {
      console.error('Photo upload failed:', err);
      return error('Failed to upload photo. Please try again.', 500);
    }

    // 5. Save to DB
    // If they were previously rejected, we can delete the old record or just use upsert.
    // Let's delete the old rejected record if it exists to keep unique constraints clean.
    if (existingCandidate && existingCandidate.status === 'REJECTED') {
      await prisma.candidate.delete({ where: { id: existingCandidate.id } });
    }

    const candidate = await prisma.candidate.create({
      data: {
        name,
        phone: sessionPhone,
        school,
        yearOfStudy,
        position,
        scholarCode,
        photoUrl,
        status: 'PENDING',
      }
    });

    // 6. Send Confirmation SMS
    await sendSMS(sessionPhone, SMS_TEMPLATES.candidateReceived(position));

    return success({
      message: 'Application submitted successfully. You will be notified once reviewed.',
      candidateId: candidate.id,
    }, 201);

  } catch (err) {
    return serverError(err);
  }
}
