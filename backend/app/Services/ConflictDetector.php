<?php

namespace App\Services;

use App\Support\Conflict;
use App\Support\Occurrence;
use Illuminate\Support\Collection;

/**
 * Finds overlapping occurrences.
 *
 * All-day events never conflict (an all-day "exam week" would otherwise
 * clash with everything), and back-to-back events (one ends at 10:00, the
 * next starts at 10:00) don't overlap. Occurrences of the same event are
 * never reported against each other.
 */
class ConflictDetector
{
    /**
     * Every overlapping pair among $occurrences.
     *
     * @param  Collection<int, Occurrence>  $occurrences
     * @return Collection<int, Conflict>
     */
    public function within(Collection $occurrences): Collection
    {
        return $this->sweep($occurrences->map(fn (Occurrence $o) => [$o, 0]));
    }

    /**
     * Overlaps between a candidate and an existing occurrence (not among the
     * candidates or among the existing ones). `first` is always the candidate.
     *
     * @param  Collection<int, Occurrence>  $candidates
     * @param  Collection<int, Occurrence>  $existing
     * @return Collection<int, Conflict>
     */
    public function between(Collection $candidates, Collection $existing): Collection
    {
        $tagged = $candidates->map(fn (Occurrence $o) => [$o, 1])
            ->concat($existing->map(fn (Occurrence $o) => [$o, 2]));

        return $this->sweep($tagged, crossGroupOnly: true);
    }

    /**
     * Sweep line over occurrences sorted by start: each one is compared only
     * with those that start before it ends. O(n log n + overlapping pairs).
     *
     * @param  Collection<int, array{0: Occurrence, 1: int}>  $tagged  [occurrence, group]
     * @return Collection<int, Conflict>
     */
    private function sweep(Collection $tagged, bool $crossGroupOnly = false): Collection
    {
        $items = $tagged
            ->reject(fn (array $item) => $item[0]->event->all_day)
            ->sortBy(fn (array $item) => $item[0]->startsAt)
            ->values()
            ->all();

        $conflicts = [];
        $count = count($items);

        for ($i = 0; $i < $count; $i++) {
            [$a, $groupA] = $items[$i];

            for ($j = $i + 1; $j < $count && $items[$j][0]->startsAt < $a->endsAt; $j++) {
                [$b, $groupB] = $items[$j];

                if ($a->event === $b->event || ($crossGroupOnly && $groupA === $groupB)) {
                    continue;
                }

                // Sorted by start, so the overlap begins when $b starts.
                $endsAt = $a->endsAt->min($b->endsAt);
                [$first, $second] = $crossGroupOnly && $groupB === 1 ? [$b, $a] : [$a, $b];

                $conflicts[] = new Conflict($first, $second, $b->startsAt->copy(), $endsAt->copy());
            }
        }

        return collect($conflicts);
    }
}
