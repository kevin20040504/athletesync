<?php

namespace App\Http\Requests\Events;

use App\Enums\EventCategory;
use App\Models\Event;
use App\Services\Recurrence;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;
use InvalidArgumentException;

/**
 * Validates both POST /events (all core fields required) and
 * PATCH /events/{event} (any subset; missing fields keep their values).
 *
 * Dates may carry an offset ("2026-10-12T08:00:00+08:00"); without one they
 * are read as local time in the event's timezone.
 */
class EventRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Check ownership before validating, so a foreign event is a 404
        // even when the payload is invalid.
        if ($this->event()) {
            Gate::authorize('update', $this->event());
        }

        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('rrule')) {
            $rrule = $this->input('rrule');
            $this->merge([
                'rrule' => is_string($rrule) && trim($rrule) !== '' ? Recurrence::normalize($rrule) : null,
            ]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $required = $this->event() ? 'sometimes' : 'required';

        return [
            'title' => [$required, 'string', 'max:255'],
            'category' => [$required, Rule::enum(EventCategory::class)],
            'starts_at' => [$required, 'date'],
            'ends_at' => [$required, 'date'],
            'all_day' => ['sometimes', 'boolean'],
            'location' => ['sometimes', 'nullable', 'string', 'max:255'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'timezone' => ['sometimes', 'string', 'timezone:all'],
            'rrule' => ['sometimes', 'nullable', 'string', 'max:500'],
        ];
    }

    /**
     * Cross-field checks, run against the merged (existing + new) values.
     *
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator) {
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                // Not safe(): that re-runs validation, including this hook.
                $attributes = $this->toModelAttributes($this->only(array_keys($this->rules())));
                $startsAt = $attributes['starts_at'] ?? $this->event()->starts_at;
                $endsAt = $attributes['ends_at'] ?? $this->event()->ends_at;
                $timezone = $attributes['timezone'] ?? $this->event()->timezone;
                $rrule = array_key_exists('rrule', $attributes) ? $attributes['rrule'] : $this->event()?->rrule;

                if ($endsAt <= $startsAt) {
                    $validator->errors()->add('ends_at', 'The end time must be after the start time.');

                    return;
                }

                if ($rrule !== null) {
                    try {
                        app(Recurrence::class)->parse($rrule, $startsAt, $timezone);
                    } catch (InvalidArgumentException $e) {
                        $validator->errors()->add('rrule', 'Invalid recurrence rule: '.$e->getMessage());
                    }
                }
            },
        ];
    }

    /**
     * Validated input ready for the model: dates converted to UTC, and on
     * create the timezone defaulted to the user's.
     *
     * @return array<string, mixed>
     */
    public function eventAttributes(): array
    {
        return $this->toModelAttributes($this->safe()->all());
    }

    /**
     * @param  array<string, mixed>  $attributes
     * @return array<string, mixed>
     */
    private function toModelAttributes(array $attributes): array
    {
        $timezone = $attributes['timezone']
            ?? $this->event()?->timezone
            ?? $this->user()->timezone;

        if (! $this->event()) {
            $attributes['timezone'] = $timezone;
        }

        foreach (['starts_at', 'ends_at'] as $key) {
            if (isset($attributes[$key])) {
                $attributes[$key] = Carbon::parse($attributes[$key], $timezone)->utc();
            }
        }

        return $attributes;
    }

    private function event(): ?Event
    {
        return $this->route('event');
    }
}
