export type ElectionPhase = 
  | 'UPCOMING_REGISTRATION' 
  | 'REGISTRATION_OPEN' 
  | 'UPCOMING_VOTING' 
  | 'VOTING_OPEN' 
  | 'VOTING_CLOSED' 
  | 'UNKNOWN';

export interface PhaseInfo {
  phase: ElectionPhase;
  label: string;
  subLabel: string;
  targetDate: Date | null;
  color: 'brand' | 'accent' | 'success' | 'slate';
}

export function getElectionPhase(config: any): PhaseInfo {
  const now = new Date();
  const regOpen = config.candidateRegOpensAt ? new Date(config.candidateRegOpensAt) : null;
  const regClose = config.candidateRegClosesAt ? new Date(config.candidateRegClosesAt) : null;
  const voteOpen = new Date(config.opensAt);
  const voteClose = new Date(config.closesAt);

  // 1. Voting logic
  if (config.isManuallyClosed || now > voteClose) {
    return {
      phase: 'VOTING_CLOSED',
      label: 'Elections Concluded',
      subLabel: 'Official results are now finalized.',
      targetDate: null,
      color: 'slate'
    };
  }

  if (now >= voteOpen && now <= voteClose) {
    return {
      phase: 'VOTING_OPEN',
      label: 'Voting is LIVE',
      subLabel: 'Cast your vote securely now.',
      targetDate: voteClose,
      color: 'brand'
    };
  }

  // 2. Registration logic
  if (regOpen && regClose) {
    if (now < regOpen) {
      return {
        phase: 'UPCOMING_REGISTRATION',
        label: 'Election Registration',
        subLabel: 'Registration portal opens in:',
        targetDate: regOpen,
        color: 'accent'
      };
    }
    if (now >= regOpen && now <= regClose) {
      return {
        phase: 'REGISTRATION_OPEN',
        label: 'Registration is OPEN',
        subLabel: 'Link your email to secure your ballot.',
        targetDate: regClose,
        color: 'accent'
      };
    }
  }

  // 3. Gap between registration and voting
  if (now < voteOpen) {
    return {
      phase: 'UPCOMING_VOTING',
      label: 'Election Day is Coming',
      subLabel: 'The polls will open in:',
      targetDate: voteOpen,
      color: 'brand'
    };
  }

  return {
    phase: 'UNKNOWN',
    label: 'ELP Elections',
    subLabel: 'Stay tuned for updates.',
    targetDate: null,
    color: 'slate'
  };
}
