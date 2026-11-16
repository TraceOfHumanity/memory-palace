# Vitest: основи unit-тестів

Нотатка про основи Vitest: як написати перший тест, які є перевірки (matchers), хуки, моки, асинхронні тести, таймери й знімки. Інтеграційні та end-to-end тести — у [playwright.md](playwright.md).

---

## 1. Що таке unit-тест і навіщо Vitest

**Unit-тест** перевіряє найменшу частину коду (функцію, клас, модуль) окремо від решти системи: дали вхід — перевірили вихід або побічний ефект. Він швидкий (мілісекунди), детермінований і показує, **яка саме** функція зламалась.

**Vitest** — тест-раннер для проєктів на Vite/TypeScript:
- працює з ESM і TypeScript «з коробки», без Babel і ts-jest;
- використовує ту саму конфігурацію й плагіни, що й Vite;
- API майже збігається з Jest (`describe`, `test`, `expect`, `vi` замість `jest`);
- має watch-режим, який перезапускає лише тести, на які вплинула зміна.

Піраміда тестів: багато швидких unit-тестів → менше інтеграційних → кілька повільних e2e (Playwright).

## 2. Встановлення і запуск

```bash
npm i -D vitest
```

`package.json`:

```json
{
  "type": "module",
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run"
  }
}
```

| Команда | Що робить |
|---|---|
| `vitest` | watch-режим у терміналі; у CI (без TTY) запускає один прогін |
| `vitest run` | один прогін і вихід (для CI) |
| `vitest run src/math.test.ts` | лише файли, у шляху яких є цей рядок |
| `vitest run -t "divide"` | лише тести, у назві яких є «divide»; інші показуються як пропущені |
| `vitest list` | показати, які тести знайдено, не запускаючи їх |
| `vitest run --reporter=verbose` | кожен тест окремим рядком |

За замовчуванням Vitest шукає файли `**/*.{test,spec}.?(c|m)[jt]s?(x)`.

## 3. Перший тест

Файл `src/math.ts`:

```ts
export const sum = (a: number, b: number) => a + b;
export const divide = (a: number, b: number) => {
  if (b === 0) throw new Error('Division by zero');
  return a / b;
};
export const isEven = (n: number) => n % 2 === 0;
```

Файл `src/math.test.ts`:

```ts
import { describe, test, it, expect } from 'vitest';
import { sum, divide, isEven } from './math';

test('sum adds two numbers', () => {
  expect(sum(1, 2)).toBe(3);
});

describe('divide', () => {
  it('divides numbers', () => {
    expect(divide(6, 3)).toBe(2);
  });

  it('throws on zero', () => {
    expect(() => divide(1, 0)).toThrow('Division by zero');
  });
});

test.each([
  [2, true],
  [3, false],
  [0, true],
])('isEven(%i) is %s', (n, expected) => {
  expect(isEven(n)).toBe(expected);
});
```

Результат `vitest run --reporter=verbose`:

```text
 ✓ src/math.test.ts > sum adds two numbers 1ms
 ✓ src/math.test.ts > divide > divides numbers 0ms
 ✓ src/math.test.ts > divide > throws on zero 0ms
 ✓ src/math.test.ts > isEven(2) is true 0ms
 ✓ src/math.test.ts > isEven(3) is false 0ms
 ✓ src/math.test.ts > isEven(0) is true 0ms
```

Складові:
- `test(name, fn)` і `it(name, fn)` — **синоніми**; тест падає, якщо `fn` кидає виняток (зокрема з невдалого `expect`).
- `describe(name, fn)` групує тести; назви вкладаються: `divide > throws on zero`. Групи можна вкладати.
- `expect(value)` повертає об'єкт з перевірками (matchers).
- `test.each(table)(name, fn)` — той самий тест на кожному рядку таблиці. У назві `%i` — ціле, `%s` — рядок, `%o` — об'єкт.
- Помилку, яку кидає функція, перевіряють, **обгортаючи виклик у стрілку**: `expect(() => divide(1, 0)).toThrow(...)`. Якщо викликати `divide(1, 0)` прямо в `expect`, виняток вилетить до перевірки, і тест впаде з іншої причини.

Структура **Arrange – Act – Assert**: підготувати дані → викликати код → перевірити результат. Один тест — одна причина падіння.

