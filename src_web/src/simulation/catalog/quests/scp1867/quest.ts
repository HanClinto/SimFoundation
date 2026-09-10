import type { Quest } from "../../../core/quest/Quest";

export const quest: Quest = {
  id: "scp1867",
  name: "SCP-1867: Corroborate the collection",
  deadline: 180,
  briefing:
    "Lord Blackwood has offered his collection. Recover the field journal and sealed specimen from the vault, then compare them at the intake bench with the independent survey and laboratory dossier already supplied there. His account alone is not corroboration: both independent records are required. Leave the unverified instrument isolated. Use Take, Move and Drop for recovery; inspect the bench for the marsh-lead study plan. Blackwood remains at the existing outpost; resident care and inter-site freight are not part of this bounded mission.",
  sources: [
    {
      title: "SCP-1867",
      author: "Djoric",
      url: "https://scp-wiki.wikidot.com/scp-1867",
      license: "CC BY-SA 3.0",
    },
  ],
  objectives: [
    {
      id: "journal",
      description: "Recover the journal to intake (3,3)",
      condition: { kind: "ground-at", entity: "journal", x: 3, y: 3 },
    },
    {
      id: "specimen",
      description: "Recover the specimen to intake (3,5)",
      condition: { kind: "ground-at", entity: "specimen", x: 3, y: 5 },
    },
    {
      id: "lead",
      description:
        "Study marsh-lead at the bench with both independent records",
      condition: { kind: "finding", station: "bench", planId: "marsh-lead" },
    },
    {
      id: "isolate",
      description: "Leave the unverified device isolated at (11,2)",
      condition: { kind: "ground-at", entity: "device", x: 11, y: 2 },
    },
  ],
  failures: [
    ...["journal", "specimen", "survey", "lab"].map((entity) => ({
      id: `lost-${entity}`,
      description: `Essential evidence lost or damaged: ${entity}`,
      condition: { kind: "lost" as const, entity, minimumIntegrity: 100 },
    })),
    {
      id: "down",
      description: "The investigator is incapacitated",
      condition: { kind: "acting", actor: "investigator", value: false },
    },
  ],
};
