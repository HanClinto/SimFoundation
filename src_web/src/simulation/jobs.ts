import type {
  PersonnelBiases,
  PersonnelRecord,
  PersonnelSkill,
} from "./personnel";

export type JobStatus = "proposed" | "available" | "in-progress" | "completed";

export interface SiteJob {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly skillId: PersonnelSkill["id"];
  readonly priority: number;
  readonly xpPerTick: number;
  readonly preferredBiases: {
    readonly mindMight: -1 | 0 | 1;
    readonly receptiveResolute: -1 | 0 | 1;
  };
  readonly status: JobStatus;
  readonly progress: number;
  readonly requiredProgress: number;
  readonly assignedPersonId: string | null;
  readonly assignmentReason: string | null;
  readonly authorizedTick: number | null;
  readonly completedTick: number | null;
}

export interface JobAdvanceResult {
  readonly jobs: readonly SiteJob[];
  readonly personnel: readonly PersonnelRecord[];
}

export function createStartingJobs(): readonly SiteJob[] {
  return [
    {
      id: "job-calibrate-9620-sensors",
      title: "Calibrate SCP-9620 sensor array",
      description:
        "Validate baseline telemetry before the next approved experiment.",
      skillId: "research",
      priority: 50,
      xpPerTick: 1,
      preferredBiases: { mindMight: -1, receptiveResolute: -1 },
      status: "proposed",
      progress: 0,
      requiredProgress: 64,
      assignedPersonId: null,
      assignmentReason: null,
      authorizedTick: null,
      completedTick: null,
    },
  ];
}

export function createTelemetryRecoveryJob(): SiteJob {
  return {
    id: "job-stabilize-9620-feedback",
    title: "Stabilize SCP-9620 sensor feedback",
    description:
      "Isolate the oscillating relay bank and restore validated telemetry limits.",
    skillId: "engineering",
    priority: 90,
    xpPerTick: 1,
    preferredBiases: { mindMight: 1, receptiveResolute: 1 },
    status: "proposed",
    progress: 0,
    requiredProgress: 56,
    assignedPersonId: null,
    assignmentReason: null,
    authorizedTick: null,
    completedTick: null,
  };
}

export function createBaselineObservationJob(): SiteJob {
  return {
    id: "job-record-9620-baseline",
    title: "Record SCP-9620 baseline",
    description:
      "Observe the inactive apparatus under calibrated instrumentation.",
    skillId: "research",
    priority: 55,
    xpPerTick: 1,
    preferredBiases: { mindMight: -1, receptiveResolute: -1 },
    status: "proposed",
    progress: 0,
    requiredProgress: 48,
    assignedPersonId: null,
    assignmentReason: null,
    authorizedTick: null,
    completedTick: null,
  };
}

export function createActivationTrialJob(): SiteJob {
  return {
    id: "job-run-9620-activation-trial",
    title: "Run SCP-9620 activation trial",
    description:
      "Apply the approved low-energy input and record the apparatus response.",
    skillId: "research",
    priority: 60,
    xpPerTick: 1,
    preferredBiases: { mindMight: -1, receptiveResolute: 1 },
    status: "proposed",
    progress: 0,
    requiredProgress: 40,
    assignedPersonId: null,
    assignmentReason: null,
    authorizedTick: null,
    completedTick: null,
  };
}

export function authorizeJob(job: SiteJob, authorizedTick: number): SiteJob {
  if (job.status !== "proposed") return job;
  return { ...job, status: "available", authorizedTick };
}

function skillFor(
  person: PersonnelRecord,
  skillId: PersonnelSkill["id"],
): PersonnelSkill | null {
  return person.skills.find(({ id }) => id === skillId) ?? null;
}

function biasAlignment(
  biases: PersonnelBiases,
  preferredBiases: SiteJob["preferredBiases"],
): number {
  return (
    biases.mindMight * preferredBiases.mindMight +
    biases.receptiveResolute * preferredBiases.receptiveResolute
  );
}

function selectWorker(
  job: SiteJob,
  personnel: readonly PersonnelRecord[],
  busyPersonIds: ReadonlySet<string>,
): PersonnelRecord | null {
  return (
    personnel
      .filter(
        (person) =>
          !busyPersonIds.has(person.id) &&
          skillFor(person, job.skillId) !== null,
      )
      .sort((first, second) => {
        const firstSkill = skillFor(first, job.skillId)?.level ?? 0;
        const secondSkill = skillFor(second, job.skillId)?.level ?? 0;
        const scoreDifference =
          secondSkill * 100 +
          biasAlignment(second.biases, job.preferredBiases) -
          (firstSkill * 100 + biasAlignment(first.biases, job.preferredBiases));
        return scoreDifference || first.id.localeCompare(second.id);
      })[0] ?? null
  );
}

function addSkillXp(
  person: PersonnelRecord,
  skillId: PersonnelSkill["id"],
  amount: number,
): PersonnelRecord {
  return {
    ...person,
    skills: person.skills.map((skill) =>
      skill.id === skillId ? { ...skill, xp: skill.xp + amount } : skill,
    ),
  };
}

export function advanceJobs(
  jobs: readonly SiteJob[],
  personnel: readonly PersonnelRecord[],
  tick: number,
): JobAdvanceResult {
  const people = new Map(personnel.map((person) => [person.id, person]));
  const busyPersonIds = new Set(
    jobs.flatMap((job) =>
      job.status === "in-progress" && job.assignedPersonId
        ? [job.assignedPersonId]
        : [],
    ),
  );

  const advancedJobsById = new Map<string, SiteJob>();
  const orderedJobs = [...jobs].sort(
    (first, second) =>
      second.priority - first.priority || first.id.localeCompare(second.id),
  );

  for (const job of orderedJobs) {
    if (job.status === "proposed" || job.status === "completed") {
      advancedJobsById.set(job.id, job);
      continue;
    }

    let assignedPersonId = job.assignedPersonId;
    let assignmentReason = job.assignmentReason;
    if (!assignedPersonId) {
      const selected = selectWorker(job, [...people.values()], busyPersonIds);
      if (!selected) {
        advancedJobsById.set(job.id, {
          ...job,
          assignmentReason: "No eligible worker is currently available.",
        });
        continue;
      }
      const skill = skillFor(selected, job.skillId);
      if (!skill) continue;
      assignedPersonId = selected.id;
      assignmentReason = `Highest eligible official ${job.skillId} level (${skill.level}); additional suitability factors and stable ordering resolve ties.`;
      busyPersonIds.add(selected.id);
    }

    const worker = people.get(assignedPersonId);
    const skill = worker ? skillFor(worker, job.skillId) : null;
    if (!worker || !skill) {
      advancedJobsById.set(job.id, {
        ...job,
        status: "available" as const,
        assignedPersonId: null,
        assignmentReason: "The assigned worker is no longer eligible.",
      });
      continue;
    }

    const progress = Math.min(job.requiredProgress, job.progress + skill.level);
    const completed = progress >= job.requiredProgress;
    const experiencedWorker = addSkillXp(worker, job.skillId, job.xpPerTick);
    people.set(worker.id, {
      ...experiencedWorker,
      currentJobId: completed ? null : job.id,
      activity: completed ? `Completed: ${job.title}` : `Working: ${job.title}`,
    });

    advancedJobsById.set(job.id, {
      ...job,
      status: completed ? ("completed" as const) : ("in-progress" as const),
      progress,
      assignedPersonId,
      assignmentReason,
      completedTick: completed ? tick : null,
    });
  }

  return {
    jobs: jobs.map((job) => advancedJobsById.get(job.id) ?? job),
    personnel: [...people.values()],
  };
}
