<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ConflictTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->actingAs($this->user, 'web');
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function event(string $startsAt, string $endsAt, array $attributes = []): Event
    {
        return Event::factory()->for($this->user)->create([
            'starts_at' => $startsAt,
            'ends_at' => $endsAt,
            ...$attributes,
        ]);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function conflicts(string $from = '2026-11-01T00:00:00Z', string $to = '2026-11-15T00:00:00Z'): array
    {
        return $this->getJson('/api/v1/conflicts?'.http_build_query(['from' => $from, 'to' => $to]))
            ->assertOk()
            ->json('data');
    }

    public function test_overlapping_events_are_reported(): void
    {
        $class = $this->event('2026-11-02 09:00:00', '2026-11-02 10:30:00', ['title' => 'Biology', 'category' => 'class']);
        $practice = $this->event('2026-11-02 10:00:00', '2026-11-02 12:00:00', ['title' => 'Practice', 'category' => 'practice']);

        $conflicts = $this->conflicts();

        $this->assertCount(1, $conflicts);
        $this->assertSame([$class->id, $practice->id], array_column($conflicts[0]['events'], 'event_id'));
        $this->assertSame([
            'starts_at' => '2026-11-02T10:00:00Z',
            'ends_at' => '2026-11-02T10:30:00Z',
            'minutes' => 30,
        ], $conflicts[0]['overlap']);
    }

    public function test_back_to_back_events_do_not_conflict(): void
    {
        $this->event('2026-11-02 09:00:00', '2026-11-02 10:00:00');
        $this->event('2026-11-02 10:00:00', '2026-11-02 11:00:00');

        $this->assertSame([], $this->conflicts());
    }

    public function test_all_day_events_do_not_conflict(): void
    {
        $this->event('2026-11-02 00:00:00', '2026-11-03 00:00:00', ['all_day' => true]);
        $this->event('2026-11-02 10:00:00', '2026-11-02 11:00:00');

        $this->assertSame([], $this->conflicts());
    }

    public function test_contained_event_conflicts_for_its_whole_length(): void
    {
        $this->event('2026-11-02 08:00:00', '2026-11-02 12:00:00');
        $this->event('2026-11-02 09:00:00', '2026-11-02 10:00:00');

        $this->assertSame(60, $this->conflicts()[0]['overlap']['minutes']);
    }

    public function test_every_pair_of_a_triple_overlap_is_reported(): void
    {
        $this->event('2026-11-02 09:00:00', '2026-11-02 12:00:00');
        $this->event('2026-11-02 10:00:00', '2026-11-02 12:00:00');
        $this->event('2026-11-02 11:00:00', '2026-11-02 12:00:00');

        $this->assertCount(3, $this->conflicts());
    }

    public function test_recurring_events_conflict_on_each_shared_date(): void
    {
        // Monday class 09:00-10:00 vs daily practice 09:30-11:00, New York time.
        $this->event('2026-11-02 14:00:00', '2026-11-02 15:00:00', [
            'timezone' => 'America/New_York', 'rrule' => 'FREQ=WEEKLY;BYDAY=MO',
        ]);
        $this->event('2026-11-01 14:30:00', '2026-11-01 16:00:00', [
            'timezone' => 'America/New_York', 'rrule' => 'FREQ=DAILY',
        ]);

        $overlaps = array_column($this->conflicts(), 'overlap');

        $this->assertSame(['2026-11-02T14:30:00Z', '2026-11-09T14:30:00Z'], array_column($overlaps, 'starts_at'));
    }

    public function test_other_users_events_are_ignored(): void
    {
        $this->event('2026-11-02 09:00:00', '2026-11-02 10:00:00');
        Event::factory()->create(['starts_at' => '2026-11-02 09:00:00', 'ends_at' => '2026-11-02 10:00:00']);

        $this->assertSame([], $this->conflicts());
    }

    public function test_conflict_range_is_validated(): void
    {
        $this->getJson('/api/v1/conflicts')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['from', 'to']);
    }

    public function test_preview_reports_what_a_new_event_would_clash_with(): void
    {
        $class = $this->event('2026-11-02 09:00:00', '2026-11-02 10:30:00', ['title' => 'Biology']);

        $this->postJson('/api/v1/conflicts/preview', [
            'title' => 'Practice',
            'category' => 'practice',
            'starts_at' => '2026-11-02T10:00:00Z',
            'ends_at' => '2026-11-02T12:00:00Z',
        ])->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.proposed.starts_at', '2026-11-02T10:00:00Z')
            ->assertJsonPath('data.0.conflicts_with.event_id', $class->id)
            ->assertJsonPath('data.0.conflicts_with.title', 'Biology')
            ->assertJsonPath('data.0.overlap.minutes', 30);

        $this->assertSame(1, Event::count(), 'Preview must not save the event.');
    }

    public function test_preview_checks_recurring_events_for_180_days(): void
    {
        $this->event('2027-02-01 10:00:00', '2027-02-01 11:00:00'); // ~92 days out
        $this->event('2027-06-07 10:00:00', '2027-06-07 11:00:00'); // ~218 days out

        $this->postJson('/api/v1/conflicts/preview', [
            'title' => 'Lift',
            'category' => 'gym',
            'starts_at' => '2026-11-02T10:00:00Z',
            'ends_at' => '2026-11-02T11:00:00Z',
            'rrule' => 'FREQ=WEEKLY;BYDAY=MO',
        ])->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.proposed.starts_at', '2027-02-01T10:00:00Z')
            ->assertJsonPath('meta.checked_to', '2027-05-01T10:00:00Z');
    }

    public function test_preview_of_an_edit_ignores_the_stored_version(): void
    {
        $event = $this->event('2026-11-02 09:00:00', '2026-11-02 10:00:00');
        $payload = [
            'title' => 'Moved',
            'category' => 'study',
            'starts_at' => '2026-11-02T09:30:00Z',
            'ends_at' => '2026-11-02T10:30:00Z',
        ];

        $this->postJson('/api/v1/conflicts/preview', $payload)->assertJsonCount(1, 'data');
        $this->postJson('/api/v1/conflicts/preview', [...$payload, 'event_id' => $event->id])->assertJsonCount(0, 'data');
    }

    public function test_preview_rejects_another_users_event_id(): void
    {
        $foreign = Event::factory()->create();

        $this->postJson('/api/v1/conflicts/preview', [
            'title' => 'X',
            'category' => 'study',
            'starts_at' => '2026-11-02T09:00:00Z',
            'ends_at' => '2026-11-02T10:00:00Z',
            'event_id' => $foreign->id,
        ])->assertUnprocessable()->assertJsonValidationErrors(['event_id']);
    }

    public function test_preview_validates_like_create(): void
    {
        $this->postJson('/api/v1/conflicts/preview', ['starts_at' => '2026-11-02T10:00:00Z'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['title', 'category', 'ends_at']);
    }

    public function test_guests_cannot_check_conflicts(): void
    {
        auth('web')->logout();

        $this->getJson('/api/v1/conflicts?from=2026-11-01&to=2026-11-08')->assertUnauthorized();
        $this->postJson('/api/v1/conflicts/preview', [])->assertUnauthorized();
    }
}
