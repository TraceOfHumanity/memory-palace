# Seed-дані для fake API: детермінований генератор користувачів

## 1. Навіщо seed і чому «детермінований»

- Fake API потрібні «готові» користувачі при старті сервера. Seed — початковий набір даних.
- Хочемо **100 однакових користувачів при кожному запуску** (стабільні тести, однакові id/імена/паролі). `Math.random()` для цього не годиться: `Math.random() === Math.random()` → `false`, і не можна задати початкове значення.
- Рішення: власний **псевдовипадковий генератор (PRNG)** з початковим числом (seed = `42`). Те саме seed → та сама послідовність чисел → ті самі користувачі.
- Дані йдуть у `users.ts`: `new Map(usersSeed.map(u => [u.id, u]))` — `Map<id, User>`.

## 2. Типи (`types/user.ts`)

```ts
export type Gender = "male" | "female";
export interface User { id: string; name: string; age: number; gender: Gender;
  email: string; password: string; createdAt: string; updatedAt: string; }
```
`createdAt/updatedAt` — ISO-рядки. `id` — рядок («1», «2», …).

## 3. Константи

```ts
const USERS_COUNT = 100;      // скільки користувачів
const START_DATE = 0;         // 1970-01-01 (Unix epoch)
const END_DATE = Date.now();  // «зараз» у момент старту модуля
```
- Діапазон дат створення: від 1970 до моменту старту.
- Три масиви по 16 елементів: `MALE_NAMES`, `FEMALE_NAMES`, `LAST_NAMES` (англійські й українські: Oleksandr, Olena, Shevchenko…). Довжина 16 — збіг, код від неї не залежить (`items.length - 1`).

## 4. `createRandom(seed)` — генератор mulberry32

```ts
const createRandom = (seed: number) => () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
```
Це алгоритм **mulberry32** (Tommy Ettinger). Функція повертає функцію (замикання): `seed` живе всередині й змінюється при кожному виклику — це **стан генератора**.

Крок за кроком для `seed = 42`, перший виклик:

| крок | вираз | результат |
|---|---|---|
| 1 | `seed = (42 + 0x6d2b79f5) \| 0` (0x6d2b79f5 = 1831565813) | `1831565855` |
| 2 | `seed >>> 15` | `55894` |
| 3 | `seed ^ (seed >>> 15)` | `1831575625` |
| 4 | `1 \| seed` | `1831565855` (непарне число) |
| 5 | `t = Math.imul(1831575625, 1831565855)` | `65942231` |
| 6 | `t >>> 7` | `515173` |
| 7 | `t ^ (t >>> 7)` | `65662642` |
| 8 | `61 \| t` | `65942271` |
| 9 | `Math.imul(65662642, 65942271)` | `-1776318642` |
| 10 | `t = (t + …) ^ t` | `-1713141518` |
| 11 | `t >>> 14` | `157582` |
| 12 | `t ^ (t >>> 14)` | `-1713246340` |
| 13 | `(…) >>> 0` | `2581720956` |
| 14 | `/ 4294967296` (2³²) | `0.6011037519201636` |

Перші п'ять значень `createRandom(42)`: `0.6011037519201636, 0.44829055899754167, 0.8524657934904099, 0.6697340414393693, 0.17481389874592423`.

### Розбір операторів
- `0x6d2b79f5` — «золота» константа приросту (Weyl-послідовність): кожен виклик зсуває стан на стале число, тому стан проходить усі 2³² значень без повторів.
- `| 0` — привести до **32-бітного знакового** цілого. Без нього число росло б як double: `(2**31-1) + 0x6d2b79f5` = `3979049460` (а з `| 0` → `-315917836`) — переповнення «загортається» як у C.
- `Math.imul(a, b)` — множення **32-бітних** цілих із відсіканням старших бітів. Звичайне `a * b` дає double і втрачає точність вище 2⁵³.
- `>>>` — беззнаковий зсув вправо; `^` — XOR. Вони «перемішують» біти (avalanche): близькі стани дають далекі результати.
- `1 | seed`, `61 | t` — «OR» з маленьким числом робить множник непарним (обернений за модулем 2³² → множення не втрачає інформацію).
- `>>> 0` — перетворити знакове у беззнакове (0…4294967295).
- `/ 4294967296` — отримати число з `[0, 1)` (як `Math.random()`): ніколи не дорівнює 1.

