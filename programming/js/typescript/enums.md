# TypeScript: enums

## 0. Загальна ідея

`enum` — на відміну від усього, що розглядалось в інших нотатках (`type`, `interface`, `keyof`, `as const`), не «стирається» повністю при компіляції: `enum` генерує реальний JS-код, що існує в рантаймі (об'єкт-мапу). Це робить `enum` винятком серед конструкцій TS, і саме тому вибір «enum чи ні» — окреме, свідоме рішення, а не просто «зручний синтаксис».

## 1. Numeric enum — за замовчуванням числа, що автоінкрементуються

```ts
enum Direction {
  Up, // 0
  Down, // 1
  Left, // 2
  Right, // 3
}

function move(direction: Direction) {
  console.log(`move: ${direction}`); // Direction.Up у виразі — просто число 0
}
move(Direction.Up); // move: 0
move(Direction.Right); // move: 3

console.log(Direction.Up); // 0 — це реальне число в рантаймі
console.log(Direction[0]); // Up — зворотне відображення число → назва (лише для numeric enum!)

// початкове значення можна задати явно — далі йде автоінкремент від нього:
enum HttpStatus {
  OK = 200,
  Created = 201,
  BadRequest = 400,
  NotFound = 404,
  ServerError = 500,
}
console.log(HttpStatus.NotFound); // 404
```

## 2. Що реально генерується в рантаймі (на відміну від type/interface)

Ось що `tsc` (5.8) генерує для `enum Direction { Up, Down }` та `enum LogLevel { Debug = "DEBUG" }`:

```text
var Direction;
(function (Direction) {
    Direction[Direction["Up"] = 0] = "Up";
    Direction[Direction["Down"] = 1] = "Down";
})(Direction || (Direction = {}));
var LogLevel;
(function (LogLevel) {
    LogLevel["Debug"] = "DEBUG";
})(LogLevel || (LogLevel = {}));
```

Саме це й дає зворотне відображення `Direction[0] === "Up"`: numeric-об'єкт заповнюється в обидва боки (ключ→значення і значення→ключ), а string-об'єкт — лише в один. Порівняй з `type`/`interface`/`keyof` — жоден з них не залишає жодного рядка коду після компіляції, `enum` — залишає.

## 3. String enum — без автоінкременту, без зворотного відображення

```ts
enum LogLevel {
  Debug = "DEBUG",
  Info = "INFO",
  Warning = "WARNING",
  Error = "ERROR",
}

function log(level: LogLevel, message: string) {
  console.log(`[${level}] ${message}`);
}
log(LogLevel.Warning, "something suspicious"); // [WARNING] something suspicious

// у string enum кожне значення треба задати явно — автоінкремент тут
// неможливий (немає "наступного рядка" за замовчуванням):
// enum Broken { A = "a", B, } // ❌ Enum member must have initializer.

console.log(LogLevel.Warning); // WARNING — реальний рядок, а не число
// console.log(LogLevel["WARNING"]); // ❌ Property 'WARNING' does not exist on type 'typeof LogLevel'. Did you mean 'Warning'?
// (зворотного відображення немає: лише Warning → "WARNING", а не "WARNING" → Warning)
```

## 4. Heterogeneous enum (змішаний) — існує, але майже ніколи не потрібен

```ts
enum MixedEnum {
  No = 0,
  Yes = "YES",
}
```

Технічно валідно, але офіційна документація TS прямо радить уникати такого змішування — плутає й не дає жодної практичної переваги над двома окремими enum'ами.

## 5. const enum — те саме, але без рантайм-об'єкта (інлайниться)

```ts
const enum Size {
  Small,
  Medium,
  Large,
}
function getSizeLabel(size: Size): string {
  return size === Size.Small ? "S" : size === Size.Medium ? "M" : "L";
}
console.log(getSizeLabel(Size.Medium)); // M
```

На відміну від звичайного `enum`, `const enum` за замовчуванням не генерує об'єкт-мапу — кожне звернення `Size.Medium` замінюється прямо на число ще під час компіляції (`tsc` емітить `1 /* Size.Medium */`), як inline-константа чи `#define` у C.

Але `const enum` має відомі обмеження, пов'язані з роздільною компіляцією файлів (саме так працюють Babel, esbuild, SWC і прапорець `isolatedModules`):

- з `isolatedModules` звичайне оголошення `const enum` у `.ts`-файлі компілюється, але `tsc` поводиться з ним як зі звичайним enum: генерує об'єкт і не інлайнить — переваги зникають;
- справжня помилка виникає при зверненні до ambient `const enum` з `.d.ts` (наприклад, з бібліотеки): `Cannot access ambient const enums when 'isolatedModules' is enabled.` — інструмент, що компілює файли поодинці, просто не знає значень з іншого файлу;
- тому документація TypeScript радить не публікувати `const enum` у `.d.ts` бібліотек і взагалі обережно використовувати їх у коді, що збирається такими інструментами.

## 6. Пастка: numeric enum приймає будь-яке `number`

Numeric enum історично поводився як «іменовані числа» (як у C). Починаючи з TypeScript 5.0 компілятор перевіряє числові літерали, але лише літерали:

```ts
function setDirection(direction: Direction) {
  console.log(direction);
}
setDirection(Direction.Up); // 0 — ok
// setDirection(999); // ❌ Argument of type '999' is not assignable to parameter of type 'Direction'.

const someNumber: number = 999;
setDirection(someNumber); // 999 — ⚠️ компілюється без помилки!
```

> ⚠️ Уточнення відносно оригінального файлу: там стверджувалось, що в новіших версіях TS передача довільного числа — помилка, і проблема лишилась лише в старому коді. Перевірка на TS 5.8 показує, що це правда тільки для числових літералів (`999`). Значення з типом `number` (з API, `parseInt`, обчислень) досі мовчки приймається там, де очікується numeric enum, і в рантаймі туди потрапляє `999`, якого в enum немає. Тож «тихий» баг нікуди не зник — він лише перемістився з літералів у змінні.

String enum цієї проблеми не мають — вони номінальні: навіть рядок, що дорівнює значенню учасника, не підійде без явного enum-члена:

```ts
// log("DEBUG", "test"); // ❌ Argument of type '"DEBUG"' is not assignable to parameter of type 'LogLevel'.
log("RANDOM" as LogLevel, "test"); // [RANDOM] test — лише явне приведення "проламує" перевірку
```

Приведення `as LogLevel` компілюється, але в рантаймі передає значення, якого в enum немає — тому `as` тут так само небезпечний, як `any`.

## 7. Альтернатива enum: `as const` об'єкт + literal union (порівняння)

Детально сам патерн — [const-assertions.md](const-assertions.md), розділ 4; тут — пряме порівняння з enum:

```ts
const DirectionConst = {
  Up: "up",
  Down: "down",
  Left: "left",
  Right: "right",
} as const;
type DirectionType = (typeof DirectionConst)[keyof typeof DirectionConst];

function moveConst(direction: DirectionType) {
  console.log(`move: ${direction}`);
}
moveConst(DirectionConst.Up); // move: up
```

## 8. enum і сучасні інструменти: erasable syntax

Сьогодні з'являється дедалі більше середовищ, які запускають TypeScript простим «стиранням» типів, без справжньої компіляції. Для них `enum` — проблема саме тому, що він не стирається:

- Node.js 24 запускає `.ts`/`.mts` файли напряму (type stripping): звичайні анотації типів працюють, але на `enum` Node кидає `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX: TypeScript enum is not supported in strip-only mode`;
- TypeScript 5.8 додав прапорець `--erasableSyntaxOnly`, який забороняє такі конструкції (`enum`, `namespace` з кодом, parameter properties у конструкторі): `This syntax is not allowed when 'erasableSyntaxOnly' is enabled.`

Це ще один практичний аргумент на користь `as const`-об'єкта: він є звичайним JS і працює скрізь.

## 9. Шпаргалка: enum vs `as const`-об'єкт — що обрати

| Критерій | enum | `as const` об'єкт + union |
|---|---|---|
| Залишає код у рантаймі | так (генерується IIFE з об'єктом) | ні, звичайний JS-об'єкт |
| Зворотне відображення (`0 → "Up"`) | так, але лише для numeric enum | ні, потрібно писати вручну |
| Tree-shaking / розмір бандла | гірше (зайвий згенерований код) | краще |
| Роздільна компіляція (`isolatedModules`, Babel, esbuild) | звичайний enum — ок; `const enum` — втрачає інлайнінг, ambient — помилка | завжди ок (це просто JS) |
| Node type stripping / `erasableSyntaxOnly` | не підтримується | ок |
| Захист від «довільного числа» | numeric enum: лише для літералів, `number`-змінна проходить | повний (literal union) |
| Використання як значення (`Enum.X`) | так, природно | так, `DirectionConst.Up` |
| Використання як тип | так, ім'я enum саме є типом | потрібен окремий `keyof typeof` тип |

## Підсумок

- `enum` — єдина з розглянутих конструкцій, яка не «стирається» при компіляції: генерує реальний JS-об'єкт у рантаймі.
- Numeric enum: автоінкремент значень від 0 (або від заданого стартового числа), має зворотне відображення число → назва.
- String enum: кожен варіант задається явно, без зворотного відображення; номінальний — навіть рядок з тим самим значенням не підходить.
- Heterogeneous (змішаний) enum технічно існує, але майже ніколи не потрібен.
- `const enum` інлайниться на етапі компіляції без рантайм-об'єкта, але при роздільній компіляції (`isolatedModules`, Babel, esbuild) втрачає інлайнінг, а ambient `const enum` з `.d.ts` взагалі дає помилку.
- Numeric enum з TS 5.0 відкидає «чужі» числові літерали, але значення типу `number` досі приймає без помилки — джерело тихих багів.
- `enum` несумісний з Node type stripping і `--erasableSyntaxOnly` (TS 5.8).
- Альтернатива без рантайм-коду — `as const` об'єкт + `(typeof obj)[keyof typeof obj]`: сьогодні частіше типовий вибір у нових проєктах, хоча `enum` лишається зручним, коли реально потрібне зворотне відображення значення → ім'я.
