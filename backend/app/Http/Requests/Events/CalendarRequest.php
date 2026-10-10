<?php

namespace App\Http\Requests\Events;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Validator;

class CalendarRequest extends FormRequest
{
    /** Widest range one request may expand (a year view plus padding). */
    public const MAX_DAYS = 400;

    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'from' => ['required', 'date'],
            'to' => ['required', 'date', 'after:from'],
        ];
    }

    /**
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator) {
                if ($validator->errors()->isEmpty() && $this->from()->diffInDays($this->to()) > self::MAX_DAYS) {
                    $validator->errors()->add('to', 'The range may span at most '.self::MAX_DAYS.' days.');
                }
            },
        ];
    }

    public function from(): Carbon
    {
        return Carbon::parse($this->input('from'))->utc();
    }

    public function to(): Carbon
    {
        return Carbon::parse($this->input('to'))->utc();
    }
}
