# Playwright: основи e2e-тестів

Нотатка про основи Playwright Test: як написати перший end-to-end тест, як шукати елементи, які є перевірки, мережеві моки та запуск. Unit-тести — у [vitest.md](vitest.md).

Усі приклади запущено: **@playwright/test 1.62.0**, chromium, **Node.js 24.12.0**, на локальній сторінці зі статичного сервера. Код англійською, пояснення українською.

---

## 1. Що таке e2e-тест

**End-to-end (e2e) тест** керує справжнім браузером, як користувач: відкриває сторінку, клікає, вводить текст і перевіряє, що **видно на екрані**. Він перевіряє всю ланку разом: фронтенд, бекенд, маршрутизацію, стилі.

| | Unit (Vitest) | e2e (Playwright) |
|---|---|---|
| Що перевіряє | функцію, модуль | сценарій користувача |
| Середовище | Node, моки | справжній браузер |
| Швидкість | мілісекунди | секунди |
| Коли падає | зламана логіка | зламаний сценарій, у тому числі через стилі, мережу, інтеграцію |

e2e-тестів має бути мало і лише на **критичні сценарії** (логін, оформлення замовлення): вони повільніші й крихкіші. Деталі логіки перевіряйте unit-тестами.

Playwright керує **chromium, firefox і webkit** однаковим API, запускає тести паралельно, а кожен тест отримує **чистий контекст** браузера (свої cookies і storage).

## 2. Встановлення і запуск

```bash
npm i -D @playwright/test
npx playwright install
```

Друга команда завантажує браузери в кеш (`~/Library/Caches/ms-playwright` на macOS). **Версія пакета жорстко пов'язана з версією браузера**: 1.62 вимагає chromium revision 1234, 1.63 — 1243. Якщо пакет новіший за завантажений браузер, запуск падає так **[виміряно]**:

```text
Error: browserType.launch: Executable doesn't exist at .../chromium_headless_shell-1255/...
Looks like Playwright was just installed or updated.
Please run the following command to download new browsers: npx playwright install
```

Лікування: `npx playwright install` або закріпити версію пакета.

| Команда | Що робить |
|---|---|
| `npx playwright test` | усі тести, паралельно, headless |
| `npx playwright test tests/todo.spec.ts` | один файл |
| `npx playwright test -g "adds"` | тести, у назві яких є «adds» |
| `npx playwright test --headed` | з видимим вікном браузера |
| `npx playwright test --ui` | UI-режим: таймлайн, перегляд кроків, перезапуск |
| `npx playwright test --debug` | покроковий налагоджувач (Inspector) |
| `npx playwright test --list` | показати знайдені тести без запуску |
| `npx playwright test --reporter=list` | кожен тест рядком |
| `npx playwright codegen http://localhost:4173` | записати дії у браузері й отримати код тесту |
| `npx playwright show-report` | відкрити HTML-звіт |

## 3. Конфігурація

Файл `playwright.config.ts`:

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: {
    command: 'npx http-server site -p 4173 -s',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
  },
});
```

| Опція | Сенс |
|---|---|
| `testDir` | де лежать тести (файли `*.spec.ts`, `*.test.ts`) |
| `use.baseURL` | база для відносних адрес: `page.goto('/')` відкриє `http://localhost:4173/` |
| `use.trace` | коли записувати trace (покроковий запис для розбору падіння); `'on-first-retry'` — лише при повторі |
| `projects` | набір браузерів/пристроїв; кожен тест виконується в кожному проєкті |
| `webServer` | команда, яку Playwright запустить перед тестами й дочекається відповіді за `url` |
| `reuseExistingServer` | не запускати сервер, якщо за `url` вже щось відповідає |
| `retries`, `workers`, `timeout` | повтори, кількість паралельних воркерів, ліміт на тест (за замовчуванням 30 с) |

## 4. Перший тест

Сторінка `site/index.html`, яку тестуємо:

```html
<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Todo demo</title></head>
<body>
  <h1>Todo</h1>
  <label for="new">New task</label>
  <input id="new" placeholder="What to do?">
  <button id="add">Add</button>
  <p id="error" role="alert" hidden>Task is empty</p>
  <ul id="list"></ul>
  <script>
    const input = document.getElementById('new');
    const list = document.getElementById('list');
    const error = document.getElementById('error');
    document.getElementById('add').addEventListener('click', () => {
      const v = input.value.trim();
      error.hidden = v !== '';
      if (!v) return;
      const li = document.createElement('li');
      li.textContent = v;
      list.append(li);
      input.value = '';
    });
  </script>
</body>
</html>
```