## 4. Перевірки (matchers)

```ts
import { test, expect } from 'vitest';

test('toBe vs toEqual', () => {
  const a = { x: 1 };
  expect(a).toEqual({ x: 1 });
  expect(a).not.toBe({ x: 1 });
  expect(a).toBe(a);
});

test('toStrictEqual sees undefined fields', () => {
  expect({ a: 1, b: undefined }).toEqual({ a: 1 });
  expect({ a: 1, b: undefined }).not.toStrictEqual({ a: 1 });
});

test('floats', () => {
  expect(0.1 + 0.2).not.toBe(0.3);
  expect(0.1 + 0.2).toBeCloseTo(0.3);
});

test('truthiness and nullish', () => {
  expect(null).toBeNull();
  expect(undefined).toBeUndefined();
  expect('x').toBeDefined();
  expect(0).toBeFalsy();
  expect('a').toBeTruthy();
});

test('strings, arrays, objects', () => {
  expect('hello world').toContain('world');
  expect('hello world').toMatch(/^hello/);
  expect([1, 2, 3]).toContain(2);
  expect([{ id: 1 }]).toContainEqual({ id: 1 });
  expect([1, 2, 3]).toHaveLength(3);
  expect({ a: 1, b: 2 }).toHaveProperty('b', 2);
  expect({ a: 1, b: 2 }).toMatchObject({ a: 1 });
  expect(5).toBeGreaterThan(3);
  expect({ id: 7, name: 'x' }).toEqual({ id: expect.any(Number), name: 'x' });
});
```

Усі сім тестів зелені. Таблиця:

| Matcher | Сенс |
|---|---|
| `toBe(x)` | `Object.is` — для примітивів і **того самого** об'єкта за посиланням |
| `toEqual(x)` | глибоке порівняння; ігнорує поля зі значенням `undefined` |
| `toStrictEqual(x)` | глибоке порівняння, що **бачить** `undefined`-поля, розріджені масиви й клас об'єкта |
| `toBeCloseTo(x, digits = 2)` | числа з плаваючою крапкою; `0.1 + 0.2 !== 0.3` |
| `toBeNull`, `toBeUndefined`, `toBeDefined` | перевірка на `null` / `undefined` |
| `toBeTruthy`, `toBeFalsy` | приведення до булевого |
| `toContain(x)` | елемент масиву (за `===`) або підрядок |
| `toContainEqual(x)` | елемент масиву за глибоким порівнянням |
| `toHaveLength(n)` | довжина масиву чи рядка |
| `toHaveProperty(path, value?)` | наявність властивості (шлях `'a.b[0]'`) |
| `toMatchObject(obj)` | об'єкт містить принаймні ці поля |
| `toMatch(re \| str)` | рядок відповідає виразу |
| `toBeGreaterThan`, `toBeLessThan` (+`OrEqual`) | порівняння чисел |
| `toThrow(msg \| re \| Error)` | функція кидає виняток |
| `.not` | заперечення будь-якої перевірки |
| `expect.any(Type)` | «будь-яке значення цього типу» всередині `toEqual` |

Найчастіша помилка новачка — `toBe` для об'єктів і масивів: порівнюється посилання, тому `expect({x: 1}).toBe({x: 1})` падає. Для структур беріть `toEqual`.

Повідомлення про невдачу показує різницю:

```text
AssertionError: expected { a: 1, b: [ 1, 2 ] } to deeply equal { a: 1, b: [ 1, 3 ] }

- Expected
+ Received

  {
    "a": 1,
    "b": [
      1,
-     3,
+     2,
    ],
  }
```

`-` — очікувалось, `+` — отримано.

## 5. Хуки життєвого циклу

```ts
import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';

const log: string[] = [];

describe('hooks order', () => {
  beforeAll(() => log.push('beforeAll'));
  afterAll(() => {
    log.push('afterAll');
    console.log(log.join(' > '));
  });
  beforeEach(() => log.push('beforeEach'));
  afterEach(() => log.push('afterEach'));

  test('one', () => {
    log.push('test one');
    expect(true).toBe(true);
  });

  test('two', () => {
    log.push('test two');
    expect(true).toBe(true);
  });
});
```

Вивід:

```text
beforeAll > beforeEach > test one > afterEach > beforeEach > test two > afterEach > afterAll
```

