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

// 7.5. Приведення типів (common/type-coercion.js):
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
