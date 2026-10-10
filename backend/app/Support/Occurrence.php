<?php

namespace App\Support;

use App\Models\Event;
use Illuminate\Support\Carbon;

/**
 * One concrete instance of an event on the calendar (UTC times).
 */
final readonly class Occurrence
{
    public function __construct(
        public Event $event,
        public Carbon $startsAt,
        public Carbon $endsAt,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'event_id' => $this->event->id,
            'title' => $this->event->title,
            'category' => $this->event->category,
            'location' => $this->event->location,
            'all_day' => $this->event->all_day,
            'recurring' => $this->event->isRecurring(),
            'starts_at' => $this->startsAt->toIso8601ZuluString(),
            'ends_at' => $this->endsAt->toIso8601ZuluString(),
        ];
    }
}