Тест `tests/todo.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('has title', async ({ page }) => {
  await expect(page).toHaveTitle('Todo demo');
  await expect(page.getByRole('heading', { name: 'Todo' })).toBeVisible();
});

test('adds a task', async ({ page }) => {
  await page.getByLabel('New task').fill('Buy milk');
  await page.getByRole('button', { name: 'Add' }).click();
  await expect(page.getByRole('listitem')).toHaveText(['Buy milk']);
  await expect(page.getByLabel('New task')).toBeEmpty();
});

test('shows error on empty input', async ({ page }) => {
  await page.getByRole('button', { name: 'Add' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('listitem')).toHaveCount(0);
});

test('adds several tasks', async ({ page }) => {
  for (const t of ['a', 'b', 'c']) {
    await page.getByPlaceholder('What to do?').fill(t);
    await page.getByRole('button', { name: 'Add' }).click();
  }
  await expect(page.locator('#list li')).toHaveCount(3);
  await expect(page.locator('#list li').nth(1)).toHaveText('b');
});
```

Результат `npx playwright test --reporter=list` **[виміряно]**:

```text
Running 4 tests using 1 worker

  ✓  1 [chromium] › tests/todo.spec.ts:7:5 › has title (117ms)
  ✓  2 [chromium] › tests/todo.spec.ts:12:5 › adds a task (182ms)
  ✓  3 [chromium] › tests/todo.spec.ts:19:5 › shows error on empty input (76ms)
  ✓  4 [chromium] › tests/todo.spec.ts:25:5 › adds several tasks (150ms)

  4 passed (3.4s)
```

Складові:
- `test(name, async ({ page }) => ...)` — **фікстури** у фігурних дужках: `page` (нова вкладка), `context`, `browser`, `request`. Кожен тест отримує свіжу `page`.
- `test.beforeEach` / `afterEach` / `beforeAll` / `afterAll` — хуки, як у Vitest.
- Усі дії асинхронні: `await` перед кожною.

## 5. Локатори — як знаходити елементи

**Локатор** — це опис, **як знайти** елемент, а не сам елемент. Він перевизначається при кожній дії, тому не «протухає», коли DOM перемальовується.

Порядок переваги (від найкращого): за тим, що бачить користувач і допоміжні технології.

| Локатор | Приклад | Шукає |
|---|---|---|
| `getByRole` | `getByRole('button', { name: 'Add' })` | за роллю ARIA та доступним ім'ям (`button`, `heading`, `listitem`, `alert`, `link`, `textbox`…) |
| `getByLabel` | `getByLabel('New task')` | поле за текстом його `<label>` |
| `getByPlaceholder` | `getByPlaceholder('What to do?')` | за `placeholder` |
| `getByText` | `getByText('Task is empty')` | за видимим текстом |
| `getByTestId` | `getByTestId('submit')` | за атрибутом `data-testid` |
| `locator(css)` | `locator('#list li')` | CSS або XPath — лише коли нічого іншого |

Звуження й вибір з набору:

```ts
page.locator('#list li').nth(1)
page.locator('#list li').first()
page.getByRole('listitem').filter({ hasText: 'milk' })
```

Якщо локатор збігається з **кількома** елементами, дія над ним впаде в strict-режимі: уточніть `nth`, `first` або `filter`.

## 6. Дії

| Дія | Що робить |
|---|---|
| `page.goto(url)` | відкрити сторінку |
| `locator.click()` | клік |
| `locator.fill(text)` | очистити поле і вписати текст одразу |
| `locator.pressSequentially(text)` | друкувати по символу (для полів з обробкою клавіш) |
| `locator.press('Enter')` | натиснути клавішу |
| `locator.check()` / `uncheck()` | чекбокс |
| `locator.selectOption('value')` | `<select>` |
| `locator.hover()` | наведення |

Перед дією Playwright сам **чекає (auto-wait)**, поки елемент буде приєднаний до DOM, видимий, стабільний (не анімується), активний і не перекритий іншим. Тому `sleep` і ручні очікування майже не потрібні.

## 7. Перевірки (web-first assertions)

```ts
await expect(page).toHaveTitle('Todo demo');
await expect(page).toHaveURL(/\/done$/);
await expect(locator).toBeVisible();
await expect(locator).toHaveText('b');
await expect(locator).toHaveText(['a', 'b', 'c']);
await expect(locator).toContainText('mil');
await expect(locator).toHaveCount(3);
await expect(locator).toBeEmpty();
await expect(locator).toHaveValue('abc');
await expect(locator).toBeEnabled();
await expect(locator).toHaveAttribute('href', '/home');
```

Головна відмінність від Vitest: ці перевірки **повторюються, поки не пройдуть або не мине таймаут** (за замовчуванням 5 с). Тому `await expect(locator).toHaveText(...)` дочекається, коли текст з'явиться після запиту до сервера.

