<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Tasks\TaskRequest;
use App\Http\Resources\TaskResource;
use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class TaskController extends Controller
{
    /** Completed tasks are history; only the most recent are listed. */
    public const COMPLETED_LIMIT = 100;

    /**
     * GET /tasks?status=open|completed. Open tasks come soonest-due first
     * (undated last, then by priority); completed ones newest first.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $status = $request->validate([
            'status' => ['sometimes', Rule::in(['open', 'completed'])],
        ])['status'] ?? 'open';

        $query = $request->user()->tasks()->with('event');

        $tasks = $status === 'open'
            ? $query->open()
                ->orderByRaw('due_at IS NULL')
                ->orderBy('due_at')
                ->orderByRaw("FIELD(priority, 'high', 'normal', 'low')")
                ->orderBy('id')
                ->get()
            : $query->completed()
                ->latest('completed_at')
                ->limit(self::COMPLETED_LIMIT)
                ->get();

        return TaskResource::collection($tasks);
    }

    public function store(TaskRequest $request): JsonResponse
    {
        $task = $request->user()->tasks()->create($request->taskAttributes());

        return (new TaskResource($task->load('event')))->response()->setStatusCode(201);
    }

    public function show(Task $task): TaskResource
    {
        Gate::authorize('view', $task);

        return new TaskResource($task->load('event'));
    }

    public function update(TaskRequest $request, Task $task): TaskResource
    {
        $task->update($request->taskAttributes());

        return new TaskResource($task->load('event'));
    }

    public function destroy(Task $task): Response
    {
        Gate::authorize('delete', $task);

        $task->delete();

        return response()->noContent();
    }
}