| Хук | Коли виконується |
|---|---|
| `beforeAll` / `afterAll` | один раз до / після всіх тестів у `describe` (або файлі) |
| `beforeEach` / `afterEach` | до / після **кожного** тесту |

Хуки вкладених `describe` складаються: спершу зовнішній `beforeEach`, потім внутрішній. Тести мають бути **незалежними**: не покладайтесь на порядок і на стан, залишений попереднім тестом; все, що змінює тест, відновлюйте в `afterEach`.

## 6. Асинхронний код

```ts
export const getUser = async (id: number) => {
  if (id < 0) throw new Error('bad id');
  return { id, name: 'user' + id };
};
```

```ts
import { test, expect } from 'vitest';
import { getUser } from './async';

test('await result', async () => {
  const u = await getUser(1);
  expect(u).toEqual({ id: 1, name: 'user1' });
});

test('resolves / rejects', async () => {
  await expect(getUser(2)).resolves.toMatchObject({ id: 2 });
  await expect(getUser(-1)).rejects.toThrow('bad id');
});
```

Правила:
- тестова функція `async` (або повертає проміс) — Vitest дочекається завершення;
- `resolves` / `rejects` **обов'язково з `await`**, інакше тест завершиться раніше за перевірку й не впаде;
- помилку проміса перевіряють через `rejects.toThrow`, а не через `try/catch` без `expect.assertions`.

## 7. Моки: `vi.fn`, `vi.spyOn`, `vi.mock`

**Мок** замінює реальну залежність (мережу, БД, час, файлову систему), щоб тест був швидким, детермінованим і перевіряв лише свій код.

### 7.1. `vi.fn` — функція-шпигун

```ts
import { test, expect, vi } from 'vitest';
import { notify } from './mocks';

test('vi.fn records calls', () => {
  const fn = vi.fn();
  notify(fn, 2);
  expect(fn).toHaveBeenCalledTimes(2);
  expect(fn).toHaveBeenNthCalledWith(1, 'm0');
  expect(fn).toHaveBeenLastCalledWith('m1');
  expect(fn.mock.calls).toEqual([['m0'], ['m1']]);
});

test('vi.fn with implementation', () => {
  const fn = vi.fn((x: number) => x * 2);
  expect(fn(4)).toBe(8);
  fn.mockReturnValueOnce(100);
  expect(fn(4)).toBe(100);
  expect(fn(4)).toBe(8);
});
```

Обидва тести зелені. `vi.fn()` запам'ятовує всі виклики в `fn.mock.calls`; `mockReturnValue(x)`, `mockReturnValueOnce(x)`, `mockResolvedValue(x)`, `mockImplementation(f)` задають поведінку.

### 7.2. `vi.spyOn` — підмінити метод об'єкта і повернути назад

```ts
export const api = {
  fetchPrice: async (id: string) => 100,
};
export const total = async (ids: string[]) => {
  const prices = await Promise.all(ids.map(api.fetchPrice));
  return prices.reduce((a, b) => a + b, 0);
};
```

```ts
test('spyOn replaces a method and restores', async () => {
  const spy = vi.spyOn(api, 'fetchPrice').mockResolvedValue(5);
  expect(await total(['a', 'b'])).toBe(10);
  expect(spy).toHaveBeenCalledTimes(2);
  spy.mockRestore();
  expect(await total(['a', 'b'])).toBe(200);
});
```

`mockRestore()` повертає оригінальну реалізацію. Забутий `mockRestore` — типова причина «тести проходять окремо, але падають разом».

### 7.3. `vi.mock` — підмінити цілий модуль

```ts
import { greet } from './clock';
export const message = () => greet() + '!';
```

```ts
import { test, expect, vi } from 'vitest';
import { message } from './vimock';

vi.mock('./clock', () => ({ greet: () => 'mocked' }));

test('module is replaced', () => {
  expect(message()).toBe('mocked!');
});
```

Зелений. `vi.mock` **піднімається (hoisting) на початок файлу** ще до імпортів, тому підміна діє навіть там, де `import` стоїть вище. Фабрика не може посилатись на змінні файлу, оголошені звичайним `const` (вони ще не існують у момент підйому); для цього є `vi.hoisted`.

## 8. Таймери

