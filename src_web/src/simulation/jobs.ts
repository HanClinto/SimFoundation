import type {
  PersonnelBiases,
  PersonnelRecord,
  PersonnelSkill,
} from "./personnel";
import {
  findRoute,
  sameTile,
  tileAt,
  type SiteWorld,
  type TilePosition,
} from "./world";
import {
  ASSESSMENT_REQUIREMENTS,
  clinicalQualificationReasons,
  completeAssessment,
  type ClinicalOrder,
} from "./clinical";

function meetsJobSkill(person: PersonnelRecord, job: SiteJob): boolean {
  return job.assessment
    ? clinicalQualificationReasons(person, job.assessment.kind).length === 0
    : (person.skills.find(({ id }) => id === job.skillId)?.level ?? 0) >= 1;
}

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
  readonly workSite: TilePosition;
  readonly requiredWorkerId: string | null;
  readonly assessment?: ClinicalOrder;
}

export interface JobAdvanceResult {
  readonly jobs: readonly SiteJob[];
  readonly personnel: readonly PersonnelRecord[];
  readonly world: SiteWorld;
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
  world: SiteWorld,
  clinicianIds: readonly string[],
): PersonnelRecord | null {
  return (
    personnel
      .filter(
        (person) =>
          !busyPersonIds.has(person.id) &&
          (!job.assessment ||
            (clinicianIds.includes(person.id) &&
              person.id !== job.assessment.patientId &&
              meetsJobSkill(person, job))) &&
          (job.requiredWorkerId === null ||
            person.id === job.requiredWorkerId) &&
          meetsJobSkill(person, job),
      )
      .sort((first, second) => {
        const firstSkill = skillFor(first, job.skillId)?.level ?? 0;
        const secondSkill = skillFor(second, job.skillId)?.level ?? 0;
        const scoreDifference =
          secondSkill * 100 +
          biasAlignment(second.biases, job.preferredBiases) -
          (firstSkill * 100 + biasAlignment(first.biases, job.preferredBiases));
        return scoreDifference || first.id.localeCompare(second.id);
      })
      .find((person) => {
        const position = world.positions[person.id];
        return (
          position !== undefined &&
          findRoute(world.map, position, job.workSite) !== null
        );
      }) ?? null
  );
}

function addSkillXp(
  person: PersonnelRecord,
  skillId: PersonnelSkill["id"],
  amount: number,
): PersonnelRecord {
  return {
    ...person,
    skills: !person.skills.some(({ id }) => id === skillId)
      ? [...person.skills, { id: skillId, level: 0, xp: amount }]
      : person.skills.map((skill) =>
          skill.id === skillId ? { ...skill, xp: skill.xp + amount } : skill,
        ),
  };
}