### Якість
100 000 викликів `createRandom(1)` по 10 кошиках: `10044, 10036, 10001, 10116, 9906, 10052, 10076, 9896, 10006, 9867` — рівномірно (≈10 000 в кожному). Mulberry32 — не криптографічний! Для паролів реальних користувачів не використовувати.

## 5. Допоміжні функції

```ts
const random = createRandom(42);
const randomInt = (min, max) => min + Math.floor(random() * (max - min + 1));
const pick = <T>(items: readonly T[]): T => items[randomInt(0, items.length - 1)]!;
```
- `randomInt(min, max)` — ціле **включно** з обома межами. `random()*(max-min+1)` ∈ `[0, n)`, `floor` → `0…n-1`, `+min`. Приклад: 8 кидків `randomInt(1, 6)` при seed 42 → `4, 3, 6, 5, 2, 4, 2, 4`.
- `pick(items)` — випадковий елемент: індекс = `randomInt(0, length-1)`. Один виклик `random()`.
- `readonly T[]` — функція не змінює масив; `!` — «елемент точно є» (при `noUncheckedIndexedAccess` індекс повертає `T | undefined`).
- Важливо: **один спільний `random`** на весь модуль → кожен виклик зсуває стан, тож наступні значення залежать від усіх попередніх.

## 6. `randomPassword(length = 12)`

```ts
const chars = "abc…xyzABC…XYZ0123456789";                 // 62 символи
return Array.from({ length }, () => pick([...chars])).join("");
```
- `Array.from({ length: 12 }, fn)` — масив із 12 елементів, кожен — результат `fn()`.
- `[...chars]` — рядок розгортається в масив символів (створюється заново при кожному виклику — зайва робота; краще винести).
- 12 викликів `pick` = 12 викликів `random()`. Результат для користувача №2: `qM1Dp2UtmFQL`.
- Це **не безпечні паролі** — лише фейкові дані.

## 7. `generateUser(index)` — що відбувається на кожному кроці

Реальний прогін для `index = 2` (перший згенерований; john — №1). Лічильник `#n` — номер виклику `random()` від старту.

| # | код | `random()` | результат |
|---|---|---|---|
| 1 | `gender = random() < 0.5 ? "male" : "female"` | 0.6011 | `0.6011 < 0.5` ні → `"female"` |
| 2 | `firstName = pick(FEMALE_NAMES)` | 0.4483 | `floor(0.4483·16)=7` → `"Chloe"` |
| 3 | `lastName = pick(LAST_NAMES)` | 0.8525 | `floor(0.8525·16)=13` → `"Melnyk"` |
| 4 | `createdAt = randomInt(0, END)` | 0.6697 | `1200500123178` мс → `2008-01-16T16:15:23.178Z` |
| 5 | `updatedAt = randomInt(createdAt, END)` | 0.1748 | `1303990413606` → `2011-04-28T11:33:33.606Z` |
| 6 | `age: randomInt(18, 80)` | 0.5266 | `18 + floor(0.5266·63)` = `51` |
| 7–18 | `password: randomPassword()` | 12 значень | `"qM1Dp2UtmFQL"` |

Усього **18 викликів** `random()` на користувача (6 + 12).

Збирання об'єкта:
- `id: String(index)` — `"2"`.
- `name: \`${firstName} ${lastName}\`` — `"Chloe Melnyk"`.
- `email: \`${firstName}.${lastName}${index}@example.com\`.toLowerCase()` — `"chloe.melnyk2@example.com"`; `index` в кінці гарантує **унікальність** (100 унікальних email з 100 перевірено).
- `createdAt: new Date(createdAt).toISOString()` — число → ISO-рядок.
- Порядок обчислення в літералі об'єкта — зверху вниз: тому `age` (виклик 6) іде **перед** `password` (7–18). Змінити порядок полів — отримаєш інших користувачів!
- `updatedAt >= createdAt` завжди, бо `randomInt(createdAt, END)`. Перевірка по 100: порушень `0`.
- Типізація `gender: Gender` — щоб TypeScript не розширив до `string`.

