<?php

namespace Database\Seeders;

use App\Models\Event;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

/**
 * A realistic week for a student-athlete, relative to the current week, so
 * the demo always looks current. Re-running it resets the demo account.
 *
 *   php artisan db:seed --class=DemoSeeder
 *
 * Log in as demo@athletesync.test / demo-password. Times are local to
 * DEMO_TIMEZONE (default Asia/Manila); set it to your own timezone so the
 * calendar shows classes at sensible hours.
 */
class DemoSeeder extends Seeder
{
    public const EMAIL = 'demo@athletesync.test';

    public const PASSWORD = 'demo-password';

    public function run(): void
    {
        $timezone = env('DEMO_TIMEZONE', 'Asia/Manila');

        User::where('email', self::EMAIL)->delete();
        $user = User::create([
            'name' => 'Jordan Cruz',
            'email' => self::EMAIL,
            'password' => self::PASSWORD,
            'timezone' => $timezone,
        ]);

        $monday = Carbon::now($timezone)->startOfWeek();
        $semesterEnd = $monday->copy()->addWeeks(12)->endOfDay()->utc()->format('Ymd\THis\Z');

        // $day: 0 = Monday. Times are local wall-clock times.
        $add = function (string $title, string $category, int $day, string $start, string $end, array $extra = []) use ($user, $monday, $timezone): Event {
            $date = $monday->copy()->addDays($day)->format('Y-m-d');

            return $user->events()->create([
                'title' => $title,
                'category' => $category,
                'starts_at' => Carbon::parse("$date $start", $timezone)->utc(),
                'ends_at' => Carbon::parse("$date $end", $timezone)->utc(),
                'timezone' => $timezone,
                ...$extra,
            ]);
        };

        // Classes for the semester.
        $calculus = $add('Calculus II', 'class', 0, '09:00', '10:30', ['location' => 'Science Hall 204', 'rrule' => "FREQ=WEEKLY;BYDAY=MO,WE;UNTIL=$semesterEnd"]);
        $biology = $add('Biology 101', 'class', 1, '10:00', '11:30', ['location' => 'Life Sciences 110', 'rrule' => "FREQ=WEEKLY;BYDAY=TU,TH;UNTIL=$semesterEnd"]);
        $history = $add('World History', 'class', 0, '13:00', '14:00', ['location' => 'Humanities 3B', 'rrule' => "FREQ=WEEKLY;BYDAY=MO,WE,FR;UNTIL=$semesterEnd"]);
        // A lab that runs into Thursday practice: the demo's built-in conflict.
        $add('Biology lab', 'class', 3, '14:00', '16:30', ['location' => 'Life Sciences lab 2', 'rrule' => "FREQ=WEEKLY;BYDAY=TH;UNTIL=$semesterEnd"]);

        // Training.
        $add('Team practice', 'practice', 0, '16:00', '18:30', ['location' => 'Main field', 'rrule' => 'FREQ=WEEKLY;BYDAY=MO,TU,TH']);
        $add('Strength & conditioning', 'gym', 2, '06:30', '07:45', ['location' => 'Athletics weight room', 'rrule' => 'FREQ=WEEKLY;BYDAY=WE,FR']);
        $add('Recovery: stretch & ice bath', 'recovery', 6, '10:00', '11:00', ['rrule' => 'FREQ=WEEKLY;BYDAY=SU']);

        // This week's one-offs.
        $add('Home game vs Eagles', 'game', 5, '14:00', '17:00', ['location' => 'Main stadium', 'notes' => 'Report to the locker room by 12:30.']);
        $add('Calculus quiz', 'exam', 4, '09:00', '09:45', ['location' => 'Science Hall 204']);
        $add('Library study block', 'study', 2, '19:00', '21:00', ['rrule' => 'FREQ=WEEKLY;BYDAY=TU,WE']);
        $add('Dinner with family', 'personal', 4, '18:30', '20:30');
        $add('Midterm exams', 'exam', 14, '00:00', '00:00', [
            'all_day' => true,
            'ends_at' => $monday->copy()->addDays(17)->utc(),
        ]);

        // Tasks: one overdue, a few this week, one later, one undated.
        $due = fn (int $day, string $time) => Carbon::parse($monday->copy()->addDays($day)->format('Y-m-d')." $time", $timezone)->utc();
        $user->tasks()->createMany([
            ['title' => 'Read chapter 4 (World History)', 'event_id' => $history->id, 'due_at' => $due(0, '08:00')->subDay(), 'priority' => 'normal', 'estimated_minutes' => 60],
            ['title' => 'Calculus problem set 5', 'event_id' => $calculus->id, 'due_at' => $due(2, '23:59'), 'priority' => 'high', 'estimated_minutes' => 120],
            ['title' => 'Biology lab report', 'event_id' => $biology->id, 'due_at' => $due(4, '17:00'), 'priority' => 'high', 'estimated_minutes' => 180],
            ['title' => 'Submit travel form for away game', 'due_at' => $due(3, '12:00'), 'priority' => 'normal'],
            ['title' => 'Essay outline: causes of WWI', 'event_id' => $history->id, 'due_at' => $due(9, '23:59'), 'priority' => 'normal', 'estimated_minutes' => 90],
            ['title' => 'Buy new ankle tape', 'priority' => 'low'],
            ['title' => 'Email coach about Friday physio', 'priority' => 'normal', 'completed_at' => now()->subHours(3)],
        ]);
    }
}
