<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Events\EventRequest;
use App\Http\Resources\EventResource;
use App\Models\Event;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

/**
 * CRUD for event definitions. To list what happens in a date range,
 * including expanded recurring events, use CalendarController.
 */
class EventController extends Controller
{
    public function store(EventRequest $request): JsonResponse
    {
        $event = $request->user()->events()->create($request->eventAttributes());

        return (new EventResource($event))->response()->setStatusCode(201);
    }

    public function show(Event $event): EventResource
    {
        Gate::authorize('view', $event);

        return new EventResource($event);
    }

    public function update(EventRequest $request, Event $event): EventResource
    {
        $event->update($request->eventAttributes());

        return new EventResource($event);
    }

    public function destroy(Event $event): Response
    {
        Gate::authorize('delete', $event);

        $event->delete();

        return response()->noContent();
    }
}