export function advanceJobs(
  jobs: readonly SiteJob[],
  personnel: readonly PersonnelRecord[],
  tick: number,
  world: SiteWorld,
  clinicianIds: readonly string[] = [],
  unavailablePersonIds: readonly string[] = [],
): JobAdvanceResult {
  const people = new Map(personnel.map((person) => [person.id, person]));
  const positions = { ...world.positions };
  const busyPersonIds = new Set([
    ...unavailablePersonIds,
    ...jobs.flatMap((job) =>
      job.status === "in-progress" && job.assignedPersonId
        ? [
            job.assignedPersonId,
            ...(job.assessment ? [job.assessment.patientId] : []),
          ]
        : [],
    ),
  ]);

  const advancedJobsById = new Map<string, SiteJob>();
  const orderedJobs = [...jobs].sort(
    (first, second) =>
      second.priority - first.priority || first.id.localeCompare(second.id),
  );

  for (const queuedJob of orderedJobs) {
    const job = advancedJobsById.get(queuedJob.id) ?? queuedJob;
    if (job.status === "proposed" || job.status === "completed") {
      advancedJobsById.set(job.id, job);
      continue;
    }

    let assignedPersonId = job.assignedPersonId;
    let assignmentReason = job.assignmentReason;
    const patient = job.assessment
      ? people.get(job.assessment.patientId)
      : null;
    if (
      job.assessment &&
      !assignedPersonId &&
      (!patient || busyPersonIds.has(patient.id))
    ) {
      advancedJobsById.set(job.id, {
        ...job,
        assignmentReason: "Awaiting patient availability.",
      });
      continue;
    }
    if (!assignedPersonId) {
      let selected = selectWorker(
        job,
        [...people.values()],
        busyPersonIds,
        world,
        clinicianIds,
      );
      if (!selected && job.priority >= 90 && !job.assessment) {
        const interruptible = orderedJobs.filter(
          (candidate) =>
            candidate.status === "in-progress" &&
            candidate.priority < 90 &&
            !candidate.assessment &&
            candidate.requiredWorkerId === null &&
            candidate.assignedPersonId &&
            !unavailablePersonIds.includes(candidate.assignedPersonId) &&
            !advancedJobsById.has(candidate.id),
        );
        const interruptibleIds = new Set(
          interruptible.map((candidate) => candidate.assignedPersonId!),
        );
        selected = selectWorker(
          job,
          [...people.values()],
          new Set([...busyPersonIds].filter((id) => !interruptibleIds.has(id))),
          world,
          clinicianIds,
        );
        const interrupted = interruptible.find(
          (candidate) => candidate.assignedPersonId === selected?.id,
        );
        if (selected && interrupted) {
          advancedJobsById.set(interrupted.id, {
            ...interrupted,
            status: "available",
            assignedPersonId: null,
            assignmentReason: `Interrupted for emergency work: ${job.title}`,
          });
          people.set(selected.id, {
            ...selected,
            currentJobId: null,
            activity: "Reassigned to emergency work",
          });
          busyPersonIds.delete(selected.id);
        }
      }
      if (!selected) {
        const hasWorker = personnel.some(
          (person) =>
            !busyPersonIds.has(person.id) &&
            (!job.assessment ||
              (clinicianIds.includes(person.id) &&
                person.id !== job.assessment.patientId &&
                meetsJobSkill(person, job))) &&
            (job.requiredWorkerId === null ||
              person.id === job.requiredWorkerId) &&
            meetsJobSkill(person, job),
        );
        advancedJobsById.set(job.id, {
          ...job,
          assignmentReason: job.assignmentReason?.startsWith(
            "Interrupted for emergency work:",
          )
            ? job.assignmentReason
            : hasWorker
              ? "No eligible worker can reach the work site."
              : job.assessment
                ? `Awaiting assigned staff with Medical ${ASSESSMENT_REQUIREMENTS[job.assessment.kind].medicalLevel}+ and no conflicting appointment.`
                : "No eligible worker is currently available.",
        });
        continue;
      }
      const skill = skillFor(selected, job.skillId) ?? {
        id: job.skillId,
        level: 0,
        xp: 0,
      };
      assignedPersonId = selected.id;
      assignmentReason = `Highest eligible official ${job.skillId} level (${skill.level}); additional suitability factors and stable ordering resolve ties.`;
      busyPersonIds.add(selected.id);
      if (patient) busyPersonIds.add(patient.id);
    }

    const worker = people.get(assignedPersonId);
    const skill = worker
      ? (skillFor(worker, job.skillId) ?? { id: job.skillId, level: 0, xp: 0 })
      : null;
    if (
      !worker ||
      !skill ||
      !meetsJobSkill(worker, job) ||
      (job.assessment &&
        (!clinicianIds.includes(worker.id) ||
          !patient ||
          patient.id === worker.id))
    ) {
      if (patient) {
        people.set(patient.id, {
          ...patient,
          currentJobId: null,
          activity: patient.defaultActivity,
        });
        busyPersonIds.delete(patient.id);
      }
      if (worker)
        people.set(worker.id, {
          ...worker,
          currentJobId: null,
          activity: worker.defaultActivity,
        });
      busyPersonIds.delete(assignedPersonId);
      advancedJobsById.set(job.id, {
        ...job,
        status: "available" as const,
        assignedPersonId: null,
        assignmentReason: "The assigned worker is no longer eligible.",
      });
      continue;
    }

    const position = positions[worker.id];
    const route = position
      ? findRoute(world.map, position, job.workSite)
      : null;
    const patientPosition = patient ? positions[patient.id] : null;
    const patientRoute = patientPosition
      ? findRoute(world.map, patientPosition, job.workSite)
      : null;
    if (route === null || (patient && patientRoute === null)) {
      if (patient) {
        people.set(patient.id, {
          ...patient,
          currentJobId: null,
          activity: patient.defaultActivity,
        });
        busyPersonIds.delete(patient.id);
      }
      people.set(worker.id, {
        ...worker,
        currentJobId: null,
        activity: worker.defaultActivity,
      });
      busyPersonIds.delete(worker.id);
      advancedJobsById.set(job.id, {
        ...job,
        status: "available",
        assignedPersonId: null,
        assignmentReason: "The route to the work site is blocked.",
      });
      continue;
    }
    const workerTravelling = position && !sameTile(position, job.workSite);
    const patientTravelling =
      patientPosition && !sameTile(patientPosition, job.workSite);
    if (patient) {
      if (patientTravelling && patientRoute?.[0])
        positions[patient.id] = patientRoute[0];
      people.set(patient.id, {
        ...patient,
        currentJobId: job.id,
        activity: patientTravelling
          ? "Travelling to clinical appointment"
          : "Attending clinical appointment",
      });
    }
    if (workerTravelling || patientTravelling) {
      if (workerTravelling) positions[worker.id] = route[0]!;
      people.set(worker.id, {
        ...worker,
        currentJobId: job.id,
        activity: workerTravelling
          ? `Travelling: ${job.title}`
          : "Awaiting patient arrival",
      });
      advancedJobsById.set(job.id, {
        ...job,
        status: "in-progress",
        assignedPersonId,
        assignmentReason,
      });
      continue;
    }

    if (
      job.id.startsWith("job-install-camera-") &&
      tileAt(world.map, job.workSite) !== "floor"
    ) {
      people.set(worker.id, {
        ...worker,
        currentJobId: null,
        activity: "Camera site surveyed; interior mounting surface required",
      });
      advancedJobsById.set(job.id, {
        ...job,
        status: "available",
        assignedPersonId: null,
        assignmentReason:
          "Site survey: interior floor required for camera installation.",
      });
      continue;
    }
    const progress = Math.min(
      job.requiredProgress,
      job.progress + Math.max(1, skill.level),
    );
    const completed = progress >= job.requiredProgress;
    const experiencedWorker = addSkillXp(worker, job.skillId, job.xpPerTick);
    people.set(worker.id, {
      ...experiencedWorker,
      currentJobId: completed ? null : job.id,
      activity: completed ? `Completed: ${job.title}` : `Working: ${job.title}`,
    });
    if (completed && patient && job.assessment) {
      people.set(patient.id, {
        ...completeAssessment(patient, job.assessment.kind, tick, worker),
        currentJobId: null,
        activity: "Completed: Clinical appointment",
      });
    }

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
    world: { ...world, positions },
  };
}
