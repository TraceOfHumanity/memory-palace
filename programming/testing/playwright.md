# Playwright: основи e2e-тестів

Нотатка про основи Playwright Test: як написати перший end-to-end тест, як шукати елементи, які є перевірки, мережеві моки та запуск. Unit-тести — у [vitest.md](vitest.md).

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

Друга команда завантажує браузери в кеш (`~/Library/Caches/ms-playwright` на macOS). **Версія пакета жорстко пов'язана з версією браузера**: 1.62 вимагає chromium revision 1234, 1.63 — 1243. Якщо пакет новіший за завантажений браузер, запуск падає так:

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

Результат `npx playwright test --reporter=list`:

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

Невдача показує, що шукали і що бачили:

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

Тест зелений. `route.fulfill` повертає свою відповідь, `route.abort()` обриває запит, `route.continue()` пропускає далі.

Повільна відповідь теж не потребує `sleep`: коли обробник затримує відповідь на 800 мс, перевірка `toHaveText('Slow')` сама дочекалась (тест зайняв 1.4 с):

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

- Файли тестів виконуються **паралельно** в окремих воркерах; тести в одному файлі — послідовно (якщо не `fullyParallel: true`). У прогоні з 8 тестів Playwright використав 3 воркери.
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

## Задачі для закріплення

36 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Кожен фрагмент — повний файл `*.spec.ts`; запуск `npx playwright test` у Chromium; у відповіді `✓` — тест пройдено, `✗` — провалено (з початком повідомлення), `○` — пропущено.

### Рівень 1. Основи

**1.** Мінімальний тест: `setContent` та `toHaveText`.

```ts
import { test, expect } from '@playwright/test';
test('заголовок', async ({ page }) => {
  await page.setContent('<h1>Привіт</h1>');
  await expect(page.locator('h1')).toHaveText('Привіт');
});
```

**2.** Клік за роллю кнопки та перевірка тексту.

```ts
import { test, expect } from '@playwright/test';
test('клік', async ({ page }) => {
  await page.setContent(`<button id="b" onclick="document.getElementById('o').textContent='clicked'">Натисни</button><p id="o">початок</p>`);
  await page.getByRole('button', { name: 'Натисни' }).click();
  await expect(page.locator('#o')).toHaveText('clicked');
});
```

**3.** Web-first перевірка чекає появи елемента.

```ts
import { test, expect } from '@playwright/test';
test('поява з затримкою', async ({ page }) => {
  await page.setContent('<div id="r"></div><script>setTimeout(() => { document.getElementById("r").textContent = "ready"; }, 300);</script>');
  await expect(page.locator('#r')).toHaveText('ready');
});
```

**4.** Тайм-аут перевірки: елемент так і не з'явився.

```ts
import { test, expect } from '@playwright/test';
test('немає елемента', async ({ page }) => {
  await page.setContent('<p>x</p>');
  await expect(page.locator('.missing')).toBeVisible({ timeout: 500 });
});
```

**5.** Локатори: `getByText`, `getByLabel`, `getByPlaceholder`, `getByTestId`.

```ts
import { test, expect } from '@playwright/test';
test('локатори', async ({ page }) => {
  await page.setContent('<label>Ім\'я <input placeholder="введіть" data-testid="name"></label><p>Текст</p>');
  await expect(page.getByLabel('Ім\'я')).toHaveCount(1);
  await expect(page.getByPlaceholder('введіть')).toHaveCount(1);
  await expect(page.getByTestId('name')).toHaveCount(1);
  await expect(page.getByText('Текст')).toBeVisible();
});
```

**6.** Заповнення поля `fill` і перевірка значення.

```ts
import { test, expect } from '@playwright/test';
test('fill', async ({ page }) => {
  await page.setContent('<input id="i">');
  await page.locator('#i').fill('hello');
  await expect(page.locator('#i')).toHaveValue('hello');
});
```

**7.** `check` і `toBeChecked`.

```ts
import { test, expect } from '@playwright/test';
test('checkbox', async ({ page }) => {
  await page.setContent('<input type="checkbox" id="c">');
  await page.locator('#c').check();
  await expect(page.locator('#c')).toBeChecked();
  await page.locator('#c').uncheck();
  await expect(page.locator('#c')).not.toBeChecked();
});
```

**8.** `selectOption` для списку.

