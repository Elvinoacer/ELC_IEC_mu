import prisma from '@/lib/prisma';
import PublicShell from '@/components/layouts/PublicShell';
import CandidateRegistrationForm from '@/components/public/CandidateRegistrationForm';

export const metadata = {
  title: 'Candidate Registration - ELP Moi Chapter',
};

export default async function RegisterCandidatePage() {
  const positions = await prisma.position.findMany({
    orderBy: { displayOrder: 'asc' },
  });

  return (
    <PublicShell>
      <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 font-[family-name:var(--font-outfit)]">
            Candidate Registration
          </h1>
          <p className="text-slate-300 max-w-xl mx-auto">
            Submit your application to run for an office in the Equity Leaders Program Moi Chapter elections.
          </p>
        </div>

        <CandidateRegistrationForm positions={positions} />
      </div>
    </PublicShell>
  );
}