Результат №2: `{ id:'2', name:'Chloe Melnyk', age:51, gender:'female', email:'chloe.melnyk2@example.com', password:'qM1Dp2UtmFQL', createdAt:'2008-01-16T16:15:23.178Z', updatedAt:'2011-04-28T11:33:33.606Z' }`.
№3: `Henry Melnyk, 19, male, henry.melnyk3@example.com, qdlWGbk0EYtB`. №100: `Henry Davis, 50, male, henry.davis100@example.com, rPyBidlBh8uo`.

## 8. Фіксований john і складання масиву

```ts
const john: User = { id: "1", name: "John Doe", age: 36, gender: "male",
  email: "john.doe@example.com", password: "password",
  createdAt: "2026-10-20T13:26:08.111Z", updatedAt: "2026-10-20T13:26:08.111Z" };

export const usersSeed: User[] = [
    john,
    ...Array.from({ length: USERS_COUNT - 1 }, (_, i) => generateUser(i + 2)),
];
```
- john — відомий тестовий користувач із простим паролем (зручно логінитись/писати тести). Він **не витрачає** `random()`.
- `Array.from({ length: 99 }, (_, i) => generateUser(i + 2))` — id від 2 до 100. `_` — ігнорований перший аргумент (значення), `i` — індекс.
- Spread `...` вставляє 99 елементів поруч із john → 100.
- Підсумок реального прогону: `usersSeed.length` = `100`, унікальних email `100`, чоловіків `58`, вік від `18` до `80`.

## 9. Типові помилки й нюанси

1. **`END_DATE = Date.now()`** — `createdAt/updatedAt` залежать від моменту запуску: `randomInt(0, END)` масштабує те саме `random()` на різний діапазон. Імена, вік, стать, паролі — стабільні, **дати — ні**. Для повної відтворюваності зафіксуй `END_DATE` константою.
2. `Math.random()` замість PRNG — кожен запуск інші дані.
3. Забути `| 0` або використати `*` замість `Math.imul` — інші числа/втрата точності, послідовність зламається.
4. Один спільний стан: додати новий виклик `random()` у `generateUser` (нове поле, інший порядок) → змінюються **усі** наступні користувачі.
5. Рівність `random() < 0.5` — приблизно 50/50 (58/42 на 100 — норма для малої вибірки).
6. Паролі й PRNG — не для безпеки (`crypto.randomBytes` / `crypto.getRandomValues` для справжніх).
7. Пароль у відкритому вигляді в `User` — лише в fake API; у справжньому — хеш (bcrypt/argon2). Тому існує `PublicUser = Omit<User, "password">`.
8. `[...chars]` в кожному виклику — зайве створення масиву; можна винести за межі.
9. `END_DATE` обчислюється **один раз** при завантаженні модуля, а не при кожному `generateUser`.

## 10. Як це використовується

`users.ts`: `export const users = new Map(usersSeed.map(u => [u.id, u]))` — індексація за `id` для швидкого `get/set/delete` в маршрутах `get-all`, `get-by-id`, `create`, `update`, `delete`. Seed виконується один раз при імпорті модуля; зміни живуть у пам'яті до перезапуску (`tsx watch` перезапускає при кожному збереженні файлу → seed знову).

## 11. Підсумковий алгоритм
1. Зафіксуй seed (42) і створи генератор `createRandom(42)`.
2. Обгорни його в `randomInt` (ціле в діапазоні) і `pick` (елемент масиву).
3. Для кожного індексу: стать → ім'я → прізвище → createdAt → updatedAt → вік → пароль.
4. Склади email з імені, прізвища й індексу — унікально.
5. Додай фіксованого john першим, потім 99 згенерованих.
6. Поклади в `Map` за `id`.

## Задачі для закріплення

26 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Код виконуйте в консолі браузера чи в Node.js 24.

### Рівень 1. Основи

**1.** Перші п'ять значень `createRandom(42)`.

```js
(() => {
const createRandom = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const r = createRandom(42);
return [r(), r(), r(), r(), r()];
})()
```

**2.** Чи однакова послідовність для однакового seed?

```js
(() => {
const createRandom = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const a = createRandom(7), b = createRandom(7);
return [a() === b(), a() === b(), a() === b()];
})()
```

**3.** Чи різна послідовність для різних seed?

