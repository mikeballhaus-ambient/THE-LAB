import type { Database } from 'better-sqlite3';
import type { DemoSeedBootAdapter } from '@/shared/server/demo-seed-boot';
import { CATALOG_DEMO_BOOT_FLAG_KEYS } from '@/shared/config/catalog-demo-seed-packs';
import { DEMO_TODAY, shiftDemoDate } from '@/shared/config/demo-data-cast';
import { insertRow } from '@/shared/server/demo-seed-columns';
import { DemoSeedLedger, shouldSkipDemoSeed } from '@/shared/server/demo-seed-ledger';

export const APPLICANT_DEMO_PACK_ID = 'applicant-demo';
export const APPLICANT_DEMO_BOOT_FLAG = CATALOG_DEMO_BOOT_FLAG_KEYS.JOB_APPLICANT_TRACKER_DEMO;

type HiringStage = 'applied' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected';

interface ApplicantSpec {
  name: string;
  role: string;
  email: string;
  stage: HiringStage;
  notes: string;
  dayOffset: number;
}

/**
 * External candidates (not `DEMO_CAST`) spread across stages so the pipeline looks realistic.
 * Every hiring stage is represented multiple times (rule 6).
 */
const APPLICANTS: readonly ApplicantSpec[] = [
  {
    name: 'Priya Raman',
    role: 'Senior Backend Engineer',
    email: 'priya.raman@example.com',
    stage: 'applied',
    notes: 'Applied via careers page; strong Node and SQLite background.',
    dayOffset: -1,
  },
  {
    name: 'Jonah Weiss',
    role: 'Full Stack Engineer',
    email: 'jonah.weiss@example.com',
    stage: 'applied',
    notes: 'Referral from the platform team; portfolio shows catalog integrations.',
    dayOffset: -2,
  },
  {
    name: 'Amelia Cho',
    role: 'QA Engineer',
    email: 'amelia.cho@example.com',
    stage: 'applied',
    notes: 'Automated testing focus; interested in workflow smoke coverage.',
    dayOffset: -3,
  },
  {
    name: 'Diego Morales',
    role: 'DevOps Engineer',
    email: 'diego.morales@example.com',
    stage: 'applied',
    notes: 'Azure CI experience; asked about lab stack orchestration.',
    dayOffset: -4,
  },
  {
    name: 'Hannah Okonkwo',
    role: 'Technical Writer',
    email: 'hannah.okonkwo@example.com',
    stage: 'applied',
    notes: 'Docs samples in application; prefers hybrid schedule.',
    dayOffset: -5,
  },
  {
    name: 'Marcus Bell',
    role: 'Integration Engineer',
    email: 'marcus.bell@example.com',
    stage: 'screening',
    notes: 'Recruiter screen complete; connector-platform experience.',
    dayOffset: -6,
  },
  {
    name: 'Sofia Lindqvist',
    role: 'Backend Engineer',
    email: 'sofia.lindqvist@example.com',
    stage: 'screening',
    notes: 'Phone screen scheduled; SQLite + Fastify background.',
    dayOffset: -7,
  },
  {
    name: 'Raj Patel',
    role: 'Platform Engineer',
    email: 'raj.patel@example.com',
    stage: 'screening',
    notes: 'Strong MCP familiarity from prior role.',
    dayOffset: -8,
  },
  {
    name: 'Emily Hart',
    role: 'Support Engineer',
    email: 'emily.hart@example.com',
    stage: 'screening',
    notes: 'Help desk tooling experience; customer-facing triage.',
    dayOffset: -9,
  },
  {
    name: 'Elena Sokolova',
    role: 'Frontend Engineer',
    email: 'elena.sokolova@example.com',
    stage: 'interview',
    notes: 'Technical interview done — solid Vue and PrimeVue work.',
    dayOffset: -10,
  },
  {
    name: 'Noah Fischer',
    role: 'UI Engineer',
    email: 'noah.fischer@example.com',
    stage: 'interview',
    notes: 'Design systems panel tomorrow; accessibility focus.',
    dayOffset: -11,
  },
  {
    name: 'Mei Lin',
    role: 'Hybrid App Developer',
    email: 'mei.lin@example.com',
    stage: 'interview',
    notes: 'Built several catalog-style apps; dnd-kit experience.',
    dayOffset: -12,
  },
  {
    name: 'Omar Hassan',
    role: 'Security Engineer',
    email: 'omar.hassan@example.com',
    stage: 'interview',
    notes: 'Threat modeling exercise completed; follow-up with architect.',
    dayOffset: -13,
  },
  {
    name: 'Tobias Krause',
    role: 'Platform Reliability Engineer',
    email: 'tobias.krause@example.com',
    stage: 'offer',
    notes: 'Offer drafted; awaiting approval from the hiring manager.',
    dayOffset: -14,
  },
  {
    name: 'Laura Nguyen',
    role: 'Data Engineer',
    email: 'laura.nguyen@example.com',
    stage: 'offer',
    notes: 'Comp band approved; candidate reviewing equity details.',
    dayOffset: -15,
  },
  {
    name: 'Chris Okafor',
    role: 'Solutions Architect',
    email: 'chris.okafor@example.com',
    stage: 'offer',
    notes: 'Verbal offer accepted pending written package.',
    dayOffset: -16,
  },
  {
    name: 'Nadia Osei',
    role: 'Support Engineer',
    email: 'nadia.osei@example.com',
    stage: 'hired',
    notes: 'Start date agreed; onboarding checklist ready.',
    dayOffset: -21,
  },
  {
    name: 'Benjamin Cole',
    role: 'Integration Specialist',
    email: 'benjamin.cole@example.com',
    stage: 'hired',
    notes: 'Started this week; shadowing Forms Builder bindings.',
    dayOffset: -25,
  },
  {
    name: 'Isabelle Marchand',
    role: 'Product Designer',
    email: 'isabelle.marchand@example.com',
    stage: 'hired',
    notes: 'Hired for workflow studio UX; Figma handoff in progress.',
    dayOffset: -28,
  },
  {
    name: 'Victor Almeida',
    role: 'Data Analyst',
    email: 'victor.almeida@example.com',
    stage: 'rejected',
    notes: 'Withdrew after screening; keep on file for a future role.',
    dayOffset: -18,
  },
  {
    name: 'Karen Sato',
    role: 'Mobile Engineer',
    email: 'karen.sato@example.com',
    stage: 'rejected',
    notes: 'Not pursuing mobile work this cycle.',
    dayOffset: -20,
  },
  {
    name: 'Leo Bergström',
    role: 'Backend Engineer',
    email: 'leo.bergstrom@example.com',
    stage: 'rejected',
    notes: 'Interview feedback: strong skills, role filled internally.',
    dayOffset: -22,
  },
  {
    name: 'Aisha Rahman',
    role: 'Program Manager',
    email: 'aisha.rahman@example.com',
    stage: 'rejected',
    notes: 'Declined offer; accepted another opportunity.',
    dayOffset: -24,
  },
];