```ts
import { test, expect } from '@playwright/test';
test('select', async ({ page }) => {
  await page.setContent('<select id="s"><option value="a">A</option><option value="b">B</option></select>');
  await page.locator('#s').selectOption('b');
  await expect(page.locator('#s')).toHaveValue('b');
});
```

**9.** Кілька елементів: `count`, `nth`, `first`, `last`.

```ts
import { test, expect } from '@playwright/test';
test('список', async ({ page }) => {
  await page.setContent('<ul><li>a</li><li>b</li><li>c</li></ul>');
  const li = page.locator('li');
  await expect(li).toHaveCount(3);
  await expect(li.first()).toHaveText('a');
  await expect(li.nth(1)).toHaveText('b');
  await expect(li.last()).toHaveText('d');
});
```

### Рівень 2. Деталі й поведінка

**10.** `toHaveText` для масиву: порядок та точність.

```ts
import { test, expect } from '@playwright/test';
test('тексти', async ({ page }) => {
  await page.setContent('<ul><li>a</li><li>b</li></ul>');
  await expect(page.locator('li')).toHaveText(['a', 'b']);
});
test('інший порядок', async ({ page }) => {
  await page.setContent('<ul><li>a</li><li>b</li></ul>');
  await expect(page.locator('li')).toHaveText(['b', 'a'], { timeout: 500 });
});
```

**11.** Атрибути та класи: `toHaveAttribute`, `toHaveClass`, `toHaveCSS`.

```ts
import { test, expect } from '@playwright/test';
test('атрибути', async ({ page }) => {
  await page.setContent('<a id="l" href="/x" class="btn primary" style="color: red">L</a>');
  const l = page.locator('#l');
  await expect(l).toHaveAttribute('href', '/x');
  await expect(l).toHaveClass(/primary/);
  await expect(l).toHaveCSS('color', 'rgb(255, 0, 0)');
});
```

**12.** Видимість: `toBeVisible`, `toBeHidden`.

```ts
import { test, expect } from '@playwright/test';
test('видимість', async ({ page }) => {
  await page.setContent('<p id="a">видно</p><p id="b" style="display:none">сховано</p>');
  await expect(page.locator('#a')).toBeVisible();
  await expect(page.locator('#b')).toBeHidden();
  await expect(page.locator('#b')).toBeVisible({ timeout: 500 });
});
```

**13.** Заблокований елемент: `toBeDisabled` та спроба кліку (auto-wait).

```ts
import { test, expect } from '@playwright/test';
test('disabled', async ({ page }) => {
  await page.setContent('<button id="b" disabled>x</button>');
  await expect(page.locator('#b')).toBeDisabled();
  await page.locator('#b').click({ timeout: 700 });
});
```

**14.** Діалоги: `page.on('dialog')`.

```ts
import { test, expect } from '@playwright/test';
test('alert', async ({ page }) => {
  await page.setContent('<button onclick="alert(\'hi\')">a</button>');
  let msg = '';
  page.on('dialog', async d => { msg = d.message(); await d.accept(); });
  await page.locator('button').click();
  expect(msg).toBe('hi');
});
```

**15.** Виконання JS на сторінці: `evaluate`.

```ts
import { test, expect } from '@playwright/test';
test('evaluate', async ({ page }) => {
  await page.setContent('<p>1</p><p>2</p>');
  const n = await page.evaluate(() => document.querySelectorAll('p').length);
  expect(n).toBe(2);
  const text = await page.locator('p').first().evaluate(el => el.textContent);
  expect(text).toBe('1');
});
```

**16.** Мережа: підміна відповіді через `page.route`.

```ts
import { test, expect } from '@playwright/test';
test('route', async ({ page }) => {
  await page.route('**/api/user', route => route.fulfill({ json: { name: 'Ann' } }));
  await page.setContent('<p id="o"></p>');
  const name = await page.evaluate(async () => (await fetch('https://example.test/api/user')).json().then(j => j.name));
  expect(name).toBe('Ann');
});
```

**17.** Мережа: імітація помилки сервера 500.

```ts
import { test, expect } from '@playwright/test';
test('500', async ({ page }) => {
  await page.route('**/api/**', route => route.fulfill({ status: 500, body: 'fail' }));
  await page.setContent('<p></p>');
  const st = await page.evaluate(async () => (await fetch('https://example.test/api/x')).status);
  expect(st).toBe(500);
});
```