```js
(() => {
const createRandom = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const a = createRandom(1), b = createRandom(2);
return [a() === b(), a(), b()];
})()
```

**4.** Діапазон значень: чи завжди `[0, 1)` (на 100 000 викликів)?

```js
(() => {
const createRandom = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const r = createRandom(1);
let lo = 1, hi = 0;
for (let i = 0; i < 100000; i++) { const v = r(); if (v < lo) lo = v; if (v > hi) hi = v; }
return [lo >= 0, hi < 1];
})()
```

**5.** Рівномірність: розподіл 100 000 значень по 10 кошиках.

```js
(() => {
const createRandom = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const r = createRandom(1);
const b = Array(10).fill(0);
for (let i = 0; i < 100000; i++) b[Math.floor(r() * 10)]++;
return b;
})()
```

**6.** Перший крок вручну для seed 42: `(seed + 0x6d2b79f5) | 0`.

```js
(() => {
const createRandom = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
return [(42 + 0x6d2b79f5) | 0, 0x6d2b79f5];
})()
```

**7.** Чому `| 0`? Порівняйте з додаванням без обрізання для великого seed.

```js
(() => {
const createRandom = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const s = 2147483647;
return [s + 0x6d2b79f5, (s + 0x6d2b79f5) | 0];
})()
```

### Рівень 2. Деталі й поведінка

**8.** `Math.imul` проти `*` для великих множників.

```js
(() => {
const createRandom = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const a = 1831575625, b = 1831565855;
return [a * b, Math.imul(a, b), Number.isSafeInteger(a * b)];
})()
```

**9.** `>>> 0` перетворює знакове число на беззнакове.

```js
(() => {
const createRandom = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
return [-1713246340 >>> 0, -1 >>> 0, (-1713246340 >>> 0) / 4294967296];
})()
```

**10.** Ділення на `4294967296` — чому результат ніколи не дорівнює 1?

```js
(() => {
const createRandom = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
return [4294967295 / 4294967296, 2 ** 32];
})()
```

**11.** `randomInt(min, max)` включно з межами: перевірте всі значення для діапазону 1..4.

```js
(() => {
const createRandom = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const r = createRandom(3);
const randomInt = (a, b) => a + Math.floor(r() * (b - a + 1));
const seen = new Set();
for (let i = 0; i < 1000; i++) seen.add(randomInt(1, 4));
return [...seen].sort();
})()
```

**12.** Помилка «off by one»: `Math.round` замість `Math.floor` змінює розподіл.

```js
(() => {
const createRandom = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const r = createRandom(5);
const cnt = { 0: 0, 1: 0, 2: 0 };
for (let i = 0; i < 30000; i++) cnt[Math.round(r() * 2)]++;
return [cnt[1] > cnt[0] * 1.5, cnt];
})()
```

**13.** `pick`: вибір елемента масиву та індекс для значення 0.4483 і 16 елементів.

```js
(() => {
const createRandom = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
return [Math.floor(0.4483 * 16), Math.floor(0.8525 * 16), Math.floor(0.9999 * 16)];
})()
```

**14.** Вік `randomInt(18, 80)` для `random() = 0.5266`.

```js
(() => {
const createRandom = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
return 18 + Math.floor(0.5266 * (80 - 18 + 1));
})()
```

### Рівень 3. Нюанси та пастки

**15.** Спільний `random` на модуль: додатковий виклик зсуває всі наступні значення.

```js
(() => {
const createRandom = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const a = createRandom(42), b = createRandom(42);
a();
return [a() === b(), b(), a()];
})()
```

**16.** Скільки різних значень у 100 000 викликів (перевірка періоду / повторів)?

```js
(() => {
const createRandom = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const r = createRandom(1);
const s = new Set();
for (let i = 0; i < 100000; i++) s.add(r());
return s.size;
})()
```

**17.** Генерація пароля з 62 символів і `Array.from`.

```js
(() => {
const createRandom = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const r = createRandom(42);
const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const pick = (a) => a[Math.floor(r() * a.length)];
const pw = () => Array.from({ length: 12 }, () => pick([...chars])).join('');
const p = pw();
return [chars.length, p.length, /^[a-zA-Z0-9]{12}$/.test(p)];
})()
```

