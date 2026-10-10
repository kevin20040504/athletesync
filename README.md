# AthleteSync — Student-Athlete Life Organizer

One place for student-athletes to organize classes, deadlines, training, games and recovery, with scheduling-conflict detection across academic and athletic commitments.

> Status: **Phase 2 (setup) complete.** Feature work begins in Phase 3.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS v4, React Router, TanStack Query, FullCalendar 7, Recharts, Lucide |
| Backend | Laravel 12 (PHP 8.2+), Sanctum SPA cookie auth, rlanvin/php-rrule |
| Database | MySQL 8+ |

## Repository layout

```
athletesync/
├── backend/    Laravel REST API (/api/v1)
├── frontend/   React SPA
└── scripts/    Local setup helpers
```

## Local setup (Windows)

Prerequisites: PHP 8.2+ with `pdo_mysql`, Composer, Node 20+, MySQL 8+ running on port 3306.

```powershell
# 1. Backend dependencies and environment
cd backend
composer install
copy .env.example .env        # then set DB_PASSWORD to a strong password
php artisan key:generate
cd ..

# 2. Create the databases and the 'athletesync' MySQL user (asks for the root password)
powershell -ExecutionPolicy Bypass -File scripts\setup-database.ps1

# 3. Run migrations
cd backend
php artisan migrate
php artisan serve             # http://127.0.0.1:8000

# 4. Frontend (second terminal)
cd frontend
npm install
npm run dev                   # http://localhost:5173
```

Open http://localhost:5173. The setup check page should show the API and MySQL as connected.

## How local auth works

The Vite dev server proxies `/api` and `/sanctum` to Laravel, so the browser sees a single origin. Sanctum then authenticates the SPA with an HTTP-only session cookie and CSRF token; no API tokens are stored in the browser.

## Progress

- [x] Phase 1: Product plan, schema, API design
- [x] Phase 2: Project setup
- [ ] Phase 3: Backend (migrations, auth, API, services, tests)
- [ ] Phase 4: Frontend
- [ ] Phase 5: Integration and testing
- [ ] Phase 6: Portfolio preparation
