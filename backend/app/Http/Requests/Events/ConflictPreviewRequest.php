<?php

namespace App\Http\Requests\Events;

use Illuminate\Support\Arr;
use Illuminate\Validation\Rule;

/**
 * A proposed event, validated exactly like POST /events, plus an optional
 * `event_id`: when editing, the stored version of that event is ignored so
 * it doesn't conflict with itself.
 */
class ConflictPreviewRequest extends EventRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            ...parent::rules(),
            'event_id' => [
                'sometimes', 'nullable', 'integer',
                Rule::exists('events', 'id')->where('user_id', $this->user()->id),
            ],
        ];
    }

    public function ignoredEventId(): ?int
    {
        return $this->safe()['event_id'] ?? null;
    }

    /**
     * @return array<string, mixed>
     */
    public function eventAttributes(): array
    {
        return Arr::except(parent::eventAttributes(), 'event_id');
    }
}
