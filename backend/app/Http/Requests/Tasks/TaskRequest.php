<?php

namespace App\Http\Requests\Tasks;

use App\Enums\TaskPriority;
use App\Models\Task;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Arr;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

/**
 * Validates POST /tasks and PATCH /tasks/{task}. A due date without an
 * offset is read in the user's timezone. `completed: true|false` marks
 * the task done or reopens it.
 */
class TaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        if ($this->task()) {
            Gate::authorize('update', $this->task());
        }

        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'title' => [$this->task() ? 'sometimes' : 'required', 'string', 'max:255'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'due_at' => ['sometimes', 'nullable', 'date'],
            'priority' => ['sometimes', Rule::enum(TaskPriority::class)],
            'estimated_minutes' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:1440'],
            'event_id' => [
                'sometimes', 'nullable', 'integer',
                Rule::exists('events', 'id')->where('user_id', $this->user()->id),
            ],
            'completed' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function taskAttributes(): array
    {
        $attributes = Arr::except($this->safe()->all(), 'completed');

        if (isset($attributes['due_at'])) {
            $attributes['due_at'] = Carbon::parse($attributes['due_at'], $this->user()->timezone)->utc();
        }

        if ($this->has('completed')) {
            // Keep the original completion time if it was already done.
            $attributes['completed_at'] = $this->boolean('completed')
                ? ($this->task()?->completed_at ?? now())
                : null;
        }

        return $attributes;
    }

    private function task(): ?Task
    {
        return $this->route('task');
    }
}
