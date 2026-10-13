<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_update_name_and_timezone(): void
    {
        $user = User::factory()->create(['name' => 'Old', 'timezone' => 'UTC']);

        $this->actingAs($user, 'web')
            ->patchJson('/api/v1/auth/user', ['name' => 'New', 'timezone' => 'Asia/Manila'])
            ->assertOk()
            ->assertJsonPath('data.name', 'New')
            ->assertJsonPath('data.timezone', 'Asia/Manila');
    }

    public function test_profile_update_is_validated(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'web')
            ->patchJson('/api/v1/auth/user', ['name' => '', 'timezone' => 'Nowhere/Land', 'email' => 'x@y.z'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'timezone']);

        $this->assertSame($user->email, $user->fresh()->email);
    }
}
