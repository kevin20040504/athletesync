<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CalendarTest extends TestCase
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
     * @return list<string>
     */
    private function startsBetween(string $from, string $to): array
    {
        return $this->getJson('/api/v1/calendar?'.http_build_query(['from' => $from, 'to' => $to]))
            ->assertOk()
            ->json('data.*.starts_at');
    }

    public function test_single_event_is_listed_when_it_overlaps_the_range(): void
    {
        Event::factory()->for($this->user)->create([
            'starts_at' => '2026-11-02 10:00:00',
            'ends_at' => '2026-11-02 12:00:00',
        ]);

        $this->assertSame(['2026-11-02T10:00:00Z'], $this->startsBetween('2026-11-01T00:00:00Z', '2026-11-08T00:00:00Z'));
        // Still running at the start of the range.
        $this->assertCount(1, $this->startsBetween('2026-11-02T11:00:00Z', '2026-11-03T00:00:00Z'));
        // Ends exactly when the range starts: no overlap.
        $this->assertSame([], $this->startsBetween('2026-11-02T12:00:00Z', '2026-11-03T00:00:00Z'));
    }

    public function test_weekly_class_keeps_local_time_across_dst_change(): void
    {
        // Mon/Wed 09:00-10:30 in New York; US clocks fall back on Sun 1 Nov 2026.
        $this->postJson('/api/v1/events', [
            'title' => 'Biology 101',
            'category' => 'class',
            'starts_at' => '2026-10-26 09:00',
            'ends_at' => '2026-10-26 10:30',
            'timezone' => 'America/New_York',
            'rrule' => 'FREQ=WEEKLY;BYDAY=MO,WE;UNTIL=20261110T000000Z',
        ])->assertCreated()
            ->assertJsonPath('data.series_ends_at', '2026-11-09T15:30:00Z');

        $this->assertSame([
            '2026-10-26T13:00:00Z',
            '2026-10-28T13:00:00Z',
            '2026-11-02T14:00:00Z',
            '2026-11-04T14:00:00Z',
        ], $this->startsBetween('2026-10-26T00:00:00Z', '2026-11-09T00:00:00Z'));
    }

    public function test_occurrences_carry_event_details(): void
    {
        $event = Event::factory()->for($this->user)->create([
            'title' => 'Lift',
            'category' => 'gym',
            'starts_at' => '2026-11-02 10:00:00',
            'ends_at' => '2026-11-02 11:00:00',
            'rrule' => 'FREQ=DAILY;COUNT=2',
        ]);

        $this->getJson('/api/v1/calendar?from=2026-11-02T00:00:00Z&to=2026-11-03T00:00:00Z')
            ->assertOk()
            ->assertExactJson(['data' => [[
                'event_id' => $event->id,
                'title' => 'Lift',
                'category' => 'gym',
                'location' => null,
                'all_day' => false,
                'recurring' => true,
                'starts_at' => '2026-11-02T10:00:00Z',
                'ends_at' => '2026-11-02T11:00:00Z',
            ]]]);
    }

    public function test_finite_series_stops(): void
    {
        Event::factory()->for($this->user)->create([
            'starts_at' => '2026-11-02 10:00:00',
            'ends_at' => '2026-11-02 11:00:00',
            'rrule' => 'FREQ=DAILY;COUNT=3',
        ]);

        $this->assertCount(3, $this->startsBetween('2026-11-01T00:00:00Z', '2026-12-01T00:00:00Z'));
        $this->assertSame([], $this->startsBetween('2026-11-05T00:00:00Z', '2026-12-01T00:00:00Z'));
    }

    public function test_endless_series_continues_into_later_ranges(): void
    {
        Event::factory()->for($this->user)->create([
            'starts_at' => '2026-11-02 10:00:00',
            'ends_at' => '2026-11-02 11:00:00',
            'rrule' => 'FREQ=WEEKLY',
        ]);

        $this->assertSame(
            ['2027-11-01T10:00:00Z', '2027-11-08T10:00:00Z'],
            $this->startsBetween('2027-11-01T00:00:00Z', '2027-11-15T00:00:00Z'),
        );
    }

    public function test_recurring_occurrence_running_into_the_range_is_included(): void
    {
        // Nightly 23:00-01:00: the occurrence from the previous evening overlaps midnight.
        Event::factory()->for($this->user)->create([
            'starts_at' => '2026-11-01 23:00:00',
            'ends_at' => '2026-11-02 01:00:00',
            'rrule' => 'FREQ=DAILY',
        ]);

        $this->assertSame(
            ['2026-11-02T23:00:00Z', '2026-11-03T23:00:00Z'],
            $this->startsBetween('2026-11-03T00:00:00Z', '2026-11-04T00:00:00Z'),
        );
    }

    public function test_results_are_sorted_and_exclude_other_users(): void
    {
        Event::factory()->for($this->user)->create(['starts_at' => '2026-11-03 09:00:00', 'ends_at' => '2026-11-03 10:00:00']);
        Event::factory()->for($this->user)->create(['starts_at' => '2026-11-02 09:00:00', 'ends_at' => '2026-11-02 10:00:00']);
        Event::factory()->create(['starts_at' => '2026-11-02 12:00:00', 'ends_at' => '2026-11-02 13:00:00']);

        $this->assertSame(
            ['2026-11-02T09:00:00Z', '2026-11-03T09:00:00Z'],
            $this->startsBetween('2026-11-01T00:00:00Z', '2026-11-08T00:00:00Z'),
        );
    }

    public function test_range_is_validated(): void
    {
        $this->getJson('/api/v1/calendar')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['from', 'to']);

        $this->getJson('/api/v1/calendar?from=2026-11-08&to=2026-11-01')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['to']);

        $this->getJson('/api/v1/calendar?from=2026-01-01&to=2028-01-01')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['to']);
    }

    public function test_guests_cannot_view_the_calendar(): void
    {
        auth('web')->logout();

        $this->getJson('/api/v1/calendar?from=2026-11-01&to=2026-11-08')->assertUnauthorized();
    }
}
