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

## Задачі для закріплення

42 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Кожен фрагмент — повний файл `*.test.ts`; запуск `npx vitest run`; у відповіді `✓` — тест пройдено, `✗` — провалено (з початком повідомлення), `○` — пропущено.

### Рівень 1. Основи

**1.** Який результат у двох простих тестів (`toBe`)?

```ts
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, test } from 'vitest';
it('додає', () => { expect(1 + 2).toBe(3); });
it('віднімає', () => { expect(5 - 2).toBe(4); });
```

**2.** `toBe` проти `toEqual` для об'єктів.

```ts
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, test } from 'vitest';
it('toBe', () => { expect({ a: 1 }).toBe({ a: 1 }); });
it('toEqual', () => { expect({ a: 1 }).toEqual({ a: 1 }); });
```

**3.** `toEqual` ігнорує `undefined`-поля, `toStrictEqual` — ні.

```ts
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, test } from 'vitest';
it('toEqual', () => { expect({ a: 1, b: undefined }).toEqual({ a: 1 }); });
it('toStrictEqual', () => { expect({ a: 1, b: undefined }).toStrictEqual({ a: 1 }); });
```

**4.** Числа з плаваючою точкою: `toBe` проти `toBeCloseTo`.

```ts
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, test } from 'vitest';
it('toBe', () => { expect(0.1 + 0.2).toBe(0.3); });
it('toBeCloseTo', () => { expect(0.1 + 0.2).toBeCloseTo(0.3); });
```

**5.** Перевірки правдивості: `toBeTruthy`, `toBeFalsy`, `toBeNull`, `toBeUndefined`, `toBeDefined`.

```ts
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, test } from 'vitest';
it('truthy', () => { expect('a').toBeTruthy(); expect(0).toBeFalsy(); });
it('null', () => { expect(null).toBeNull(); expect(undefined).toBeNull(); });
it('undefined', () => { expect(undefined).toBeUndefined(); expect(null).toBeDefined(); });
```

**6.** Рядки та регулярні вирази: `toMatch`, `toContain`.

```ts
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, test } from 'vitest';
it('match', () => { expect('hello world').toMatch(/wor/); });
it('contain', () => { expect('hello').toContain('ell'); });
it('no match', () => { expect('hello').toMatch(/xyz/); });
```

**7.** Масиви: `toContain`, `toHaveLength`, `toContainEqual`.

```ts
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, test } from 'vitest';
it('contain', () => { expect([1, 2, 3]).toContain(2); });
it('length', () => { expect([1, 2, 3]).toHaveLength(2); });
it('containEqual', () => { expect([{ a: 1 }]).toContainEqual({ a: 1 }); });
```

**8.** Об'єкти: `toHaveProperty` та `toMatchObject`.

```ts
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, test } from 'vitest';
it('prop', () => { expect({ a: { b: 2 } }).toHaveProperty('a.b', 2); });
it('matchObject', () => { expect({ a: 1, b: 2, c: 3 }).toMatchObject({ a: 1, b: 2 }); });
it('matchObject fail', () => { expect({ a: 1 }).toMatchObject({ a: 2 }); });
```

**9.** Винятки: `toThrow` із повідомленням і без.

```ts
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, test } from 'vitest';
const f = () => { throw new Error('boom'); };
it('throws', () => { expect(f).toThrow(); });
it('message', () => { expect(f).toThrow('boom'); });
it('wrong', () => { expect(f).toThrow('bang'); });
it('not called', () => { expect(f()).toThrow(); });
```

**10.** Заперечення `.not`.

```ts
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, test } from 'vitest';
it('not', () => { expect(1).not.toBe(2); });
it('not fail', () => { expect(1).not.toBe(1); });
```

**11.** Порівняння чисел: `toBeGreaterThan`, `toBeLessThanOrEqual`.

```ts
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, test } from 'vitest';
it('gt', () => { expect(5).toBeGreaterThan(3); });
it('lte', () => { expect(5).toBeLessThanOrEqual(4); });
```

### Рівень 2. Деталі й поведінка

**12.** Порядок хуків: `beforeAll`, `beforeEach`, `afterEach`, `afterAll`.

```ts
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, test } from 'vitest';
const log: string[] = [];
beforeAll(() => log.push('beforeAll'));
beforeEach(() => log.push('beforeEach'));
afterEach(() => log.push('afterEach'));
afterAll(() => { console.log(JSON.stringify(log)); });
it('one', () => { log.push('one'); });
it('two', () => { log.push('two'); expect(log).toEqual(['beforeAll', 'beforeEach', 'one', 'afterEach', 'beforeEach', 'two']); });
```

**13.** `describe` групує тести; повні назви в звіті.

