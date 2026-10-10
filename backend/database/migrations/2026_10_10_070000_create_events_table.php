<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->string('category', 20);
            $table->string('location')->nullable();
            $table->text('notes')->nullable();

            // First occurrence, stored in UTC.
            $table->dateTime('starts_at');
            $table->dateTime('ends_at');
            $table->boolean('all_day')->default(false);

            // Recurrence: an RFC 5545 RRULE (e.g. "FREQ=WEEKLY;BYDAY=MO,WE"),
            // expanded in `timezone` so local times survive DST changes.
            $table->string('timezone', 64);
            $table->string('rrule', 500)->nullable();
            // End of the last occurrence; null for a series that never ends.
            // Lets range queries skip finished series without expanding them.
            $table->dateTime('series_ends_at')->nullable();

            $table->timestamps();

            $table->index(['user_id', 'starts_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('events');
    }
};
