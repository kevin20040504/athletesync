<?php

namespace Database\Factories;

use App\Enums\EventCategory;
use App\Models\Event;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Carbon;

/**
 * @extends Factory<Event>
 */
class EventFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $startsAt = Carbon::instance($this->faker->dateTimeBetween('+1 day', '+30 days'))->utc()->startOfHour();

        return [
            'user_id' => User::factory(),
            'title' => $this->faker->words(3, true),
            'category' => $this->faker->randomElement(EventCategory::cases()),
            'location' => null,
            'notes' => null,
            'starts_at' => $startsAt,
            'ends_at' => $startsAt->copy()->addHours(2),
            'all_day' => false,
            'timezone' => 'UTC',
            'rrule' => null,
        ];
    }
}
