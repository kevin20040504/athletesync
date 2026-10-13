<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StatsTest extends TestCase
{
    use RefreshDatabase;

    public function test_stats_summarize_the_range(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user, 'web');
        $this->travelTo('2026-11-04 12:00:00');

        $event = fn (string $category, string $start, string $end, array $extra = []) => Event::factory()->for($user)
            ->create(['category' => $category, 'starts_at' => $start, 'ends_at' => $end, ...$extra]);

        // Two 90-minute classes (weekly, Mon) and a practice overlapping the first one.
        $event('class', '2026-11-02 09:00:00', '2026-11-02 10:30:00', ['rrule' => 'FREQ=WEEKLY;BYDAY=MO,WE']);
        $event('practice', '2026-11-02 10:00:00', '2026-11-02 12:00:00');
        // Only the 60 minutes inside the range count.
        $event('gym', '2026-11-08 23:00:00', '2026-11-09 01:00:00');
        // All-day events are not time spent.
        $event('exam', '2026-11-05 00:00:00', '2026-11-06 00:00:00', ['all_day' => true]);

        Task::factory()->for($user)->create(['due_at' => '2026-11-01 10:00:00']); // overdue
        Task::factory()->for($user)->create(['due_at' => '2026-11-06 10:00:00']); // due in range
        Task::factory()->for($user)->create(); // undated
        Task::factory()->for($user)->create(['completed_at' => '2026-11-03 10:00:00']);
        Task::factory()->for($user)->create(['completed_at' => '2026-10-01 10:00:00']);

        $this->getJson('/api/v1/stats?from=2026-11-02T00:00:00Z&to=2026-11-09T00:00:00Z')
            ->assertOk()
            ->assertExactJson(['data' => [
                'minutes_by_category' => [
                    'class' => 180, 'exam' => 0, 'practice' => 120, 'game' => 0,
                    'gym' => 60, 'personal' => 0, 'study' => 0, 'recovery' => 0,
                ],
                'conflicts' => 1,
                'tasks' => [
                    'open' => 3,
                    'overdue' => 1,
                    'due_in_range' => 1,
                    'completed_in_range' => 1,
                ],
            ]]);
    }

    public function test_stats_require_a_valid_range(): void
    {
        $this->actingAs(User::factory()->create(), 'web');

        $this->getJson('/api/v1/stats')->assertUnprocessable();
    }
}
