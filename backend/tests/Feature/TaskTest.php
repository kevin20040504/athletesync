<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TaskTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create(['timezone' => 'Asia/Manila']);
        $this->actingAs($this->user, 'web');
    }

    public function test_user_can_create_a_task_linked_to_a_class(): void
    {
        $class = Event::factory()->for($this->user)->create(['title' => 'Biology', 'category' => 'class']);

        $this->postJson('/api/v1/tasks', [
            'title' => 'Lab report',
            'due_at' => '2026-11-02 23:59',
            'priority' => 'high',
            'estimated_minutes' => 90,
            'event_id' => $class->id,
        ])->assertCreated()
            ->assertJsonPath('data.title', 'Lab report')
            ->assertJsonPath('data.due_at', '2026-11-02T15:59:00Z')
            ->assertJsonPath('data.priority', 'high')
            ->assertJsonPath('data.estimated_minutes', 90)
            ->assertJsonPath('data.completed', false)
            ->assertJsonPath('data.event', ['id' => $class->id, 'title' => 'Biology', 'category' => 'class']);
    }

    public function test_minimal_task_gets_defaults(): void
    {
        $this->postJson('/api/v1/tasks', ['title' => 'Buy tape'])
            ->assertCreated()
            ->assertJsonPath('data.priority', 'normal')
            ->assertJsonPath('data.due_at', null)
            ->assertJsonPath('data.event', null);
    }

    public function test_task_validation(): void
    {
        $foreignEvent = Event::factory()->create();

        $this->postJson('/api/v1/tasks', [
            'priority' => 'urgent',
            'estimated_minutes' => 0,
            'event_id' => $foreignEvent->id,
            'due_at' => 'not a date',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['title', 'priority', 'estimated_minutes', 'event_id', 'due_at']);
    }

    public function test_open_tasks_are_sorted_by_due_date_then_priority(): void
    {
        $t = fn (string $title, ?string $due, string $priority = 'normal') => Task::factory()->for($this->user)
            ->create(['title' => $title, 'due_at' => $due, 'priority' => $priority]);

        $t('no date', null);
        $t('later', '2026-11-05 10:00:00');
        $t('soon low', '2026-11-02 10:00:00', 'low');
        $t('soon high', '2026-11-02 10:00:00', 'high');
        Task::factory()->for($this->user)->completed()->create(['title' => 'done']);
        Task::factory()->create(['title' => 'someone else']);

        $this->getJson('/api/v1/tasks')
            ->assertOk()
            ->assertJsonPath('data.*.title', ['soon high', 'soon low', 'later', 'no date']);
    }

    public function test_completed_tasks_are_listed_newest_first(): void
    {
        Task::factory()->for($this->user)->create(['title' => 'old', 'completed_at' => '2026-10-01 10:00:00']);
        Task::factory()->for($this->user)->create(['title' => 'new', 'completed_at' => '2026-10-05 10:00:00']);
        Task::factory()->for($this->user)->create(['title' => 'open']);

        $this->getJson('/api/v1/tasks?status=completed')
            ->assertOk()
            ->assertJsonPath('data.*.title', ['new', 'old']);

        $this->getJson('/api/v1/tasks?status=bogus')->assertUnprocessable();
    }

    public function test_completing_and_reopening_a_task(): void
    {
        $task = Task::factory()->for($this->user)->create();

        $this->travelTo('2026-10-13 08:00:00');
        $this->patchJson("/api/v1/tasks/{$task->id}", ['completed' => true])
            ->assertOk()
            ->assertJsonPath('data.completed', true)
            ->assertJsonPath('data.completed_at', '2026-10-13T08:00:00Z');

        // Marking done again keeps the original completion time.
        $this->travelTo('2026-10-14 08:00:00');
        $this->patchJson("/api/v1/tasks/{$task->id}", ['completed' => true])
            ->assertJsonPath('data.completed_at', '2026-10-13T08:00:00Z');

        $this->patchJson("/api/v1/tasks/{$task->id}", ['completed' => false])
            ->assertJsonPath('data.completed', false)
            ->assertJsonPath('data.completed_at', null);
    }

    public function test_deleting_linked_event_keeps_the_task(): void
    {
        $event = Event::factory()->for($this->user)->create();
        $task = Task::factory()->for($this->user)->create(['event_id' => $event->id]);

        $this->deleteJson("/api/v1/events/{$event->id}")->assertNoContent();

        $this->assertNull($task->fresh()->event_id);
    }

    public function test_other_users_tasks_are_not_found(): void
    {
        $task = Task::factory()->create();

        $this->getJson("/api/v1/tasks/{$task->id}")->assertNotFound();
        $this->patchJson("/api/v1/tasks/{$task->id}", ['title' => ''])->assertNotFound();
        $this->deleteJson("/api/v1/tasks/{$task->id}")->assertNotFound();

        $this->assertModelExists($task);
    }

    public function test_user_can_delete_a_task(): void
    {
        $task = Task::factory()->for($this->user)->create();

        $this->deleteJson("/api/v1/tasks/{$task->id}")->assertNoContent();

        $this->assertModelMissing($task);
    }
}