Не змішуйте з «синхронним» знімком: `expect(await locator.textContent()).toBe('x')` читає значення **один раз** і не чекає, тому створює нестабільні тести. Завжди беріть `await expect(locator)...`.

Невдача показує, що шукали і що бачили **[виміряно]**:

```text
Error: expect(locator).toHaveText(expected) failed

Locator:  locator('h1')
Expected: "Nope"
Received: "Todo"
Timeout:  1500ms

Call log:
  - Expect "toHaveText" with timeout 1500ms
  - waiting for locator('h1')
    16 × locator resolved to <h1>Todo</h1>
       - unexpected value "Todo"
```

## 8. Мережа: підміна запитів

`page.route` перехоплює запити сторінки, і тест не залежить від справжнього API.

Сторінка робить `fetch('/api/user')` і виводить `name`. Тест:

```ts
import { test, expect } from '@playwright/test';

test('mocks network', async ({ page }) => {
  await page.route('**/api/user', route => route.fulfill({ json: { name: 'Mocked Ann' } }));
  await page.goto('/api.html');
  await page.getByRole('button', { name: 'Load' }).click();
  await expect(page.locator('#out')).toHaveText('Mocked Ann');
});
```

Тест зелений **[виміряно]**. `route.fulfill` повертає свою відповідь, `route.abort()` обриває запит, `route.continue()` пропускає далі.

Повільна відповідь теж не потребує `sleep` **[виміряно]**: коли обробник затримує відповідь на 800 мс, перевірка `toHaveText('Slow')` сама дочекалась (тест зайняв 1.4 с):

```ts
test('auto-wait with delayed content', async ({ page }) => {
  await page.route('**/api/user', async route => {
    await new Promise(r => setTimeout(r, 800));
    await route.fulfill({ json: { name: 'Slow' } });
  });
  await page.goto('/api.html');
  await page.getByRole('button', { name: 'Load' }).click();
  await expect(page.locator('#out')).toHaveText('Slow');
});
```

## 9. Групування і кроки

```ts
test.describe('grouped', () => {
  test('step', async ({ page }) => {
    await test.step('open', async () => {
      await page.goto('/');
    });
    await test.step('check', async () => {
      await expect(page.locator('h1')).toHaveText('Todo');
    });
  });
});
```

`test.describe` групує тести (як `describe`), `test.step` розбиває тест на іменовані кроки, які видно у звіті й trace. Також є `test.skip`, `test.only`, `test.fixme`.

## 10. Паралельність та ізоляція

- Файли тестів виконуються **паралельно** в окремих воркерах; тести в одному файлі — послідовно (якщо не `fullyParallel: true`). У прогоні з 8 тестів Playwright використав 3 воркери **[виміряно]**.
- Кожен тест має власний browser context, тому cookies і localStorage одного тесту не потрапляють в інший.
- Тести не повинні залежати один від одного й від порядку: не покладайтесь на дані, створені попереднім тестом.

## 11. Налагодження

| Інструмент | Як |
|---|---|
| UI-режим | `npx playwright test --ui` |
| Inspector | `npx playwright test --debug` або `await page.pause()` у тесті |
| Trace | `use: { trace: 'on-first-retry' }`, потім `npx playwright show-trace trace.zip` |
| Знімок екрана | `await page.screenshot({ path: 'a.png' })` або `use: { screenshot: 'only-on-failure' }` |
| Codegen | `npx playwright codegen <url>` генерує код за вашими діями |

Після падіння Playwright кладе контекст помилки в `test-results/<тест>/error-context.md`.

## 12. Практичні правила

- Шукайте елементи за **роллю й видимим текстом** (`getByRole`, `getByLabel`), а не за CSS-класами: стиль міняється частіше за зміст.
- Жодних `page.waitForTimeout(…)`: використовуйте перевірки `expect(locator)`, що чекають самі.
- Один тест — один сценарій; дані готуйте через API чи `beforeEach`, а не проходьте всі кроки інтерфейсом.
- Не тестуйте сторонні сайти: мокайте мережу через `page.route`.
- Прогін у CI: `npx playwright test` із `retries: 2` і `trace: 'on-first-retry'`.

## 13. Типові помилки

| Помилка | Наслідок |
|---|---|
| пропущений `await` перед `expect(locator)` | тест завершується до перевірки, дає хибний успіх |
| `textContent()` замість `expect(locator).toHaveText()` | немає очікування, тест нестабільний |
| локатор збігається з кількома елементами | помилка strict mode |
| версія пакета не збігається з завантаженим браузером | `Executable doesn't exist`, потрібен `playwright install` |
| залежність тестів від порядку | падіння при паралельному запуску |
| CSS-селектори на кшталт `.btn-primary:nth-child(3)` | ламаються від будь-якого редизайну |