```ts
export const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
export const delayed = async () => {
  await wait(1000);
  return 'done';
};
```

```ts
import { test, expect, vi, afterEach } from 'vitest';
import { delayed } from './async';

afterEach(() => {
  vi.useRealTimers();
});

test('fake timers skip the wait', async () => {
  vi.useFakeTimers();
  const p = delayed();
  await vi.advanceTimersByTimeAsync(1000);
  await expect(p).resolves.toBe('done');
});
```

Зелений за ~1 мс замість 1 с. `vi.useFakeTimers()` підміняє `setTimeout`, `setInterval`, `Date`; час рухається лише за командою (`advanceTimersByTime`, `runAllTimers`). Для коду з промісами використовуйте **`...Async`-варіанти**. Завжди повертайте справжні таймери в `afterEach`.

## 9. Знімки (snapshots)

```ts
test('inline snapshot', () => {
  expect({ a: 1, list: [1, 2] }).toMatchInlineSnapshot();
});
```

Під час першого прогону Vitest сам вписав значення у файл:

```ts
test('inline snapshot', () => {
  expect({ a: 1, list: [1, 2] }).toMatchInlineSnapshot(`
    {
      "a": 1,
      "list": [
        1,
        2,
      ],
    }
  `);
});
```

- `toMatchInlineSnapshot()` — знімок усередині тесту; `toMatchSnapshot()` — у файлі `__snapshots__/`.
- Подальші прогони порівнюють з записаним; при зміні тест падає. Оновити свідомо: `vitest run -u`.
- Знімки зручні для складних структур, але **великі знімки ніхто не читає**: перевіряйте конкретні поля, а знімок лишайте для невеликих стабільних виводів.

## 10. Пропуск, фокус, заглушки

| Запис | Дія |
|---|---|
| `test.skip(...)` | пропустити |
| `test.todo('назва')` | нагадування про майбутній тест |
| `test.only(...)` | запускати тільки цей тест у файлі |
| `describe.skip` / `describe.only` | те саме для групи |

Вивід: `↓ skipped`, `□ write later`, підсумок `1 passed | 1 skipped | 1 todo (3)`. Забутий `.only` у закомічених тестах мовчки вимикає решту — у CI його забороняють опцією `allowOnly: false`.

## 11. Конфігурація

Файл `vitest.config.ts` (або секція `test` у `vite.config.ts`):

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
```

| Опція | Сенс |
|---|---|
| `globals: true` | `test`, `expect`, `vi` доступні без `import` (перевірено: тест із глобальним `expect` пройшов). Для TypeScript додайте `"types": ["vitest/globals"]` у `tsconfig.json` |
| `environment` | `node` (за замовчуванням), `jsdom` або `happy-dom` для коду, що працює з DOM (потрібен окремий пакет) |
| `include` / `exclude` | які файли вважати тестами |
| `setupFiles` | файли, що виконуються перед кожним тестовим файлом |
| `coverage` | покриття коду (пакет `@vitest/coverage-v8`, запуск `vitest run --coverage`) |

Явні імпорти `import { test, expect } from 'vitest'` надійніші за глобальні — видно, звідки що береться, і не потрібні додаткові типи.

## 12. Що тестувати і як називати

- Тестуйте **поведінку** (вхід → вихід), а не внутрішню реалізацію: рефакторинг не має ламати тести.
- Назва тесту — речення про очікувану поведінку: `throws on zero`, а не `test1`.
- Краєві випадки: порожній вхід, `0`, `null`, межі діапазонів, помилкові дані.
- Мокайте **межі** системи (мережа, час, файли), але не власну логіку: надмір моків перевіряє самі моки.
- Тест, що ніколи не падає, марний: перед довірою переконайтесь, що він червоніє, коли код зламано.

## 13. Типові помилки

| Помилка | Наслідок |
|---|---|
| `toBe` для об'єктів | падає навіть при однаковому вмісті |
| `expect(fn(1, 0)).toThrow()` без стрілки | виняток вилітає до `expect` |
| `expect(p).resolves...` без `await` | тест зеленіє, не дочекавшись |
| не зроблено `mockRestore` / `useRealTimers` | вплив тесту на сусідні |
| `test.only` у коміті | решта тестів не запускається |
| знімок оновлено `-u` не дивлячись | зафіксовано баг як еталон |
