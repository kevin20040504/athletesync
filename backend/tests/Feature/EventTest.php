<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EventTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create(['timezone' => 'Asia/Manila']);
        $this->actingAs($this->user, 'web');
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function payload(array $overrides = []): array
    {
        return [
            'title' => 'Team practice',
            'category' => 'practice',
            'starts_at' => '2026-10-12T08:00:00+08:00',
            'ends_at' => '2026-10-12T10:00:00+08:00',
            ...$overrides,
        ];
    }

    public function test_user_can_create_an_event(): void
    {
        $this->postJson('/api/v1/events', $this->payload(['location' => 'Main field']))
            ->assertCreated()
            ->assertJsonPath('data.title', 'Team practice')
            ->assertJsonPath('data.category', 'practice')
            ->assertJsonPath('data.location', 'Main field')
            ->assertJsonPath('data.starts_at', '2026-10-12T00:00:00Z')
            ->assertJsonPath('data.ends_at', '2026-10-12T02:00:00Z')
            ->assertJsonPath('data.all_day', false)
            ->assertJsonPath('data.rrule', null)
            ->assertJsonPath('data.series_ends_at', '2026-10-12T02:00:00Z');

        $this->assertSame(1, $this->user->events()->count());
    }

    public function test_dates_without_offset_use_the_users_timezone(): void
    {
        $this->postJson('/api/v1/events', $this->payload([
            'starts_at' => '2026-10-12 08:00',
            'ends_at' => '2026-10-12 10:00',
        ]))->assertCreated()
            ->assertJsonPath('data.timezone', 'Asia/Manila')
            ->assertJsonPath('data.starts_at', '2026-10-12T00:00:00Z');
    }

    public function test_dates_without_offset_use_an_explicit_event_timezone(): void
    {
        $this->postJson('/api/v1/events', $this->payload([
            'starts_at' => '2026-10-12 08:00',
            'ends_at' => '2026-10-12 10:00',
            'timezone' => 'America/New_York',
        ]))->assertCreated()
            ->assertJsonPath('data.timezone', 'America/New_York')
            ->assertJsonPath('data.starts_at', '2026-10-12T12:00:00Z');
    }

    public function test_create_requires_core_fields(): void
    {
        $this->postJson('/api/v1/events', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['title', 'category', 'starts_at', 'ends_at']);
    }

    public function test_create_rejects_unknown_category_and_timezone(): void
    {
        $this->postJson('/api/v1/events', $this->payload(['category' => 'nap', 'timezone' => 'Mars/Olympus']))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['category', 'timezone']);
    }

    public function test_end_must_be_after_start(): void
    {
        $this->postJson('/api/v1/events', $this->payload(['ends_at' => '2026-10-12T08:00:00+08:00']))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['ends_at']);
    }

    public function test_recurrence_rule_is_normalized(): void
    {
        $this->postJson('/api/v1/events', $this->payload(['rrule' => 'rrule:freq=weekly;byday=mo,we']))
            ->assertCreated()
            ->assertJsonPath('data.rrule', 'FREQ=WEEKLY;BYDAY=MO,WE')
            ->assertJsonPath('data.series_ends_at', null);
    }

    public function test_invalid_recurrence_rules_are_rejected(): void
    {
        foreach ([
            'garbage',
            'FREQ=HOURLY',
            'FREQ=DAILY;BYHOUR=1,2,3',
            'FREQ=DAILY;COUNT=5000',
            'FREQ=WEEKLY;UNTIL=20261110',
        ] as $rrule) {
            $this->postJson('/api/v1/events', $this->payload(['rrule' => $rrule]))
                ->assertUnprocessable()
                ->assertJsonValidationErrors(['rrule']);
        }

        $this->assertSame(0, Event::count());
    }

    public function test_finite_series_records_when_it_ends(): void
    {
        $this->postJson('/api/v1/events', $this->payload(['rrule' => 'FREQ=DAILY;COUNT=3']))
            ->assertCreated()
            ->assertJsonPath('data.series_ends_at', '2026-10-14T02:00:00Z');
    }

    public function test_user_can_view_their_event(): void
    {
        $event = Event::factory()->for($this->user)->create();

        $this->getJson("/api/v1/events/{$event->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $event->id);
    }

    public function test_other_users_events_are_not_found(): void
    {
        $event = Event::factory()->create();

        $this->getJson("/api/v1/events/{$event->id}")->assertNotFound();
        $this->patchJson("/api/v1/events/{$event->id}", ['title' => ''])->assertNotFound();
        $this->deleteJson("/api/v1/events/{$event->id}")->assertNotFound();

        $this->assertModelExists($event);
    }

    public function test_partial_update_keeps_other_fields(): void
    {
        $event = Event::factory()->for($this->user)->create(['title' => 'Old', 'location' => 'Gym A']);

        $this->patchJson("/api/v1/events/{$event->id}", ['title' => 'New'])
            ->assertOk()
            ->assertJsonPath('data.title', 'New')
            ->assertJsonPath('data.location', 'Gym A');
    }

    public function test_update_checks_end_against_existing_start(): void
    {
        $event = Event::factory()->for($this->user)->create([
            'starts_at' => '2026-10-12 10:00:00',
            'ends_at' => '2026-10-12 12:00:00',
        ]);

        $this->patchJson("/api/v1/events/{$event->id}", ['ends_at' => '2026-10-12T09:00:00Z'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['ends_at']);
    }

    public function test_removing_recurrence_turns_series_into_single_event(): void
    {
        $event = Event::factory()->for($this->user)->create([
            'starts_at' => '2026-10-12 10:00:00',
            'ends_at' => '2026-10-12 12:00:00',
            'rrule' => 'FREQ=WEEKLY',
        ]);
        $this->assertNull($event->series_ends_at);

        $this->patchJson("/api/v1/events/{$event->id}", ['rrule' => null])
            ->assertOk()
            ->assertJsonPath('data.rrule', null)
            ->assertJsonPath('data.series_ends_at', '2026-10-12T12:00:00Z');
    }

    public function test_user_can_delete_their_event(): void
    {
        $event = Event::factory()->for($this->user)->create();

        $this->deleteJson("/api/v1/events/{$event->id}")->assertNoContent();

        $this->assertModelMissing($event);
    }

    public function test_guests_cannot_use_events(): void
    {
        auth('web')->logout();

        $this->postJson('/api/v1/events', $this->payload())->assertUnauthorized();
    }
}