```ts
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, test } from 'vitest';
describe('Калькулятор', () => {
  describe('додавання', () => {
    it('рахує', () => { expect(1 + 1).toBe(2); });
  });
  it('ділить на нуль', () => { expect(1 / 0).toBe(Infinity); });
});
```

**14.** Спільний стан між тестами без `beforeEach` (пастка залежності від порядку).

```ts
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, test } from 'vitest';
let n = 0;
it('перший', () => { n++; expect(n).toBe(1); });
it('другий', () => { n++; expect(n).toBe(1); });
```

**15.** Скидання стану через `beforeEach`.

```ts
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, test } from 'vitest';
let n = 0;
beforeEach(() => { n = 0; });
it('перший', () => { n++; expect(n).toBe(1); });
it('другий', () => { n++; expect(n).toBe(1); });
```

**16.** Асинхронний тест: `async/await` та `resolves`.

```ts
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, test } from 'vitest';
const get = () => Promise.resolve(42);
it('await', async () => { expect(await get()).toBe(42); });
it('resolves', async () => { await expect(get()).resolves.toBe(42); });
it('wrong', async () => { await expect(get()).resolves.toBe(0); });
```

**17.** Відхилений promise: `rejects`.

```ts
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, test } from 'vitest';
const fail = () => Promise.reject(new Error('nope'));
it('rejects', async () => { await expect(fail()).rejects.toThrow('nope'); });
it('без await', async () => { expect(fail()).rejects.toThrow('nope'); });
```

**18.** Тест без `await` на `resolves` може «пройти» помилково?

```ts
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, test } from 'vitest';
it('забули await', () => { expect(Promise.resolve(1)).resolves.toBe(2); });
```

**19.** Тайм-аут тесту.

```ts
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, test } from 'vitest';
it('повільний', async () => { await new Promise(r => setTimeout(r, 200)); }, 50);
it('швидкий', async () => { await new Promise(r => setTimeout(r, 10)); }, 500);
```

**20.** `vi.fn()`: виклики та аргументи.

```ts
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, test } from 'vitest';
it('mock', () => {
  const fn = vi.fn();
  fn(1, 'a');
  fn(2);
  expect(fn).toHaveBeenCalledTimes(2);
  expect(fn).toHaveBeenCalledWith(1, 'a');
  expect(fn).toHaveBeenLastCalledWith(2);
  expect(fn.mock.calls).toEqual([[1, 'a'], [2]]);
});
```

**21.** `mockReturnValue`, `mockImplementation`, `mockReturnValueOnce`.

```ts
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, test } from 'vitest';
it('returns', () => {
  const fn = vi.fn().mockReturnValueOnce('first').mockReturnValue('rest');
  expect([fn(), fn(), fn()]).toEqual(['first', 'rest', 'rest']);
});
it('impl', () => {
  const fn = vi.fn((a: number) => a * 2);
  expect(fn(4)).toBe(8);
  fn.mockImplementation((a: number) => a + 1);
  expect(fn(4)).toBe(5);
});
```

**22.** `vi.spyOn` та відновлення оригіналу.

```ts
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, test } from 'vitest';
const obj = { greet: () => 'hello' };
it('spy', () => {
  const spy = vi.spyOn(obj, 'greet').mockReturnValue('mocked');
  expect(obj.greet()).toBe('mocked');
  spy.mockRestore();
  expect(obj.greet()).toBe('hello');
});
```

### Рівень 3. Нюанси та пастки

**23.** Без `mockRestore` підміна переживає тест.

```ts
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, test } from 'vitest';
const obj = { v: () => 1 };
it('перший підміняє', () => { vi.spyOn(obj, 'v').mockReturnValue(99); expect(obj.v()).toBe(99); });
it('другий бачить підміну', () => { expect(obj.v()).toBe(1); });
```

**24.** `vi.mock` підміняє модуль (мок `node:os`).

```ts
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, test } from 'vitest';
vi.mock('node:os', () => ({ default: { hostname: () => 'fake-host' }, hostname: () => 'fake-host' }));
import { hostname } from 'node:os';
it('mocked', () => { expect(hostname()).toBe('fake-host'); });
```

**25.** `vi.fn` як колбек: перевірка порядку викликів `mock.invocationCallOrder`.

```ts
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, test } from 'vitest';
it('order', () => {
  const a = vi.fn(), b = vi.fn();
  b(); a(); b();
  expect(a.mock.invocationCallOrder[0]).toBeGreaterThan(b.mock.invocationCallOrder[0]);
  expect(b.mock.invocationCallOrder.length).toBe(2);
});
```

**26.** Фейкові таймери: `vi.useFakeTimers` та `advanceTimersByTime`.