export function hasApplicantDemoDataset(db: Database): boolean {
  return new DemoSeedLedger(db, APPLICANT_DEMO_PACK_ID).has();
}

export interface SeedApplicantDemoResult {
  inserted: number;
}

export function applicantDemoEntryCount(): number {
  return APPLICANTS.length;
}

export function seedApplicantDemoIfMissing(
  db: Database,
  options?: { adminApply?: boolean },
): SeedApplicantDemoResult {
  const ledger = new DemoSeedLedger(db, APPLICANT_DEMO_PACK_ID);
  const expectedRows = APPLICANTS.length;
  if (ledger.has() && ledger.count() !== expectedRows) {
    removeApplicantDemo(db);
  }
  if (shouldSkipDemoSeed(db, ledger, APPLICANT_DEMO_BOOT_FLAG, options)) {
    return { inserted: 0 };
  }

  let inserted = 0;

  for (const applicant of APPLICANTS) {
    const created = shiftDemoDate(DEMO_TODAY, applicant.dayOffset);
    const id = insertRow(db, 'applicants', {
      name: applicant.name,
      role: applicant.role,
      email: applicant.email,
      stage: applicant.stage,
      notes: applicant.notes,
      created_at: `${created}T09:00:00`,
      updated_at: `${DEMO_TODAY}T09:00:00`,
    });
    ledger.track('applicants', id);
    inserted += 1;
  }

  return { inserted };
}

export function removeApplicantDemo(db: Database): number {
  const ledger = new DemoSeedLedger(db, APPLICANT_DEMO_PACK_ID);
  return ledger.deleteTracked(['applicants']);
}

/** Every hiring stage present in the demo data (rule 6). */
export function applicantDemoStages(): string[] {
  return [...new Set(APPLICANTS.map((a) => a.stage))];
}

/** External candidate names — intentionally outside `DEMO_CAST`. */
export function applicantDemoNames(): string[] {
  return [...new Set(APPLICANTS.map((a) => a.name))];
}

/** Boot-time adapter used by `runDemoSeedOnBoot`. */
export const applicantDemoAdapter: DemoSeedBootAdapter = {
  bootFlagKey: APPLICANT_DEMO_BOOT_FLAG,
  has: hasApplicantDemoDataset,
  seed: seedApplicantDemoIfMissing,
};
