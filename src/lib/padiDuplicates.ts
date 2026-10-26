import type { PadiDuplicateCandidate, PadiExistingDive } from "../types/padi";

type CandidateLogPair = {
  readonly candidateIndex: number;
  readonly log: PadiExistingDive;
  readonly score: number;
};

function normalizedDate(value: string | null | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const isoDate = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim());
  if (isoDate?.[1]) {
    return isoDate[1];
  }

  const slashDate = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim());
  if (!slashDate) {
    return undefined;
  }

  const [, month, day, year] = slashDate;
  return `${year}-${month?.padStart(2, "0")}-${day?.padStart(2, "0")}`;
}

function metricScore(candidate: PadiDuplicateCandidate, log: PadiExistingDive): number {
  if (log.depth_times.length === 0) {
    return Number.MAX_SAFE_INTEGER;
  }

  return Math.min(
    ...log.depth_times.map((depthTime) => {
      const depthDifference =
        candidate.maxDepthMeters === undefined || depthTime.max_depth === null
          ? 100
          : Math.abs(candidate.maxDepthMeters - depthTime.max_depth);
      const durationDifference =
        candidate.bottomTimeMinutes === undefined || depthTime.bottom_time === null
          ? 100
          : Math.abs(candidate.bottomTimeMinutes - depthTime.bottom_time);
      return depthDifference + durationDifference / 3;
    }),
  );
}

export function matchPadiDuplicates(
  candidates: readonly PadiDuplicateCandidate[],
  logs: readonly PadiExistingDive[],
): readonly (PadiExistingDive | undefined)[] {
  const pairs: CandidateLogPair[] = [];

  for (const [candidateIndex, candidate] of candidates.entries()) {
    const candidateDate = normalizedDate(candidate.localDate);
    if (!candidateDate) {
      continue;
    }

    for (const log of logs) {
      if (normalizedDate(log.dive_date) === candidateDate) {
        pairs.push({ candidateIndex, log, score: metricScore(candidate, log) });
      }
    }
  }

  pairs.sort(
    (left, right) =>
      left.score - right.score ||
      left.candidateIndex - right.candidateIndex ||
      left.log.id - right.log.id,
  );

  const matches: Array<PadiExistingDive | undefined> = Array.from({ length: candidates.length });
  const matchedCandidates = new Set<number>();
  const matchedLogIds = new Set<number>();
  for (const pair of pairs) {
    if (matchedCandidates.has(pair.candidateIndex) || matchedLogIds.has(pair.log.id)) {
      continue;
    }
    matches[pair.candidateIndex] = pair.log;
    matchedCandidates.add(pair.candidateIndex);
    matchedLogIds.add(pair.log.id);
  }

  return matches;
}

export function findPadiDuplicate(
  candidate: PadiDuplicateCandidate,
  logs: readonly PadiExistingDive[],
): PadiExistingDive | undefined {
  return matchPadiDuplicates([candidate], logs)[0];
}

export async function withPadiImportLock<T>(operation: () => Promise<T>): Promise<T> {
  if (!navigator.locks) {
    return operation();
  }
  return navigator.locks.request("divebridge-padi-import", { mode: "exclusive" }, operation);
}
