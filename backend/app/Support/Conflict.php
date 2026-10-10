<?php

namespace App\Support;

use Illuminate\Support\Carbon;

/**
 * Two occurrences that overlap during [startsAt, endsAt).
 */
final readonly class Conflict
{
    public function __construct(
        public Occurrence $first,
        public Occurrence $second,
        public Carbon $startsAt,
        public Carbon $endsAt,
    ) {}

    /**
     * @return array{starts_at: string, ends_at: string, minutes: int}
     */
    public function overlapToArray(): array
    {
        return [
            'starts_at' => $this->startsAt->toIso8601ZuluString(),
            'ends_at' => $this->endsAt->toIso8601ZuluString(),
            'minutes' => (int) $this->startsAt->diffInMinutes($this->endsAt),
        ];
    }
}
