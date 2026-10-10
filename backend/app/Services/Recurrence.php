<?php

namespace App\Services;

use App\Models\Event;
use DateTimeInterface;
use Illuminate\Support\Carbon;
use InvalidArgumentException;
use RRule\RRule;

/**
 * Expands recurring events into concrete occurrences.
 *
 * Rules are evaluated in the event's own timezone, so a 09:00 class stays at
 * 09:00 local time across DST changes; results are returned in UTC.
 */
class Recurrence
{
    /** Frequencies we accept; sub-daily rules could generate unbounded rows. */
    public const FREQUENCIES = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'];

    /** Upper bound on the size of a finite series. */
    public const MAX_OCCURRENCES = 1000;

    /**
     * Parse and validate a rule. Throws InvalidArgumentException with a
     * user-facing message when the rule is malformed or not allowed.
     */
    public function parse(string $rrule, Carbon $startsAt, string $timezone): RRule
    {
        $rrule = self::normalize($rrule);

        if (preg_match('/(^|;)(DTSTART|BYHOUR|BYMINUTE|BYSECOND)=/', $rrule)) {
            throw new InvalidArgumentException('The rule may not set DTSTART, BYHOUR, BYMINUTE or BYSECOND.');
        }

        $rule = new RRule($rrule, $startsAt->copy()->setTimezone($timezone)->toDateTimeImmutable());

        if (! in_array($rule->getRule()['FREQ'], self::FREQUENCIES, true)) {
            throw new InvalidArgumentException('FREQ must be one of '.implode(', ', self::FREQUENCIES).'.');
        }

        if ($rule->isFinite() && count($rule->getOccurrences(self::MAX_OCCURRENCES + 1)) > self::MAX_OCCURRENCES) {
            throw new InvalidArgumentException('A series may have at most '.self::MAX_OCCURRENCES.' occurrences.');
        }

        return $rule;
    }

    /** Uppercase and strip an optional "RRULE:" prefix. */
    public static function normalize(string $rrule): string
    {
        return preg_replace('/^RRULE:/', '', strtoupper(trim($rrule)));
    }

    /** End of the series' last occurrence, or null if it never ends. */
    public function seriesEnd(Event $event): ?Carbon
    {
        $rule = $this->parse($event->rrule, $event->starts_at, $event->timezone);

        if ($rule->isInfinite()) {
            return null;
        }

        $occurrences = $rule->getOccurrences(self::MAX_OCCURRENCES);
        $last = $occurrences === [] ? $event->starts_at : end($occurrences);

        return $this->toUtc($last)->addSeconds($event->durationInSeconds());
    }

    /**
     * Occurrences of $event that overlap [$from, $to), as UTC start/end pairs.
     *
     * @return list<array{starts_at: Carbon, ends_at: Carbon}>
     */
    public function occurrences(Event $event, Carbon $from, Carbon $to): array
    {
        if (! $event->isRecurring()) {
            return $event->starts_at < $to && $event->ends_at > $from
                ? [['starts_at' => $event->starts_at->copy(), 'ends_at' => $event->ends_at->copy()]]
                : [];
        }

        $duration = $event->durationInSeconds();
        $rule = $this->parse($event->rrule, $event->starts_at, $event->timezone);

        // An occurrence that starts up to $duration before $from still overlaps.
        $starts = $rule->getOccurrencesBetween(
            $from->copy()->subSeconds($duration)->toDateTimeImmutable(),
            $to->toDateTimeImmutable(),
        );

        $result = [];
        foreach ($starts as $start) {
            $startsAt = $this->toUtc($start);
            $endsAt = $startsAt->copy()->addSeconds($duration);

            if ($startsAt < $to && $endsAt > $from) {
                $result[] = ['starts_at' => $startsAt, 'ends_at' => $endsAt];
            }
        }

        return $result;
    }

    private function toUtc(DateTimeInterface $date): Carbon
    {
        return Carbon::instance($date)->utc();
    }
}
