import type { GameState } from "../../simulation/state";
export const COVERAGE_SKILLS = [
  "research",
  "engineering",
  "medical",
  "security",
  "logistics",
] as const;

export function scheduleCoverage(state: GameState) {
  return COVERAGE_SKILLS.map((skillId) => ({
    skillId,
    hours: Array.from({ length: 24 }, (_, hour) =>
      state.personnel
        .filter(
          (person) =>
            state.routines.schedules[person.id]?.[hour] === "work" &&
            person.skills.some(
              (skill) => skill.id === skillId && skill.level > 0,
            ),
        )
        .map(({ id }) => id),
    ),
  }));
}