**18.** Мережа: блокування запиту `route.abort`.

```ts
import { test, expect } from '@playwright/test';
test('abort', async ({ page }) => {
  await page.route('**/blocked', route => route.abort());
  await page.setContent('<p></p>');
  const failed = await page.evaluate(async () => { try { await fetch('https://example.test/blocked'); return false; } catch { return true; } });
  expect(failed).toBe(true);
});
```

### Рівень 3. Нюанси та пастки

**19.** Очікування запиту: `waitForRequest` / `waitForResponse`.

```ts
import { test, expect } from '@playwright/test';
test('wait', async ({ page }) => {
  await page.route('**/ping', route => route.fulfill({ body: 'pong' }));
  await page.setContent('<button onclick="fetch(\'https://example.test/ping\')">go</button>');
  const [res] = await Promise.all([page.waitForResponse('**/ping'), page.locator('button').click()]);
  expect(await res.text()).toBe('pong');
});
```

**20.** `test.step` та вкладена структура звіту.

```ts
import { test, expect } from '@playwright/test';
test('кроки', async ({ page }) => {
  await test.step('відкрити', async () => { await page.setContent('<p>x</p>'); });
  await test.step('перевірити', async () => { await expect(page.locator('p')).toHaveText('x'); });
});
```

**21.** `test.describe` та `beforeEach`.

```ts
import { test, expect } from '@playwright/test';
test.describe('група', () => {
  test.beforeEach(async ({ page }) => { await page.setContent('<h1>Старт</h1>'); });
  test('перший', async ({ page }) => { await expect(page.locator('h1')).toHaveText('Старт'); });
  test('другий', async ({ page }) => { await expect(page.locator('h1')).toHaveText('Інше', { timeout: 500 }); });
});
```

**22.** Ізоляція: стан однієї сторінки не потрапляє в інший тест.

```ts
import { test, expect } from '@playwright/test';
test('перший', async ({ page }) => {
  await page.setContent('<p></p>');
  await page.evaluate(() => { (window as any).secret = 1; });
  expect(await page.evaluate(() => (window as any).secret)).toBe(1);
});
test('другий', async ({ page }) => {
  await page.setContent('<p></p>');
  expect(await page.evaluate(() => (window as any).secret)).toBeUndefined();
});
```

**23.** `test.skip`, `test.fixme` та умовний пропуск.

```ts
import { test, expect } from '@playwright/test';
test('виконується', async ({ page }) => { await page.setContent('<p>x</p>'); await expect(page.locator('p')).toHaveText('x'); });
test.skip('пропущений', async () => {});
test('умовний', async ({ page }) => { test.skip(true, 'причина'); });
```

**24.** Мобільна емуляція: розмір вікна та `matchMedia`.

```ts
import { test, expect } from '@playwright/test';
test.use({ viewport: { width: 390, height: 700 } });
test('мобільний', async ({ page }) => {
  await page.setContent('<p>x</p>');
  const w = await page.evaluate(() => window.innerWidth);
  const mobile = await page.evaluate(() => matchMedia('(max-width: 600px)').matches);
  expect([w, mobile]).toEqual([390, true]);
});
```

**25.** Локаль і часовий пояс контексту.

```ts
import { test, expect } from '@playwright/test';
test.use({ locale: 'uk-UA', timezoneId: 'Europe/Kyiv' });
test('локаль', async ({ page }) => {
  await page.setContent('<p>x</p>');
  const r = await page.evaluate(() => [navigator.language, new Date('2024-07-01T12:00:00Z').getHours()]);
  expect(r).toEqual(['uk-UA', 15]);
});
```

**26.** Клавіатура: `press` та `type`.

```ts
import { test, expect } from '@playwright/test';
test('keyboard', async ({ page }) => {
  await page.setContent('<input id="i">');
  await page.locator('#i').focus();
  await page.keyboard.type('ab');
  await page.keyboard.press('Backspace');
  await expect(page.locator('#i')).toHaveValue('a');
});
```

**27.** Hover і `dispatchEvent`.

```ts
import { test, expect } from '@playwright/test';
test('hover', async ({ page }) => {
  await page.setContent('<div id="d" onmouseover="this.textContent=\'over\'">x</div>');
  await page.locator('#d').hover();
  await expect(page.locator('#d')).toHaveText('over');
});
```

### Рівень 4. Практика

