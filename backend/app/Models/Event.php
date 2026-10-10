<?php

namespace App\Models;

use App\Enums\EventCategory;
use App\Services\Recurrence;
use Database\Factories\EventFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

class Event extends Model
{
    /** @use HasFactory<EventFactory> */
    use HasFactory;

    /** Mirror column defaults so a freshly created model serializes them. */
    protected $attributes = [
        'all_day' => false,
    ];

    protected $fillable = [
        'title',
        'category',
        'location',
        'notes',
        'starts_at',
        'ends_at',
        'all_day',
        'timezone',
        'rrule',
    ];

    protected function casts(): array
    {
        return [
            'category' => EventCategory::class,
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'series_ends_at' => 'datetime',
            'all_day' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (Event $event) {
            $event->series_ends_at = $event->isRecurring()
                ? app(Recurrence::class)->seriesEnd($event)
                : $event->ends_at;
        });
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isRecurring(): bool
    {
        return $this->rrule !== null;
    }

    public function durationInSeconds(): int
    {
        return (int) $this->starts_at->diffInSeconds($this->ends_at);
    }

    /**
     * Events with at least one occurrence that may overlap [$from, $to).
     *
     * @param  Builder<Event>  $query
     */
    public function scopeOverlapping(Builder $query, Carbon $from, Carbon $to): void
    {
        $query->where('starts_at', '<', $to)
            ->where(fn (Builder $q) => $q
                ->whereNull('series_ends_at')
                ->orWhere('series_ends_at', '>', $from));
    }
}
