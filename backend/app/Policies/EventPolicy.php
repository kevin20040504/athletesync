<?php

namespace App\Policies;

use App\Models\Event;
use App\Models\User;
use Illuminate\Auth\Access\Response;

/**
 * Users can only touch their own events. Other users' events answer 404,
 * not 403, so event IDs don't reveal what exists.
 */
class EventPolicy
{
    public function view(User $user, Event $event): Response
    {
        return $this->owns($user, $event);
    }

    public function update(User $user, Event $event): Response
    {
        return $this->owns($user, $event);
    }

    public function delete(User $user, Event $event): Response
    {
        return $this->owns($user, $event);
    }

    private function owns(User $user, Event $event): Response
    {
        return $user->id === $event->user_id
            ? Response::allow()
            : Response::denyAsNotFound();
    }
}