**28.** Цикли очікування: `expect.poll`.

```ts
import { test, expect } from '@playwright/test';
test('poll', async ({ page }) => {
  let n = 0;
  await expect.poll(() => ++n, { timeout: 2000 }).toBeGreaterThan(2);
});
```

**29.** Неправильний тест: `expect` без `await` для web-first перевірки.

```ts
import { test, expect } from '@playwright/test';
test('без await', async ({ page }) => {
  await page.setContent('<p>x</p>');
  expect(page.locator('p')).toHaveText('y');
});
```

**30.** Знімок елемента: розмір скриншота не нульовий.

```ts
import { test, expect } from '@playwright/test';
test('screenshot', async ({ page }) => {
  await page.setContent('<div style="width:50px;height:20px;background:red"></div>');
  const buf = await page.locator('div').screenshot();
  expect(buf.subarray(1, 4).toString()).toBe('PNG');
});
```

**31.** Кілька вкладок: `context.newPage`.

```ts
import { test, expect } from '@playwright/test';
test('дві сторінки', async ({ context }) => {
  const a = await context.newPage();
  const b = await context.newPage();
  await a.setContent('<p>A</p>');
  await b.setContent('<p>B</p>');
  expect(context.pages().length).toBe(2);
  await expect(b.locator('p')).toHaveText('B');
});
```

**32.** Cookie контексту: `addCookies` та читання.

```ts
import { test, expect } from '@playwright/test';
test('cookies', async ({ context }) => {
  await context.addCookies([{ name: 'sid', value: 'abc', url: 'https://example.test' }]);
  const c = await context.cookies('https://example.test');
  expect(c.map(x => x.name + '=' + x.value)).toEqual(['sid=abc']);
});
```

**33.** Чим e2e-тест відрізняється від unit-тесту?

**34.** Що таке auto-waiting у Playwright?

**35.** Чому слід віддавати перевагу `getByRole` і `getByTestId`, а не CSS-селекторам за структурою?

**36.** Як Playwright ізолює тести?

### Відповіді

1. `✓ заголовок`
2. `✓ клік`
3. `✓ поява з затримкою`
4. `✗ немає елемента — expect(locator).toBeVisible() failed; Expected: visible`
5. `✓ локатори`
6. `✓ fill`
7. `✓ checkbox`
8. `✓ select`
9. `✗ список — expect(locator).toHaveText(expected) failed; Expected: "d"; Received: "c"`
10. Вивід:

   ```text
   ✓ тексти
   ✗ інший порядок — expect(locator).toHaveText(expected) failed
   ```

11. `✓ атрибути`
12. `✗ видимість — expect(locator).toBeVisible() failed; Expected: visible; Received: hidden`
13. `✗ disabled — locator.click: Timeout 700ms exceeded.`
14. `✓ alert`
15. `✓ evaluate`
16. `✓ route`
17. `✓ 500`
18. `✓ abort`
19. `✓ wait`
20. `✓ кроки`
21. Вивід:

   ```text
   ✓ перший
   ✗ другий — expect(locator).toHaveText(expected) failed; Expected: "Інше"; Received: "Старт"
   ```

22. Вивід:

   ```text
   ✓ перший
   ✓ другий
   ```

23. Вивід:

   ```text
   ✓ виконується
   ○ пропущений
   ○ умовний
   ```

24. `✓ мобільний`
25. `✓ локаль`
26. `✓ keyboard`
27. `✓ hover`
28. `✓ poll`
29. `✗ без await — expect(locator).toHaveText(expected) failed; Expected: "y"; Received: ""`
30. `✓ screenshot`
31. `✓ дві сторінки`
32. `✓ cookies`
33. E2E перевіряє застосунок цілком у реальному браузері, як користувач (UI, мережа, база); unit-тест перевіряє окрему функцію чи клас ізольовано й значно швидший
34. Перед дією (клік, введення) Playwright чекає, поки елемент стане видимим, стабільним, увімкненим і готовим приймати події; `expect`-перевірки автоматично повторюються до тайм-ауту
35. Вони стійкі до змін верстки й відображають, як користувач і допоміжні технології сприймають сторінку; структурні CSS-селектори ламаються при рефакторингу
36. Кожен тест отримує новий контекст браузера (чисті cookie, localStorage, сесії), тому тести не впливають один на одного й можуть працювати паралельно