```ts
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, test } from 'vitest';
afterEach(() => { vi.useRealTimers(); });
it('timer', () => {
  vi.useFakeTimers();
  const cb = vi.fn();
  setTimeout(cb, 1000);
  vi.advanceTimersByTime(999);
  expect(cb).not.toHaveBeenCalled();
  vi.advanceTimersByTime(1);
  expect(cb).toHaveBeenCalledTimes(1);
});
```

**27.** Фейкові таймери: `setInterval` та `runOnlyPendingTimers`.

```ts
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, test } from 'vitest';
afterEach(() => { vi.useRealTimers(); });
it('interval', () => {
  vi.useFakeTimers();
  const cb = vi.fn();
  setInterval(cb, 100);
  vi.advanceTimersByTime(350);
  expect(cb).toHaveBeenCalledTimes(3);
});
```

**28.** `vi.setSystemTime`: фіксований час.

```ts
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, test } from 'vitest';
afterEach(() => { vi.useRealTimers(); });
it('date', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2024-05-01T12:00:00Z'));
  expect(new Date().toISOString()).toBe('2024-05-01T12:00:00.000Z');
  expect(Date.now()).toBe(1714564800000);
});
```

**29.** Інлайн-знімок `toMatchInlineSnapshot`.

```ts
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, test } from 'vitest';
it('snapshot', () => {
  expect({ a: 1, b: [1, 2] }).toMatchInlineSnapshot(`
    {
      "a": 1,
      "b": [
        1,
        2,
      ],
    }
  `);
});
it('snapshot fail', () => {
  expect({ a: 2 }).toMatchInlineSnapshot(`
    {
      "a": 1,
    }
  `);
});
```

**30.** `it.skip`, `it.todo`, `it.only`.

```ts
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, test } from 'vitest';
it('виконується', () => { expect(1).toBe(1); });
it.skip('пропущений', () => { expect(1).toBe(2); });
it.todo('майбутній');
```

**31.** `it.each`: параметризовані тести.

```ts
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, test } from 'vitest';
it.each([[1, 1, 2], [2, 3, 5], [2, 2, 5]])('%i + %i = %i', (a, b, sum) => { expect(a + b).toBe(sum); });
```

**32.** `describe.each` з об'єктами.

```ts
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, test } from 'vitest';
describe.each([{ n: 2, sq: 4 }, { n: 3, sq: 9 }])('квадрат $n', ({ n, sq }) => {
  it('рахує', () => { expect(n * n).toBe(sq); });
});
```

**33.** `expect.assertions` та перевірка, що колбек викликався.

```ts
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, test } from 'vitest';
it('assertions', async () => {
  expect.assertions(2);
  await Promise.resolve();
  expect(1).toBe(1);
});
```

### Рівень 4. Практика

**34.** `expect.any` та `expect.objectContaining`.

```ts
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, test } from 'vitest';
it('asymmetric', () => {
  expect({ id: 5, name: 'x', extra: true }).toEqual(expect.objectContaining({ id: expect.any(Number), name: 'x' }));
  expect([1, 'a']).toEqual([expect.any(Number), expect.any(String)]);
});
```

**35.** Помилка в `beforeEach` провалює тест.

```ts
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, test } from 'vitest';
beforeEach(() => { throw new Error('setup failed'); });
it('не виконується', () => { expect(1).toBe(1); });
```

**36.** Невикористана змінна й помилка типів не заважають запуску (Vitest не перевіряє типи).

```ts
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, test } from 'vitest';
it('types are not checked', () => {
  const n: number = 'text' as any;
  expect(typeof n).toBe('string');
});
```

**37.** Тестування чистої функції: таблиця крайових випадків.

```ts
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, test } from 'vitest';
const clamp = (x: number, lo: number, hi: number) => Math.min(Math.max(x, lo), hi);
describe('clamp', () => {
  it('усередині', () => { expect(clamp(5, 0, 10)).toBe(5); });
  it('нижче', () => { expect(clamp(-5, 0, 10)).toBe(0); });
  it('вище', () => { expect(clamp(50, 0, 10)).toBe(10); });
  it('рівні межі', () => { expect(clamp(10, 0, 10)).toBe(10); });
});
```

**38.** Тест класу з внутрішнім станом.

```ts
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, test } from 'vitest';
class Counter { n = 0; inc() { this.n++; return this; } }
it('ланцюжок', () => { expect(new Counter().inc().inc().n).toBe(2); });
it('екземпляри незалежні', () => { const a = new Counter(), b = new Counter(); a.inc(); expect(b.n).toBe(0); });
```

**39.** Що таке unit-тест?

**40.** Чим мок відрізняється від шпигуна (spy)?

**41.** Чому тести мають бути незалежними?

**42.** Що таке покриття коду і чи гарантує воно якість?

