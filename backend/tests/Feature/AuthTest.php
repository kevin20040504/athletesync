<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Sanctum only starts a session for requests from the SPA's origin.
        $this->withHeaders(['Referer' => 'http://localhost:5173/', 'Accept' => 'application/json']);
    }

    public function test_user_can_register_and_is_logged_in(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Ana Reyes',
            'email' => 'Ana@Example.com',
            'password' => 'secret-pass',
            'password_confirmation' => 'secret-pass',
            'timezone' => 'Asia/Manila',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.email', 'ana@example.com')
            ->assertJsonPath('data.timezone', 'Asia/Manila')
            ->assertJsonMissingPath('data.password');

        $this->assertAuthenticated('web');
    }

    public function test_register_defaults_timezone_to_utc(): void
    {
        $this->postJson('/api/v1/auth/register', [
            'name' => 'Ana Reyes',
            'email' => 'ana@example.com',
            'password' => 'secret-pass',
            'password_confirmation' => 'secret-pass',
        ])->assertCreated()->assertJsonPath('data.timezone', 'UTC');
    }

    public function test_register_validates_input(): void
    {
        User::factory()->create(['email' => 'taken@example.com']);

        $this->postJson('/api/v1/auth/register', [
            'name' => '',
            'email' => 'TAKEN@example.com',
            'password' => 'short',
            'password_confirmation' => 'different',
            'timezone' => 'Mars/Olympus',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'email', 'password', 'timezone']);

        $this->assertGuest('web');
    }

    public function test_user_can_log_in(): void
    {
        $user = User::factory()->create(['email' => 'ana@example.com', 'password' => 'secret-pass']);

        $this->postJson('/api/v1/auth/login', [
            'email' => ' ANA@example.com ',
            'password' => 'secret-pass',
        ])->assertOk()->assertJsonPath('data.id', $user->id);

        $this->assertAuthenticatedAs($user, 'web');
    }

    public function test_login_rejects_wrong_password(): void
    {
        User::factory()->create(['email' => 'ana@example.com', 'password' => 'secret-pass']);

        $this->postJson('/api/v1/auth/login', [
            'email' => 'ana@example.com',
            'password' => 'wrong-pass',
        ])->assertUnprocessable()->assertJsonValidationErrors(['email']);

        $this->assertGuest('web');
    }

    public function test_login_is_rate_limited(): void
    {
        foreach (range(1, 6) as $attempt) {
            $this->postJson('/api/v1/auth/login', ['email' => 'ana@example.com', 'password' => 'x']);
        }

        $this->postJson('/api/v1/auth/login', ['email' => 'ana@example.com', 'password' => 'x'])
            ->assertTooManyRequests();
    }

    public function test_current_user_requires_authentication(): void
    {
        $this->getJson('/api/v1/auth/user')->assertUnauthorized();
    }

    public function test_logged_in_user_can_fetch_themselves(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'web')
            ->getJson('/api/v1/auth/user')
            ->assertOk()
            ->assertJsonPath('data.email', $user->email);
    }

    public function test_user_can_log_out(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'web')
            ->postJson('/api/v1/auth/logout')
            ->assertNoContent();

        $this->assertGuest('web');
    }
}