**18.** Один виклик `pick` робить один виклик `random()`: лічильник викликів.

```js
(() => {
const createRandom = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
let calls = 0;
const base = createRandom(42);
const r = () => (calls++, base());
const pick = (a) => a[Math.floor(r() * a.length)];
for (let i = 0; i < 12; i++) pick('abcdef');
return calls;
})()
```

**19.** `randomInt(createdAt, END)` дає `updatedAt >= createdAt`: перевірка на 1000 пар.

```js
(() => {
const createRandom = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const r = createRandom(9);
const randomInt = (a, b) => a + Math.floor(r() * (b - a + 1));
let bad = 0;
for (let i = 0; i < 1000; i++) { const c = randomInt(0, 1.7e12); const u = randomInt(c, 1.7e12); if (u < c) bad++; }
return bad;
})()
```

**20.** Дати від 0 до `END`: першим значенням для seed 42 і `END = 1.8e12`.

```js
(() => {
const createRandom = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const r = createRandom(42);
const randomInt = (a, b) => a + Math.floor(r() * (b - a + 1));
r();
r();
const t = randomInt(0, 1.8e12);
return [t, new Date(t).toISOString()];
})()
```

**21.** Унікальність email: `ім'я.прізвище+index@example.com` в нижньому регістрі.

```js
(() => {
const createRandom = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const mail = (f, l, i) => `${f}.${l}${i}@example.com`.toLowerCase();
return [mail('Chloe', 'Melnyk', 2), mail('Henry', 'Melnyk', 3), mail('Chloe', 'Melnyk', 2) === mail('Chloe', 'Melnyk', 2)];
})()
```

### Рівень 4. Практика

**22.** `Array.from({ length: 99 }, (_, i) => i + 2)`: перший і останній id.

```js
(() => {
const createRandom = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const ids = Array.from({ length: 99 }, (_, i) => i + 2);
return [ids.length, ids[0], ids.at(-1), [1, ...ids].length];
})()
```

**23.** Ключі `Map` за `id` та швидкий доступ.

```js
(() => {
const createRandom = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const users = [{ id: '1', n: 'john' }, { id: '2', n: 'ann' }];
const m = new Map(users.map(u => [u.id, u]));
return [m.size, m.get('2').n, m.has('3')];
})()
```

**24.** Що таке PRNG і чому seed робить його детермінованим?

**25.** Чому такий генератор не можна використовувати для паролів і безпеки?

**26.** Чому `END_DATE = Date.now()` порушує повну детермінованість?

### Відповіді

1. `[0.6011037519201636, 0.44829055899754167, 0.8524657934904099, 0.6697340414393693, 0.17481389874592423]`
2. `[true, true, true]`
3. `[false, 0.002735721180215478, 0.32499843230471015]`
4. `[true, true]`
5. `[10044, 10036, 10001, 10116, 9906, 10052, 10076, 9896, 10006, 9867]`
6. `[1831565855, 1831565813]`
7. `[3979049460, -315917836]`
8. `[3354651375600284000, 65942231, false]`
9. `[2581720956, 4294967295, 0.6011037519201636]`
10. `[0.9999999997671694, 4294967296]`
11. `[1, 2, 3, 4]`
12. `[true, { '0': 7415, '1': 15111, '2': 7474 }]`
13. `[7, 13, 15]`
14. `51`
15. `[false, 0.44829055899754167, 0.8524657934904099]`
16. `99999`
17. `[62, 12, true]`
18. `12`
19. `0`
20. `[1534438428283, '2018-08-16T16:53:48.283Z']`
21. `['chloe.melnyk2@example.com', 'henry.melnyk3@example.com', true]`
22. `[99, 2, 100, 100]`
23. `[2, 'ann', false]`
24. Псевдовипадковий генератор обчислює наступне число з попереднього стану за формулою; той самий початковий seed завжди дає ту саму послідовність, що корисно для відтворюваних тестових даних
25. Послідовність передбачувана за seed або кількома виходами; для безпеки потрібні криптографічні джерела (`crypto.randomBytes`, `crypto.getRandomValues`)
26. Діапазон дат залежить від моменту запуску, тож ті самі `random()` дають різні `createdAt`/`updatedAt`; для стабільності слід зафіксувати кінцеву дату
