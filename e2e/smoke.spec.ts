import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const CONF = '~/.tmux.conf'
const CONF_TEXT = ['set -g prefix C-a', 'set -g mouse on', `bind r source-file ${CONF}`, ''].join('\n')

const CHALLENGE_LIMITS = [
  { difficulty: 'Beginner', clock: '1:00' },
  { difficulty: 'Intermediate', clock: '1:30' },
  { difficulty: 'Advanced', clock: '2:00' },
] as const

/** Opens the home page in English; every test gets a fresh context, so progress starts empty. */
async function openHome(page: Page) {
  await page.addInitScript(() => localStorage.setItem('i18nextLng', 'en'))
  await page.goto('/')
}

const commandBox = (page: Page) => page.getByRole('textbox', { name: 'command' })

async function typeCommand(page: Page, text: string) {
  await commandBox(page).fill(text)
  await commandBox(page).press('Enter')
}

test('home -> level 1-1 -> complete it, and the progress is kept', async ({ page }) => {
  await openHome(page)
  await expect(page.getByText('0/26 levels completed')).toBeVisible()

  await page.getByRole('button', { name: 'Start: 1-1 Meet tmux' }).click()
  await typeCommand(page, 'tmux new -s mysession')

  const dialog = page.getByRole('dialog', { name: 'Level Complete!' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('img', { name: '3 of 3 stars' })).toBeVisible()
  await dialog.getByRole('button', { name: 'Back to Levels' }).click()

  const card = page.getByRole('button', { name: '1-1 Meet tmux', exact: true })
  await expect(card).toContainText('Completed')
  await expect(card.getByRole('img', { name: '3 of 3 stars' })).toBeVisible()

  await page.getByRole('button', { name: 'Back' }).click()
  await page.getByRole('button', { name: 'Back' }).click()
  await expect(page.getByText('1/26 levels completed')).toBeVisible()
  await expect(page.getByRole('button', { name: /^Continue: 1-2 / })).toBeVisible()
})

test('level 3-4: write the config in the editor, source it, reload it with Ctrl+a r', async ({ page }) => {
  await openHome(page)
  await page.getByRole('button', { name: 'Learning Mode' }).click()
  await page.getByRole('button', { name: 'Chapter 3: Customization' }).click()
  await page.getByRole('button', { name: '3-4 Config File', exact: true }).click()

  await typeCommand(page, `vim ${CONF}`)
  const editor = page.getByRole('textbox', { name: CONF })
  await expect(editor).toBeFocused()
  await editor.fill(CONF_TEXT)
  await editor.press('Control+s')
  await expect(editor).toBeHidden()

  await typeCommand(page, `:source-file ${CONF}`)
  await page.keyboard.press('Control+a')
  await expect(commandBox(page)).toHaveAttribute('placeholder', 'Prefix key active, press next key...')
  await page.keyboard.press('r')

  const dialog = page.getByRole('dialog', { name: 'Level Complete!' })
  await expect(dialog).toBeVisible()
  const objectives = page.getByRole('list', { name: 'Mission' }).locator('li[data-done]')
  await expect(objectives).toHaveCount(3)
  await expect(objectives.and(page.locator('[data-done="false"]'))).toHaveCount(0)
})

for (const { difficulty, clock } of CHALLENGE_LIMITS) {
  test(`challenge mode: start a round (${difficulty})`, async ({ page }) => {
    await openHome(page)
    await page.getByRole('button', { name: 'Challenge Mode' }).click()
    await page.getByRole('button', { name: new RegExp(`^${difficulty}`) }).click()

    // The clock ticks once a second from the first render, so this is checked first.
    await expect(page.getByRole('timer')).toHaveText(clock)
    await expect(page.locator('li[data-done]').first()).toBeVisible()
    const panes = page.locator('[data-pane-id]')
    await expect(panes).toHaveCount(1)
    await expect(page.getByTestId('command-count')).toHaveText('0')

    await typeCommand(page, 'tmux split-window -h')
    await expect(page.getByTestId('command-count')).toHaveText('1')
    await expect(panes).toHaveCount(2)
  })
}
