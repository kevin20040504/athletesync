/*
 * End-to-end smoke test: drives the running app in your installed Chrome
 * as the demo user and fails on any broken page, console error or failed
 * request. It changes no data (the conflict check is a preview, not a save).
 *
 * Prerequisites: both dev servers running, and the demo data seeded:
 *   cd backend && php artisan db:seed --class=DemoSeeder
 *
 *   npm run e2e                     # run the checks
 *   npm run screenshots             # also save README screenshots to docs/screenshots
 *
 * Env: BASE_URL (default http://localhost:5173), HEADED=1 to watch it run,
 * DEMO_TIMEZONE (default Asia/Manila; must match the seeded demo data).
 */
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright-core'

const BASE = process.env.BASE_URL ?? 'http://localhost:5173'
const shotsArg = process.argv.indexOf('--screenshots')
const SHOTS = shotsArg > -1 ? process.argv[shotsArg + 1] : null
if (SHOTS) mkdirSync(SHOTS, { recursive: true })

const browser = await chromium.launch({ channel: 'chrome', headless: !process.env.HEADED })
const context = await browser.newContext({
  viewport: { width: 1360, height: 900 },
  timezoneId: process.env.DEMO_TIMEZONE ?? 'Asia/Manila',
  colorScheme: 'light',
})
const page = await context.newPage()
// Library Playwright has no default action timeout; never hang forever.
page.setDefaultTimeout(15_000)

let current = 'start'
const problems = []
// A signed-out visitor's "who am I?" check answers 401; the app treats that as signed out.
const expected = (text) => text.includes('/api/v1/auth/user') || text.includes('status of 401')
page.on('console', (m) => m.type() === 'error' && !expected(m.text()) && problems.push(`[${current}] console: ${m.text()}`))
page.on('pageerror', (e) => problems.push(`[${current}] page error: ${e.message}`))
page.on('response', (r) => r.status() >= 400 && !expected(r.url()) && problems.push(`[${current}] HTTP ${r.status()} ${r.url()}`))

// Waiting for "network idle" doesn't work after in-app navigation, so track
// API requests ourselves and wait until none are in flight.
const inflight = new Set()
page.on('request', (r) => r.url().includes('/api/') && inflight.add(r))
page.on('requestfinished', (r) => inflight.delete(r))
page.on('requestfailed', (r) => inflight.delete(r))
async function settle() {
  for (let quiet = 0, i = 0; quiet < 2 && i < 120; i++) {
    await page.waitForTimeout(250)
    quiet = inflight.size ? 0 : quiet + 1
  }
}

async function shot(name) {
  if (!SHOTS) return
  await settle()
  await page.screenshot({ path: `${SHOTS}/${name}.png` })
}

const checks = []
async function check(name, fn) {
  current = name
  try {
    await fn()
    checks.push(`  ok    ${name}`)
  } catch (e) {
    checks.push(`  FAIL  ${name}: ${e.message.split('\n')[0]}`)
    problems.push(`[${name}] ${e.message.split('\n')[0]}`)
  }
}
// The sidebar and the phone tab bar both have these controls; use whichever is visible.
const visible = (role, name) => page.getByRole(role, { name }).locator('visible=true').first()
const nav = (label) => visible('link', label).click()

await check('guests are sent to the login page', async () => {
  await page.goto(BASE)
  await page.waitForURL('**/login')
  await shot('login')
})

await check('demo user can log in', async () => {
  await page.getByLabel('Email').fill('demo@athletesync.test')
  await page.getByLabel('Password').fill('demo-password')
  await page.getByRole('button', { name: 'Log in' }).click()
  await page.waitForURL(`${BASE}/`)
})

await check('dashboard shows the week and the seeded conflict', async () => {
  await page.getByText('Time by category this week').waitFor()
  await page.getByText('Needs a look').waitFor()
  await page.getByText('Calculus problem set 5').waitFor()
  await shot('dashboard')
})

await check('calendar outlines conflicting events', async () => {
  await nav('Calendar')
  await page.locator('.as-event', { hasText: 'Biology lab' }).first().waitFor()
  await settle()
  if ((await page.locator('.as-conflict').count()) === 0) throw new Error('no event is outlined as conflicting')
  await shot('calendar-week')
})

await check('event form previews conflicts before saving', async () => {
  await page.getByRole('button', { name: 'New event' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Title').fill('Extra film session')
  await dialog.getByLabel('Category').selectOption('practice')
  // Over Monday's Calculus II class (09:00-10:30), whatever this week is.
  const monday = await page.evaluate(() => {
    const d = new Date()
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  await dialog.getByLabel('Starts').fill(`${monday}T09:30`)
  await dialog.getByLabel('Ends').fill(`${monday}T11:00`)
  await dialog.getByText('Calculus II').waitFor()
  await shot('event-conflict-preview')
  await dialog.getByRole('button', { name: 'Cancel' }).click()
  await dialog.waitFor({ state: 'hidden' })
})

await check('calendar month view', async () => {
  await page.getByRole('tab', { name: 'Month view' }).click()
  await page.locator('.as-event').first().waitFor()
  await shot('calendar-month')
})

await check('tasks are grouped by due date', async () => {
  await nav('Tasks')
  await page.getByText(/^Overdue/).waitFor()
  await page.getByText('Biology lab report').waitFor()
  await shot('tasks')
})

await check('conflicts page lists the clash', async () => {
  await nav('Conflicts')
  await page.getByText(/conflicts? on \d+ days?/).waitFor()
  await page.getByRole('button', { name: /Biology lab/ }).first().waitFor()
  await shot('conflicts')
})

await check('settings page loads', async () => {
  await nav('Settings')
  await page.getByLabel('Timezone').waitFor()
})

await check('dark mode', async () => {
  await visible('button', 'Switch to dark mode').click()
  await nav('Dashboard')
  await page.getByText('Time by category this week').waitFor()
  await page.waitForTimeout(300) // let color transitions finish
  await shot('dashboard-dark')
  await nav('Calendar')
  await page.locator('.as-event').first().waitFor()
  await page.waitForTimeout(300)
  await shot('calendar-dark')
})

await check('phone layout has no horizontal scrolling', async () => {
  await page.setViewportSize({ width: 390, height: 844 })
  await nav('Dashboard')
  await page.getByText('Time by category this week').waitFor()
  await shot('dashboard-phone')
  for (const label of ['Calendar', 'Tasks', 'Conflicts']) {
    await nav(label).catch((e) => {
      throw new Error(`opening ${label}: ${e.message.split('\n')[0]}`)
    })
    await settle()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    if (overflow > 0) throw new Error(`${label} scrolls sideways by ${overflow}px`)
  }
  await visible('button', 'Switch to light mode')
    .click()
    .catch((e) => {
      throw new Error(`light mode toggle: ${e.message.split('\n')[0]}`)
    })
})

await check('log out', async () => {
  await visible('button', 'Log out').click()
  await page.waitForURL('**/login')
})

await browser.close()
console.log(checks.join('\n'))
if (problems.length) {
  console.log(`\n${problems.length} problem(s):\n  ${problems.join('\n  ')}`)
  process.exit(1)
}
console.log(`\nAll ${checks.length} checks passed${SHOTS ? `; screenshots in ${SHOTS}` : ''}.`)
