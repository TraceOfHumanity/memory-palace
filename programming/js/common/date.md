# Date — дата й час у JavaScript

> Примітка про часові пояси: результати деяких рядків нижче залежать від часового поясу машини. Там, де це так, у коментарі вказано «(TZ)». Приклади підібрано так, щоб більшість виводів були однаковими в будь-якому поясі; перевірити можна так: `TZ=UTC node script.js`.

## 1. Що таке Date

`Date` — вбудований об'єкт для роботи з моментом у часі. Усередині це одне число: кількість мілісекунд від 1 січня 1970 00:00:00 UTC (Unix epoch, «unix time» у мілісекундах). Часовий пояс не зберігається: `Date` — це момент на осі часу, а «рік-місяць-день-година» з'являються лише під час відображення (у локальному поясі або в UTC).

Наслідки:

- два `Date` з однаковим числом — один і той самий момент, незалежно від того, як їх показують;
- `Date` мутабельний (`setX` змінюють об'єкт), на відміну від примітивів;
- діапазон: ±8 640 000 000 000 000 мс від епохи (≈ ±273 790 років).

```js
const moment = new Date(0);
console.log(moment.getTime()); // 0 — початок епохи
console.log(moment.toISOString()); // 1970-01-01T00:00:00.000Z
console.log(typeof moment); // object

console.log(new Date(8.64e15).toISOString()); // +275760-09-13T00:00:00.000Z — межа
console.log(new Date(8.64e15 + 1).getTime()); // NaN — поза діапазоном
```

## 2. Створення дати

```js
// 2.1. Поточний момент
const now = new Date();
console.log(now instanceof Date); // true
console.log(typeof Date.now()); // number — мілісекунди без створення об'єкта

// 2.2. З мілісекунд від епохи
console.log(new Date(1_700_000_000_000).toISOString()); // 2023-11-14T22:13:20.000Z

// 2.3. З рядка (розділ 3 — тут підводні камені!)
console.log(new Date("2024-03-15T10:30:00Z").toISOString()); // 2024-03-15T10:30:00.000Z

// 2.4. З компонентів (ЛОКАЛЬНИЙ час!)
// new Date(рік, місяць(0-11!), день, години, хвилини, секунди, мс)
const local = new Date(2024, 2, 15, 10, 30); // 2 = березень
console.log(local.getMonth()); // 2 — місяці рахуються з 0
console.log(local.getFullYear(), local.getDate(), local.getHours()); // 2024 15 10

// 2.5. З компонентів у UTC
console.log(new Date(Date.UTC(2024, 2, 15, 10, 30)).toISOString());
// 2024-03-15T10:30:00.000Z
console.log(Date.UTC(2024, 0, 1)); // 1704067200000 — повертає число, не Date

// 2.6. Копія іншої дати
const original = new Date(2024, 0, 1);
const copy = new Date(original); // або new Date(original.getTime())
copy.setFullYear(2030);
console.log(original.getFullYear()); // 2024 — оригінал не змінено

// 2.7. Виклик Date() без new повертає рядок, а не об'єкт
console.log(typeof Date()); // string
console.log(typeof new Date()); // object

// 2.8. Особливість двозначного року: 0–99 → 1900–1999
console.log(new Date(99, 0, 1).getFullYear()); // 1999
console.log(new Date(2099, 0, 1).getFullYear()); // 2099
console.log(new Date("0099-01-01T00:00:00Z").getUTCFullYear()); // 99
```

## 3. Парсинг рядків — найбільше пасток

Надійний формат — ISO 8601, визначений специфікацією:

- `"YYYY-MM-DD"` → дата без часу інтерпретується як UTC;
- `"YYYY-MM-DDTHH:mm:ss"` → без `"Z"`/зсуву інтерпретується як локальний час;
- `"YYYY-MM-DDTHH:mm:ssZ"` → UTC;
- `"…+02:00"` → із явним зсувом.

Усі інші формати (`"March 15, 2024"`, `"15/03/2024"`) — implementation-defined: різні рушії можуть давати різні результати.

```js
// 3.1. Різниця між форматами — класична пастка
const dateOnly = new Date("2024-03-15"); // UTC-північ
const dateTime = new Date("2024-03-15T00:00:00"); // локальна північ
console.log(dateOnly.toISOString()); // 2024-03-15T00:00:00.000Z
// dateTime.toISOString() залежить від поясу (TZ): у UTC — те саме,
// у Києві (UTC+2/+3) — 2024-03-14T22:00:00.000Z
console.log(dateOnly.getTime() === dateTime.getTime()); // (TZ) true лише у UTC

// Наслідок: у поясах "західніше UTC" new Date("2024-03-15").getDate()
// може повернути 14, бо локальний день ще не настав.

// 3.2. Явний зсув — недвозначно
console.log(new Date("2024-03-15T12:00:00+02:00").toISOString());
// 2024-03-15T10:00:00.000Z

// 3.3. Дата з дефісами і зі скісними рисками — різні шляхи
// "2024/03/15" (нестандартний) трактується як локальний час, а
// "2024-03-15" — як UTC. Уникайте нестандартних форматів.

// 3.4. Date.parse повертає число (мс) або NaN
console.log(Date.parse("2024-03-15T00:00:00Z")); // 1710460800000
console.log(Date.parse("це не дата")); // NaN

// 3.5. Місяць 13 і день 32 у ISO-рядку — недійсні (не "перекочуються")
console.log(new Date("2024-13-01").getTime()); // NaN
console.log(new Date("2024-02-30").getTime()); // 1709251200000 — V8 перекочує на 1 березня!
// Місяць 13 відхиляється, а "30 лютого" — ні: поведінка залежить від
// рушія (у Firefox/Safari 2024-02-30 — Invalid Date). Не покладайтесь
// на це: валідуйте дату самостійно. У конструкторі з компонентів
// надлишок перекочується за специфікацією (розділ 6).
```

## 4. Invalid Date

```js
const bad = new Date("сміття");
console.log(bad.toString()); // Invalid Date
console.log(bad.getTime()); // NaN
console.log(bad instanceof Date); // true — це все ще Date, але "порожній"
console.log(isNaN(bad)); // true — isNaN приводить Date до числа
console.log(Number.isNaN(bad.getTime())); // true — явніше

// Багато методів для Invalid Date не кидають помилку, а повертають NaN.
// Виняток — toISOString, який кидає RangeError:
try {
  bad.toISOString();
} catch (err) {
  console.log(err.name + ":", err.message); // RangeError: Invalid time value
}
console.log(JSON.stringify({ d: bad })); // {"d":null} — toJSON повертає null

// Надійна перевірка валідності:
const isValidDate = (d) => d instanceof Date && !Number.isNaN(d.getTime());
console.log(isValidDate(new Date()), isValidDate(bad)); // true false
```

## 5. Геттери та сеттери: локальний час і UTC

Кожному методу відповідає UTC-двійник: `getHours` / `getUTCHours`. Лише локальні методи залежать від поясу (TZ).

```js
const d = new Date(Date.UTC(2024, 2, 15, 10, 30, 45, 123)); // 15 березня 2024, п'ятниця

// UTC-варіанти (однакові скрізь):
console.log(d.getUTCFullYear()); // 2024
console.log(d.getUTCMonth()); // 2 — березень (0–11)
console.log(d.getUTCDate()); // 15 — день місяця (1–31)
console.log(d.getUTCDay()); // 5 — день тижня (0 = неділя, 6 = субота)
console.log(d.getUTCHours()); // 10
console.log(d.getUTCMinutes()); // 30
console.log(d.getUTCSeconds()); // 45
console.log(d.getUTCMilliseconds()); // 123

// Локальні: getFullYear, getMonth, getDate, getDay, getHours, ...
// Різниця між локальним і UTC-часом у хвилинах:
console.log(typeof d.getTimezoneOffset()); // number
// getTimezoneOffset() = UTC − локальний: для UTC+2 повертає -120 (мінус!),
// для UTC−5 (Нью-Йорк взимку) — 300.

// Сеттери мутують об'єкт і повертають нове значення часу (мс):
const s = new Date(Date.UTC(2024, 0, 31));
console.log(s.setUTCMonth(1)); // 1709337600000 — це 2 березня, а не кінець лютого!
// (31 січня → "31 лютого" → перекочується на 2 березня; див. розділ 6)
```

Плутанина, яку варто запам'ятати:

- `getDate()` — число місяця (1–31); `getDay()` — день тижня (0–6);
- `getYear()` — застарілий, повертає рік − 1900; користуйтесь `getFullYear`;
- `getMonth()` — 0–11 (січень = 0);
- `getTime()` / `valueOf()` — мс від епохи.

## 6. Перекочування (overflow): властивість, а не помилка

Значення поза діапазоном не викликають помилку, а переносяться у сусідні одиниці. Це зручно для арифметики, але легко помилитись.

```js
const roll = new Date(Date.UTC(2024, 0, 31)); // 31 січня 2024
roll.setUTCMonth(1); // місяць = лютий (2024 — високосний, 29 днів)
console.log(roll.toISOString()); // 2024-03-02T00:00:00.000Z — 31 лют = 2 березня

console.log(new Date(Date.UTC(2024, 12, 1)).toISOString());
// 2025-01-01T00:00:00.000Z — місяць 12 = січень наступного року
console.log(new Date(Date.UTC(2024, 0, 32)).toISOString());
// 2024-02-01T00:00:00.000Z — день 32 січня = 1 лютого
console.log(new Date(Date.UTC(2024, 0, 0)).toISOString());
// 2023-12-31T00:00:00.000Z — день 0 = останній день попереднього місяця
console.log(new Date(Date.UTC(2024, 0, 1, 25)).toISOString());
// 2024-01-02T01:00:00.000Z — 25 година

// 6.1. Кількість днів у місяці (день 0 наступного місяця)
const daysInMonth = (year, month) => new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
console.log(daysInMonth(2024, 1)); // 29 — лютий 2024 (високосний)
console.log(daysInMonth(2023, 1)); // 28
console.log(daysInMonth(2024, 3)); // 30 — квітень

// 6.2. Високосний рік
const isLeapYear = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
console.log(isLeapYear(2024), isLeapYear(1900), isLeapYear(2000)); // true false true

// 6.3. Безпечне додавання місяців без "перескоку" на наступний місяць
function addMonths(date, n) {
  const result = new Date(date);
  const day = result.getUTCDate();
  result.setUTCDate(1); // спершу на 1-ше число, щоб уникнути переповнення
  result.setUTCMonth(result.getUTCMonth() + n);
  const maxDay = daysInMonth(result.getUTCFullYear(), result.getUTCMonth());
  result.setUTCDate(Math.min(day, maxDay)); // обрізаємо до останнього дня місяця
  return result;
}
console.log(addMonths(new Date(Date.UTC(2024, 0, 31)), 1).toISOString());
// 2024-02-29T00:00:00.000Z — не 2 березня
```

## 7. Арифметика та порівняння

```js
// 7.1. Різниця двох дат — у мілісекундах
const a = new Date("2024-03-15T00:00:00Z");
const b = new Date("2024-03-18T12:00:00Z");
const diffMs = b - a; // Date приводиться до числа (valueOf)
console.log(diffMs); // 302400000
console.log(diffMs / (1000 * 60 * 60 * 24)); // 3.5 днів
const MS = { second: 1000, minute: 60_000, hour: 3_600_000, day: 86_400_000 };
console.log(diffMs / MS.hour); // 84

// 7.2. Додавання часу
const plusDay = new Date(a.getTime() + MS.day);
console.log(plusDay.toISOString()); // 2024-03-16T00:00:00.000Z

// 7.3. Порівняння: <, >, <=, >= працюють (через valueOf)...
console.log(a < b); // true
// ...а == і === порівнюють посилання, а не значення!
console.log(new Date(0) === new Date(0)); // false
console.log(new Date(0) == new Date(0)); // false
console.log(new Date(0).getTime() === new Date(0).getTime()); // true — правильно
console.log(+new Date(0) === +new Date(0)); // true — унарний плюс

// 7.4. Сортування дат
const dates = [new Date("2024-03-01Z"), new Date("2023-01-01Z"), new Date("2024-01-01Z")];
dates.sort((x, y) => x - y);
console.log(dates.map((x) => x.toISOString().slice(0, 10))); // ['2023-01-01', '2024-01-01', '2024-03-01']

// 7.5. Приведення типів (common/type-coercion.md):
//   hint "number" (арифметика, порівняння) → число (мс);
//   hint "string" / "default" (+ з рядком, шаблонні рядки) → рядок.
// Date — один з двох типів, де hint "default" трактується як "string":
console.log(typeof (a - 0)); // number
console.log(typeof (a + 0)); // string — ⚠️ конкатенація з рядковим представленням!
console.log(typeof +a); // number
console.log(`${new Date(0).toISOString()}`); // 1970-01-01T00:00:00.000Z

// 7.6. Скільки повних діб між датами (без часу)
const dayDiff = (x, y) => Math.round((y - x) / MS.day);
console.log(dayDiff(new Date("2024-03-01Z"), new Date("2024-03-15Z"))); // 14

// 7.7. Початок дня в UTC
const startOfUtcDay = (date) => new Date(Math.floor(date.getTime() / MS.day) * MS.day);
console.log(startOfUtcDay(new Date("2024-03-15T17:45:00Z")).toISOString());
// 2024-03-15T00:00:00.000Z
```

## 8. Форматування

```js
const t = new Date(Date.UTC(2024, 2, 15, 10, 30, 45, 123));

// 8.1. Стандартні методи
console.log(t.toISOString()); // 2024-03-15T10:30:45.123Z — завжди UTC, завжди 24 символи
console.log(t.toJSON()); // те саме (використовується JSON.stringify)
console.log(t.toUTCString()); // Fri, 15 Mar 2024 10:30:45 GMT
console.log(JSON.stringify({ at: t })); // {"at":"2024-03-15T10:30:45.123Z"}
// toString() / toDateString() / toTimeString() / toLocaleString() —
// у локальному поясі і форматі (TZ), не використовуйте для обміну даними.
// Дані передавайте як toISOString() або timestamp (число).

// 8.2. Зворотній цикл (round trip)
const parsed = new Date(t.toISOString());
console.log(parsed.getTime() === t.getTime()); // true
// JSON.parse НЕ відновлює Date автоматично — отримаєте рядок:
console.log(typeof JSON.parse(JSON.stringify({ at: t })).at); // string

// 8.3. Intl.DateTimeFormat / toLocaleDateString — локалізація й пояси
console.log(t.toLocaleDateString("en-US", { timeZone: "UTC" })); // 3/15/2024
console.log(t.toLocaleDateString("uk-UA", { timeZone: "UTC" })); // 15.03.2024
console.log(t.toLocaleDateString("de-DE", { timeZone: "UTC" })); // 15.3.2024
console.log(
  t.toLocaleDateString("uk-UA", {
    timeZone: "UTC",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }),
); // пʼятниця, 15 березня 2024 р. (апостроф — символ ʼ U+02BC)
console.log(t.toLocaleTimeString("en-GB", { timeZone: "UTC" })); // 10:30:45

// Той самий момент — різні пояси:
const fmt = (tz) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    dateStyle: "short",
    timeStyle: "short",
    hourCycle: "h23",
  }).format(t);
console.log(fmt("UTC")); // 15/03/2024, 10:30
console.log(fmt("Europe/Kyiv")); // 15/03/2024, 12:30 (UTC+2 у березні до переходу)
console.log(fmt("America/New_York")); // 15/03/2024, 06:30 (UTC−4 після переходу на літній час)
console.log(fmt("Asia/Tokyo")); // 15/03/2024, 19:30

// Створюйте Intl.DateTimeFormat один раз і перевикористовуйте — створення
// дороге, а format() швидкий (важливо в циклах).

// 8.3.1. formatToParts — для власних шаблонів
const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", dateStyle: "short" })
  .formatToParts(t)
  .reduce((acc, p) => ({ ...acc, [p.type]: p.value }), {});
console.log(parts); // { day: '15', literal: '/', month: '03', year: '2024' }

// 8.3.2. Відносний час
const rtf = new Intl.RelativeTimeFormat("uk", { numeric: "auto" });
console.log(rtf.format(-1, "day")); // учора
console.log(rtf.format(3, "day")); // через 3 дні

// 8.4. Ручне форматування з доповненням нулями
const pad = (n, len = 2) => String(n).padStart(len, "0");
const formatUtc = (date) =>
  `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ` +
  `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
console.log(formatUtc(t)); // 2024-03-15 10:30
// (padStart — common/data-structures/String/String.md)
```

## 9. Часові пояси та літній час (DST)

`Date` знає лише два пояси: UTC і локальний (системний). Довільний пояс (`"Europe/Kyiv"`) доступний тільки для форматування через `Intl`, а не для арифметики.

```js
// 9.1. Доба ≠ завжди 24 години
// У день переходу на літній/зимовий час доба триває 23 або 25 годин, тому
// "додати 24 години" і "додати 1 день" — різні операції у локальному часі:
//   d.setDate(d.getDate() + 1)   — той самий локальний час наступного дня
//   d.getTime() + 24 * 3_600_000 — рівно 24 години, локальний час "зсувається"
// UTC-арифметика вільна від цієї проблеми — тому для розрахунків
// зберігайте й рахуйте в UTC, а локальний пояс залишайте для показу.

const nextUtcDay = (date) => {
  const r = new Date(date);
  r.setUTCDate(r.getUTCDate() + 1);
  return r;
};
console.log(nextUtcDay(new Date("2024-03-30T12:00:00Z")).toISOString());
// 2024-03-31T12:00:00.000Z

// 9.4. Пояс середовища
console.log(typeof Intl.DateTimeFormat().resolvedOptions().timeZone); // string
// напр. "Europe/Kyiv"; у Node пояс задається змінною TZ.
```

Ще два моменти без окремого коду:

- **неіснуючий і подвійний локальний час** — під час переходу деякі локальні часи «зникають» (02:30 навесні) або зустрічаються двічі (01:30 восени); `new Date(y, m, d, h, min)` у такому разі обирає одне зі значень за правилами рушія;
- **рекомендації**: зберігайте час як UTC (ISO-рядок із `Z` або timestamp у мс); зберігайте окремо пояс користувача (IANA-ім'я), якщо потрібне відображення «як було в його місті»; планові події («щодня о 9:00 за Києвом») зберігайте як локальний час + пояс, а не як фіксований UTC; не рахуйте зсув поясу вручну — пояси змінюють закони.

## 10. Час для вимірів: Date.now() vs performance.now()

`Date.now()` — «настінний» (wall-clock) час: може стрибнути назад/вперед (синхронізація NTP, ручна зміна; перехід поясу не впливає, але налаштування системного годинника — так). Роздільність — мілісекунди.

`performance.now()` — монотонний таймер: тільки зростає, дробові мілісекунди, відлік від запуску процесу. Для вимірів тривалості — саме він ([performance/](../performance/) — бенчмаркінг).

```js
const t0 = performance.now();
let acc = 0;
for (let i = 0; i < 1e5; i++) acc += i;
const elapsed = performance.now() - t0;
console.log(elapsed >= 0); // true — монотонний, ніколи від'ємний
console.log(acc); // 4999950000
```

`console.time` / `console.timeEnd` — зручна обгортка для швидких замірів. Для затримок у коді: `setTimeout` не гарантує точний час ([common/asynchronous/](asynchronous/)) — вимірюйте фактичну різницю, а не довіряйте номінальній.

## 11. Мутабельність та типові помилки

```js
// 11.1. Date мутабельний — функції, що змінюють параметр, дають сюрпризи
function addDaysBad(date, days) {
  date.setUTCDate(date.getUTCDate() + days); // ❌ змінює вхідний об'єкт
  return date;
}
const start = new Date(Date.UTC(2024, 0, 1));
const end = addDaysBad(start, 10);
console.log(start.toISOString()); // 2024-01-11T00:00:00.000Z — start "поїхав"!
console.log(start === end); // true — це один і той самий об'єкт

function addDays(date, days) {
  const result = new Date(date); // ✅ працюємо з копією
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}
const start2 = new Date(Date.UTC(2024, 0, 1));
console.log(addDays(start2, 10).toISOString()); // 2024-01-11T00:00:00.000Z
console.log(start2.toISOString()); // 2024-01-01T00:00:00.000Z — незмінений

// Це той самий клас пасток, що й спільні посилання на об'єкти
// (patterns/prototype.md — клонування; Object.freeze не захищає Date,
// бо стан живе у внутрішньому слоті, а не у властивостях):
const frozen = Object.freeze(new Date(0));
frozen.setUTCFullYear(2000);
console.log(frozen.getUTCFullYear()); // 2000 — заморозка не допомогла

// 11.2. Місяці з нуля
console.log(new Date(Date.UTC(2024, 1, 1)).getUTCMonth()); // 1 — лютий, а не січень
// Часта помилка: new Date(2024, 1) вважають "січнем"

// 11.3. new Date(2024, 0) — це локальний час 1 січня, а не рік як мс
console.log(new Date(2024, 0).getFullYear()); // 2024
console.log(new Date(2024).getTime()); // 2024 — один аргумент — це мілісекунди!

// 11.4. Число замість Date у порівняннях: діє лише valueOf
console.log(new Date(5) > new Date(3)); // true

// 11.5. Ключі Map/Set: дві однакові дати — різні ключі (за посиланням)
const map = new Map([[new Date(0), "a"]]);
console.log(map.get(new Date(0))); // undefined
console.log(map.get(new Date(0).getTime())); // undefined — ключ був Date
// Використовуйте getTime() або toISOString() як ключ
// (common/data-structures/Map/Map.md).

// 11.6. structuredClone зберігає Date (patterns/prototype.md), а
// JSON.parse(JSON.stringify(x)) перетворює на рядок.
console.log(structuredClone(new Date(0)) instanceof Date); // true

// 11.7. Високі роки і від'ємні (до н.е.) в ISO: розширений формат
console.log(new Date(Date.UTC(-1, 0, 1)).toISOString()); // -000001-01-01T00:00:00.000Z
```

Ще одне правило без коду: не використовуйте `Date` для точних фінансових/календарних дат без часу («день народження», «дата договору»): зберігайте як рядок `"YYYY-MM-DD"`, а не як момент часу — так уникнете зсуву поясів.

## 12. Date і екосистема: Temporal та бібліотеки

`Date` має відомі проблеми: мутабельність, місяці з 0, мало поясів, ненадійний парсинг. Рішення:

- **Temporal** (TC39 Stage 3+; вже доступний у частині рушіїв) — новий стандартний API: імутабельні `PlainDate`, `ZonedDateTime`, `Instant`, `Duration`, повна підтримка IANA-поясів;
- **date-fns** (функції над `Date`, імутабельний стиль), **Luxon**, **Day.js** — популярні бібліотеки; **moment.js** — у режимі підтримки, для нових проєктів не рекомендований;
- для більшості серверних задач достатньо: зберігати ISO-UTC, рахувати UTC-арифметикою, форматувати через `Intl`.

Зв'язок з іншими темами:

- Nest/DTO: рядки з JSON у `Date` треба перетворювати явно ([node/nest/controllers.md](../node/nest/controllers.md) — валідація/pipes);
- TypeScript: тип `Date`; серіалізація в JSON дає `string`;
- Buffer/бінарні формати: unix-timestamp у секундах (32 біти) — будьте уважні: `Date` працює в мілісекундах ([bitwise-operations.md](bitwise-operations.md) про 32-бітні обмеження та проблему 2038 року).

```js
console.log(Math.floor(Date.UTC(2024, 0, 1) / 1000)); // 1704067200 — секунди
console.log(2 ** 31 - 1); // 2147483647 — максимум int32 у секундах
console.log(new Date((2 ** 31 - 1) * 1000).toISOString()); // 2038-01-19T03:14:07.000Z
```

## 13. Довідник методів: локальні рядки та сеттери з кількома аргументами

Усі приклади виконано з `TZ=Europe/Kyiv` (зима UTC+2, літо UTC+3).

```js
const d = new Date(2024, 2, 15, 10, 30, 45, 123); // локальний час

// 13.1. Рядкові представлення (залежать від поясу й локалі — лише для показу)
console.log(d.toString()); // Fri Mar 15 2024 10:30:45 GMT+0200 (Eastern European Standard Time)
console.log(d.toDateString()); // Fri Mar 15 2024
console.log(d.toTimeString()); // 10:30:45 GMT+0200 (Eastern European Standard Time)
console.log(d.toLocaleString("uk-UA")); // 15.03.2024, 10:30:45
console.log(d.toLocaleDateString("en-US"), d.toLocaleTimeString("en-US")); // 3/15/2024 10:30:45 AM
console.log(d.toUTCString()); // Fri, 15 Mar 2024 08:30:45 GMT — завжди GMT

// 13.2. Сеттери приймають і кілька компонентів одразу
const s = new Date(2024, 0, 1);
s.setHours(13, 45, 30, 500); // години, хвилини, секунди, мс
console.log(s.toString()); // Mon Jan 01 2024 13:45:30 GMT+0200 ...
s.setFullYear(2025, 5, 10); // рік, місяць, день
console.log(s.toISOString()); // 2025-06-10T10:45:30.500Z
s.setMinutes(90); // 90 хвилин → +1 година 30 хвилин (перекочування)
console.log(s.getHours(), s.getMinutes()); // 14 30
console.log(s.setTime(0), s.toISOString()); // 0 1970-01-01T00:00:00.000Z — setTime задає мс

// 13.3. День тижня, номер у «понеділок-перший» системі
const fri = new Date(Date.UTC(2024, 2, 15));
console.log(fri.getUTCDay()); // 5 (нд = 0)
console.log((fri.getUTCDay() + 6) % 7); // 4 — понеділок = 0

// 13.4. Вік людини (з урахуванням того, чи вже був день народження)
const birth = new Date(Date.UTC(2000, 5, 20)), today = new Date(Date.UTC(2024, 5, 19));
let age = today.getUTCFullYear() - birth.getUTCFullYear();
const notYet = today.getUTCMonth() < birth.getUTCMonth() ||
  (today.getUTCMonth() === birth.getUTCMonth() && today.getUTCDate() < birth.getUTCDate());
if (notYet) age--;
console.log(age); // 23 — день народження 20 червня ще не настав

// 13.5. Значення «порожніх» аргументів
console.log(new Date(null).getTime()); // 0 — null → 0
console.log(new Date(undefined).getTime()); // NaN
console.log(new Date("").getTime()); // NaN
console.log(Date.UTC(2024)); // 1704067200000 — достатньо одного року
console.log(new Date(NaN) < new Date(0)); // false — будь-яке порівняння з NaN хибне

// 13.6. Symbol.toPrimitive: чому date + 1 — рядок
console.log(d[Symbol.toPrimitive]("number")); // 1710491445123
console.log(typeof d[Symbol.toPrimitive]("default")); // string
```

## 14. Літній час на практиці (повернення до розділу 9)

Київ переходить на літній час 31 березня 2024 о 03:00 (стрілка стає 04:00) і назад 27 жовтня о 04:00 (стає 03:00).

```js
const before = new Date(2024, 2, 30, 12); // субота 12:00, ще зимовий час

const byDate = new Date(before);
byDate.setDate(byDate.getDate() + 1); // «той самий час наступного дня»
const byMs = new Date(before.getTime() + 86_400_000); // рівно 24 години

console.log(byDate.toString()); // Sun Mar 31 2024 12:00:00 GMT+0300 ...
console.log(byMs.toString()); // Sun Mar 31 2024 13:00:00 GMT+0300 ...
console.log((byDate - before) / 3_600_000); // 23 — доба тривала 23 години
console.log((byMs - before) / 3_600_000); // 24

// Неіснуючий локальний час: 03:30 31 березня не було — рушій зсуває вперед
console.log(new Date(2024, 2, 31, 3, 30).toString()); // Sun Mar 31 2024 04:30:00 GMT+0300 ...

// Подвійний локальний час: 03:30 27 жовтня було двічі — обирається перше (літнє)
console.log(new Date(2024, 9, 27, 3, 30).toISOString()); // 2024-10-27T00:30:00.000Z
console.log(new Date(2024, 9, 27, 4, 0).toISOString()); // 2024-10-27T02:00:00.000Z
```

Висновок: коли потрібен «той самий час наступного дня» — `setDate(getDate()+1)`; коли потрібні рівно 24 години (таймаут, TTL) — додавайте мілісекунди; для рахунку днів між датами без часу — UTC.

## 15. Intl: ще кілька корисних форм

```js
const t = new Date(Date.UTC(2024, 2, 15, 10));
console.log(new Intl.DateTimeFormat("uk", { dateStyle: "full", timeZone: "Europe/Kyiv" }).format(t));
// пʼятниця, 15 березня 2024 р.
console.log(new Intl.DateTimeFormat("uk", { month: "long", timeZone: "UTC" }).format(t)); // березень
console.log(new Intl.DateTimeFormat("en-US", {
  hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC",
}).format(new Date(Date.UTC(2024, 2, 15, 9, 5)))); // 09:05
```

## Підсумок

- `Date` — це одне число: мс від `1970-01-01T00:00:00Z` (Unix epoch); він зберігає момент, а не пояс; діапазон ±8.64e15 мс; мутабельний.
- Створення: `new Date()` / `Date.now()` / `new Date(мс)` / `new Date(рядок)` / `new Date(y, m, d, ...)` (місяці 0–11, локальний час) / `Date.UTC(...)`; `Date()` без `new` повертає рядок.
- Парсинг: надійний лише ISO 8601; `"YYYY-MM-DD"` = UTC, а `"YYYY-MM-DDTHH:mm"` без `Z` = локальний час; інші формати залежать від рушія.
- Invalid Date: `getTime()` = `NaN`, `toISOString` кидає `RangeError`, `JSON.stringify` дає `null`; перевіряти через `Number.isNaN(d.getTime())`.
- Геттери/сеттери існують у локальному та UTC-варіантах (`getUTCX`); `getDate` = число місяця, `getDay` = день тижня, `getTimezoneOffset` — у хвилинах з протилежним знаком; `getYear` застарілий.
- Значення поза діапазоном перекочуються (день 0 = останній день попереднього місяця, місяць 12 = січень наступного року) — зручно, але 31 січня + 1 місяць = 2 березня.
- Різниця дат = віднімання (число мс); `<` і `>` працюють, а `==` та `===` порівнюють посилання — використовуйте `getTime()`.
- `date + число` → рядок (hint «default» для Date = string), `date - число` → число.
- Форматування: `toISOString` для обміну даними; `Intl.DateTimeFormat` / `toLocaleDateString` з `timeZone` для показу; `JSON.parse` не відновлює `Date`.
- Для розрахунків зберігайте й рахуйте в UTC; «доба» у локальному поясі може тривати 23 або 25 годин через DST.
- `Date.now()` — настінний годинник (може стрибати), для вимірів тривалості — `performance.now()` (монотонний).
- Пастки: мутабельність (копіюйте `new Date(d)`), `Object.freeze` не захищає, місяці з 0, один числовий аргумент = мілісекунди, `Date` як ключ `Map` порівнюється за посиланням.
- Альтернативи: Temporal (майбутній стандарт), date-fns, Luxon, Day.js.

## Задачі для закріплення

42 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Код виконуйте в консолі браузера чи в Node.js 24.

### Рівень 1. Основи

**1.** Що поверне `new Date(0).toISOString()`?

```js
new Date(0).toISOString()
```

**2.** Що поверне `Date.UTC(2024, 0, 15)` та відповідний ISO?

```js
[Date.UTC(2024, 0, 15), new Date(Date.UTC(2024, 0, 15)).toISOString()]
```

**3.** Чому місяці у `Date` рахуються з нуля?

```js
[new Date(Date.UTC(2024, 0, 1)).getUTCMonth(), new Date(Date.UTC(2024, 11, 1)).getUTCMonth(), new Date(Date.UTC(2024, 11, 1)).getUTCDate()]
```

**4.** Що поверне `getUTCDay` для відомих дат?

```js
['2024-01-01', '2024-02-29', '2000-01-01'].map(s => new Date(s).getUTCDay())
```

**5.** Що поверне `new Date('2024-03-15')` порівняно з `'2024-03-15T00:00:00'` щодо UTC?

```js
[new Date('2024-03-15').toISOString(), new Date('2024-03-15T00:00:00Z').toISOString()]
```

**6.** Що поверне парсинг некоректного рядка?

```js
[new Date('abc').getTime(), String(new Date('abc')), isNaN(new Date('abc')), new Date(NaN).toString()]
```

**7.** Що поверне `toISOString` для Invalid Date?

```js
(() => { try { new Date(NaN).toISOString(); } catch (e) { return e.name + ': ' + e.message; } })()
```

**8.** Що поверне `toJSON` для Invalid Date та валідної?

```js
[new Date(NaN).toJSON(), new Date(0).toJSON(), JSON.stringify({ d: new Date(86400000) })]
```

**9.** Що відбувається при переповненні місяця: 13-й місяць, 32 січня?

```js
[new Date(Date.UTC(2024, 12, 1)).toISOString(), new Date(Date.UTC(2024, 0, 32)).toISOString()]
```

**10.** Що дасть день 0 і від'ємні дні?

```js
[new Date(Date.UTC(2024, 2, 0)).getUTCDate(), new Date(Date.UTC(2023, 2, 0)).getUTCDate(), new Date(Date.UTC(2024, 0, -1)).toISOString().slice(0, 10)]
```

**11.** Як дізнатися кількість днів у місяці?

```js
[[2024, 1], [2023, 1], [2024, 3], [2024, 11]].map(([y, m]) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate())
```

### Рівень 2. Деталі й поведінка

**12.** Як перевірити високосність?

```js
[1900, 2000, 2023, 2024, 2100].map(y => new Date(Date.UTC(y, 1, 29)).getUTCMonth() === 1)
```

**13.** Що поверне віднімання дат?

```js
(new Date('2024-03-01') - new Date('2024-02-01')) / 864e5
```

**14.** Що поверне `+date`, `date.valueOf()`, `getTime()`?

```js
(() => { const d = new Date('1970-01-02T00:00:00Z'); return [+d, d.valueOf(), d.getTime(), typeof (d + 1), d - 0]; })()
```

**15.** Що дасть `d1 == d2` і `d1 === d2` для двох однакових дат?

```js
(() => { const a = new Date(5), b = new Date(5); return [a == b, a === b, +a === +b, a <= b && a >= b]; })()
```

**16.** Як додати 30 днів до дати без мутації?

```js
(() => { const d = new Date('2024-01-15T00:00:00Z'); const n = new Date(d); n.setUTCDate(n.getUTCDate() + 30); return [d.toISOString(), n.toISOString()]; })()
```

**17.** Що повертає `setUTCHours` та чи мутує дату?

```js
(() => { const d = new Date(0); const r = d.setUTCHours(5); return [r, d.getTime()]; })()
```

**18.** Що поверне `setUTCMonth(1)` для 31 січня?

```js
(() => { const d = new Date('2024-01-31T00:00:00Z'); d.setUTCMonth(1); return d.toISOString().slice(0, 10); })()
```

**19.** Що поверне `new Date(2024, 0, 31)` + 1 місяць через локальні методи?

```js
(() => { const d = new Date(2024, 0, 31); d.setMonth(1); return [d.getMonth(), d.getDate()]; })()
```

**20.** Що поверне `Date()` без `new` та `typeof`?

```js
[typeof Date(), typeof new Date()]
```

**21.** Що поверне `new Date(2024, 0)` (місяць, без днів) локально?

```js
(() => { const d = new Date(2024, 0); return [d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]; })()
```

**22.** Що поверне двозначний рік: `new Date(99, 0).getFullYear()`?

```js
[new Date(99, 0).getFullYear(), new Date(100, 0).getFullYear(), new Date(0, 0).getFullYear()]
```

### Рівень 3. Нюанси та пастки

**23.** Що поверне `Date.parse` різних форматів (UTC-варіанти)?

```js
[Date.parse('2024-01-01T00:00:00Z'), Date.parse('2024-01-01T00:00:00+02:00'), Date.parse('2024-01'), Date.parse('2024')]
```

**24.** Що поверне `Date.parse('2024-01-01T24:00:00Z')`?

```js
[Date.parse('2024-01-01T24:00:00Z'), Date.parse('2024-01-01T25:00:00Z')]
```

**25.** Максимальна дата у JS?

```js
[new Date(8.64e15).toISOString(), new Date(8.64e15 + 1).getTime(), new Date(-8.64e15).toISOString()]
```

**26.** Чи рівні `toISOString().slice(0, 10)` та локальна дата для півночі UTC (UTC-формат)?

```js
new Date('2024-05-05T23:59:59Z').toISOString().slice(0, 10)
```

**27.** Що виведе `Intl.DateTimeFormat` для UTC із фіксованою локаллю?

```js
new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(Date.UTC(2024, 2, 5)))
```

**28.** Те саме українською?

```js
new Intl.DateTimeFormat('uk-UA', { timeZone: 'UTC', dateStyle: 'long' }).format(new Date(Date.UTC(2024, 2, 5)))
```

**29.** Що виведе `toLocaleDateString('en-GB', ...)` у UTC?

```js
new Date(Date.UTC(2024, 2, 5)).toLocaleDateString('en-GB', { timeZone: 'UTC' })
```

**30.** Різниця у часових зонах: та сама мить у Києві та Нью-Йорку (січень)?

```js
['Europe/Kyiv', 'America/New_York', 'Asia/Tokyo'].map(z => new Intl.DateTimeFormat('en-GB', { timeZone: z, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date('2024-01-15T12:00:00Z')))
```

**31.** Та сама мить влітку: літній час?

```js
['Europe/Kyiv', 'America/New_York'].map(z => new Intl.DateTimeFormat('en-GB', { timeZone: z, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date('2024-07-15T12:00:00Z')))
```

**32.** Що поверне `Intl.RelativeTimeFormat`?

```js
(() => { const r = new Intl.RelativeTimeFormat('en', { numeric: 'auto' }); return [r.format(-1, 'day'), r.format(2, 'week'), r.format(0, 'day')]; })()
```

**33.** Скільки мс у добі, годині, тижні?

```js
[24 * 60 * 60 * 1000, 3600000, 7 * 864e5]
```

### Рівень 4. Практика

**34.** Напишіть `addDays(date, n)`, що не мутує вихідну дату (UTC).

```js
const addDays = (d, n) => { const r = new Date(d); r.setUTCDate(r.getUTCDate() + n); return r; }
```

**35.** Напишіть `daysBetween(a, b)`.

```js
const daysBetween = (a, b) => Math.round((b - a) / 864e5)
```

**36.** Напишіть `isoWeekday(d)`: 1=пн … 7=нд (UTC).

```js
const wd = (d) => d.getUTCDay() || 7
```

**37.** Напишіть `startOfMonth` та `endOfMonth` (UTC, ISO-день).

```js
const som = (d) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)); const eom = (d) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0))
```

**38.** Напишіть `age(birth, today)` у повних роках.

```js
const age = (b, t) => { let a = t.getUTCFullYear() - b.getUTCFullYear(); const m = t.getUTCMonth() - b.getUTCMonth(); if (m < 0 || (m === 0 && t.getUTCDate() < b.getUTCDate())) a--; return a; }
```

**39.** Напишіть `isoWeek(d)` — номер ISO-тижня.

```js
const isoWeek = (d) => { const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); const n = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - n); const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return Math.ceil(((t - y) / 864e5 + 1) / 7); }
```

**40.** Напишіть `formatISODate(d)` та `parseISODate(s)` для `YYYY-MM-DD` у UTC із перевіркою.

```js
const fmt = (d) => d.toISOString().slice(0, 10); const parse = (s) => { const d = new Date(s + 'T00:00:00Z'); return isNaN(d) || fmt(d) !== s ? null : d; }
```

**41.** Напишіть `rangeOfDays(from, to)` — масив ISO-дат включно.

```js
const rangeOfDays = (a, b) => { const r = []; for (let t = +a; t <= +b; t += 864e5) r.push(new Date(t).toISOString().slice(0, 10)); return r; }
```

**42.** Напишіть `groupByMonth(dates)`.

```js
const gm = (a) => a.reduce((m, d) => { const k = d.toISOString().slice(0, 7); (m[k] ||= []).push(d.toISOString().slice(8, 10)); return m; }, {})
```

### Відповіді

1. `'1970-01-01T00:00:00.000Z'`
2. `[1705276800000, '2024-01-15T00:00:00.000Z']`
3. `[0, 11, 1]`
4. `[1, 4, 6]`
5. `['2024-03-15T00:00:00.000Z', '2024-03-15T00:00:00.000Z']`
6. `[NaN, 'Invalid Date', true, 'Invalid Date']`
7. `'RangeError: Invalid time value'`
8. `[null, '1970-01-01T00:00:00.000Z', '{"d":"1970-01-02T00:00:00.000Z"}']`
9. `['2025-01-01T00:00:00.000Z', '2024-02-01T00:00:00.000Z']`
10. `[29, 28, '2023-12-30']`
11. `[29, 28, 30, 31]`
12. `[false, true, false, true, false]`
13. `29`
14. `[86400000, 86400000, 86400000, 'string', 86400000]`
15. `[false, false, true, true]`
16. `['2024-01-15T00:00:00.000Z', '2024-02-14T00:00:00.000Z']`
17. `[18000000, 18000000]`
18. `'2024-03-02'`
19. `[2, 2]`
20. `['string', 'object']`
21. `[2024, 0, 1, 0]`
22. `[1999, 100, 1900]`
23. `[1704067200000, 1704060000000, 1704067200000, 1704067200000]`
24. `[1704153600000, NaN]`
25. `['+275760-09-13T00:00:00.000Z', NaN, '-271821-04-20T00:00:00.000Z']`
26. `'2024-05-05'`
27. `'March 5, 2024'`
28. `'5 березня 2024 р.'`
29. `'05/03/2024'`
30. `['14:00', '07:00', '21:00']`
31. `['15:00', '08:00']`
32. `['yesterday', 'in 2 weeks', 'today']`
33. `[86400000, 3600000, 604800000]`
34. Виклик `(() => { const d = new Date('2024-02-27T00:00:00Z'); return [addDays(d, 3).toISOString().slice(0, 10), d.toISOString().slice(0, 10)]; })()` → `['2024-03-01', '2024-02-27']`
35. Виклик `[daysBetween(new Date('2024-01-01'), new Date('2024-12-31')), daysBetween(new Date('2024-03-10'), new Date('2024-03-01'))]` → `[365, -9]`
36. Виклик `['2024-01-01', '2024-01-07', '2024-01-06'].map(s => wd(new Date(s)))` → `[1, 7, 6]`
37. Виклик `(() => { const d = new Date('2024-02-10T12:00:00Z'); return [som(d).toISOString().slice(0, 10), eom(d).toISOString().slice(0, 10)]; })()` → `['2024-02-01', '2024-02-29']`
38. Виклик `[age(new Date('2000-06-15'), new Date('2024-06-14')), age(new Date('2000-06-15'), new Date('2024-06-15')), age(new Date('2000-02-29'), new Date('2023-02-28'))]` → `[23, 24, 22]`
39. Виклик `['2024-01-01', '2024-12-30', '2021-01-03', '2020-12-31'].map(s => isoWeek(new Date(s)))` → `[1, 1, 53, 53]`
40. Виклик `[fmt(new Date(86400000 * 365)), parse('2024-02-29') && 'ok', parse('2023-02-29'), parse('2024-13-01')]` → `['1971-01-01', 'ok', null, null]`
41. Виклик `rangeOfDays(new Date('2024-02-27'), new Date('2024-03-01'))` → `['2024-02-27', '2024-02-28', '2024-02-29', '2024-03-01']`
42. Виклик `gm([new Date('2024-01-05'), new Date('2024-01-20'), new Date('2024-02-01')])` → `{ '2024-01': ['05', '20'], '2024-02': ['01'] }`