### Відповіді

1. Вивід:

   ```text
   ✓ додає
   ✗ віднімає — expected 3 to be 4 // Object.is equality
   ```

2. Вивід:

   ```text
   ✗ toBe — expected { a: 1 } to be { a: 1 } // Object.is equality
   ✓ toEqual
   ```

3. Вивід:

   ```text
   ✓ toEqual
   ✗ toStrictEqual — expected { a: 1, b: undefined } to strictly equal { a: 1 }
   ```

4. Вивід:

   ```text
   ✗ toBe — expected 0.30000000000000004 to be 0.3 // Object.is equality
   ✓ toBeCloseTo
   ```

5. Вивід:

   ```text
   ✓ truthy
   ✗ null — expected undefined to be null
   ✓ undefined
   ```

6. Вивід:

   ```text
   ✓ match
   ✓ contain
   ✗ no match — expected 'hello' to match /xyz/
   ```

7. Вивід:

   ```text
   ✓ contain
   ✗ length — expected [ 1, 2, 3 ] to have a length of 2 but got 3
   ✓ containEqual
   ```

8. Вивід:

   ```text
   ✓ prop
   ✓ matchObject
   ✗ matchObject fail — expected { a: 1 } to match object { a: 2 }
   ```

9. Вивід:

   ```text
   ✓ throws
   ✓ message
   ✗ wrong — expected [Function f] to throw error including 'bang' but got 'boom'
   ✗ not called — boom
   ```

10. Вивід:

   ```text
   ✓ not
   ✗ not fail — expected 1 not to be 1 // Object.is equality
   ```

11. Вивід:

   ```text
   ✓ gt
   ✗ lte — expected 5 to be less than or equal to 4
   ```

12. Вивід:

   ```text
   ✓ one
   ✓ two
   ```

13. Вивід:

   ```text
   ✓ Калькулятор додавання рахує
   ✓ Калькулятор ділить на нуль
   ```

14. Вивід:

   ```text
   ✓ перший
   ✗ другий — expected 2 to be 1 // Object.is equality
   ```

15. Вивід:

   ```text
   ✓ перший
   ✓ другий
   ```

16. Вивід:

   ```text
   ✓ await
   ✓ resolves
   ✗ wrong — expected 42 to be +0 // Object.is equality
   ```

17. Вивід:

   ```text
   ✓ rejects
   ✗ без await — Promise returned by `expect(actual).rejects.toThrow(expected)` was not awaited. This assertion is asynchronous
   ```

18. `✗ забули await — expected 1 to be 2 // Object.is equality`
19. Вивід:

   ```text
   ✗ повільний — Test timed out in 50ms.
   ✓ швидкий
   ```

20. `✓ mock`
21. Вивід:

   ```text
   ✓ returns
   ✓ impl
   ```

22. `✓ spy`
23. Вивід:

   ```text
   ✓ перший підміняє
   ✗ другий бачить підміну — expected 99 to be 1 // Object.is equality
   ```

24. `✓ mocked`
25. `✓ order`
26. `✓ timer`
27. `✓ interval`
28. `✓ date`
29. Вивід:

   ```text
   ✓ snapshot
   ✗ snapshot fail — Snapshot `snapshot fail 1` mismatched
   ```

30. Вивід:

   ```text
   ✓ виконується
   ○ пропущений — skipped
   ○ майбутній — todo
   ```

31. Вивід:

   ```text
   ✓ 1 + 1 = 2
   ✓ 2 + 3 = 5
   ✗ 2 + 2 = 5 — expected 4 to be 5 // Object.is equality
   ```

32. Вивід:

   ```text
   ✓ квадрат 2 рахує
   ✓ квадрат 3 рахує
   ```

33. `✗ assertions — expected number of assertions to be 2, but got 1`
34. `✓ asymmetric`
35. `✗ не виконується — setup failed`
36. `✓ types are not checked`
37. Вивід:

   ```text
   ✓ clamp усередині
   ✓ clamp нижче
   ✓ clamp вище
   ✓ clamp рівні межі
   ```

38. Вивід:

   ```text
   ✓ ланцюжок
   ✓ екземпляри незалежні
   ```

39. Автоматична перевірка однієї невеликої одиниці коду (функції, класу) ізольовано від решти системи, з чітким очікуваним результатом
40. Мок повністю замінює реалізацію контрольованою заглушкою; spy обгортає реальну функцію, записуючи виклики, і за потреби може викликати оригінал
41. Залежність від порядку виконання або спільного стану робить збої нестабільними й складними для діагностики; кожен тест готує власні дані (`beforeEach`)
42. Частка рядків/гілок, виконаних тестами; висока цифра не гарантує коректних перевірок — важливі осмислені твердження та крайові випадки
