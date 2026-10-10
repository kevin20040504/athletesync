<?php

namespace App\Enums;

/**
 * Event categories. Keep in sync with the --cat-* colors in frontend/src/index.css.
 */
enum EventCategory: string
{
    case Class_ = 'class';
    case Exam = 'exam';
    case Practice = 'practice';
    case Game = 'game';
    case Gym = 'gym';
    case Personal = 'personal';
    case Study = 'study';
    case Recovery = 'recovery';
}
