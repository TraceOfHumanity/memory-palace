# TypeScript: const assertions (`as const`)

## 0. Загальна ідея

`as const` — це інструкція компілятору: «виведи для цього значення найвужчий, найконкретніший можливий тип, а не загальний». Без неї TS зазвичай «розширює» (widening) конкретні літерали до їхніх загальних типів (`string`, `number`) — бо припускає, що значення може бути змінене пізніше. `as const` вимикає це розширення.

Це не пов'язано з ключовим словом `const` (яке забороняє перепризначення змінної в JS, детально — `common/variables-and-execution-context/const.js`): `as const` — окрема, TS-специфічна конструкція для типів, хоча назва навмисно перегукується з `const`.

## 1. Type widening — чому TS «розширює» типи за замовчуванням

```ts
let mutableString = "hello"; // TS виводить широкий тип: string (не "hello")
mutableString = "goodbye"; // ok — TS заздалегідь "передбачив", що let можна перепризначити

const constString = "hello"; // а тут TS виводить вузький тип: "hello" (літерал!)
// constString = "goodbye"; // ❌ Cannot assign to 'constString' because it is a constant.
```

Це логічно для змінних (`let`/`var` — широкий тип, `const` — вузький), але всередині об'єктів і масивів TS «розширює» типи властивостей незалежно від того, `const` це чи `let` — саме це й вирішує `as const`:

```ts
const pointWithoutAsConst = { x: 10, y: 20 };
// тип pointWithoutAsConst — { x: number; y: number }, а не { x: 10; y: 20 } —
// хоча сама змінна оголошена через const! Причина: const захищає лише
// binding змінної, а не вміст об'єкта (детально —
// common/data-structures/Object/Object.md, розділ про const vs freeze):
pointWithoutAsConst.x = 999; // ok — властивість об'єкта мутабельна, тому TS і не звужував тип до 10
```

## 2. `as const` на об'єкті — фіксує і типи властивостей, і readonly

```ts
const pointWithAsConst = { x: 10, y: 20 } as const;
// тип: { readonly x: 10; readonly y: 20 } — конкретні літерали, а не number, і readonly

// pointWithAsConst.x = 999; // ❌ Cannot assign to 'x' because it is a read-only property.

console.log(pointWithAsConst.x); // 10 — тип точно 10, не "будь-яке число"

function acceptsExactTen(value: 10) {
  console.log(value);
}
acceptsExactTen(pointWithAsConst.x); // 10 — ✅ тип точно 10, підходить
// acceptsExactTen(pointWithoutAsConst.x); // ❌ Argument of type 'number' is not assignable to parameter of type '10'.
```

## 3. `as const` на масиві — звичайний масив стає readonly tuple

```ts
const arrWithoutAsConst = [1, 2, 3];
// тип: number[] — звичайний, мутабельний масив
arrWithoutAsConst.push(4); // ok

const arrWithAsConst = [1, 2, 3] as const;
// тип: readonly [1, 2, 3] — readonly tuple з конкретними літералами
// arrWithAsConst.push(4); // ❌ Property 'push' does not exist on type 'readonly [1, 2, 3]'.
// arrWithAsConst[0] = 999; // ❌ Cannot assign to '0' because it is a read-only property.

console.log(arrWithAsConst); // [ 1, 2, 3 ]
```

Це й пояснює трюк `(typeof responseTuple)[number]` з [typeof-and-keyof.md](typeof-and-keyof.md): саме `as const` перетворює звичайний масив на tuple, з якого можна «витягти» union конкретних значень, а не просто розширений `number`/`string`.

## 4. Найпоширеніше застосування: замінник enum без рантайм-коду

Класична проблема: без `as const` літеральний union доводиться оголошувати двічі — один раз як рядкові значення (для рантайму), і ще раз як тип (для перевірки) — з ризиком, що вони розійдуться.

```ts
// ❌ без as const — TS "розширює" значення властивостей до string
const DirectionsWidened = {
  UP: "up",
  DOWN: "down",
  LEFT: "left",
  RIGHT: "right",
};
// typeof DirectionsWidened.UP тут — просто string, а не "up"
function moveWidened(direction: string) {
  // довелось узяти "широкий" string, бо конкретики звідси не витягти
  console.log(`move: ${direction}`);
}
moveWidened("literally anything"); // move: literally anything — жодної помилки, string приймає все

// ✅ з as const — точні літерали автоматично, без дублювання опису
const Directions = {
  UP: "up",
  DOWN: "down",
  LEFT: "left",
  RIGHT: "right",
} as const;

type Direction = (typeof Directions)[keyof typeof Directions]; // "up" | "down" | "left" | "right"
// (детальний розбір цієї конструкції — typeof-and-keyof.md)

function move(direction: Direction) {
  console.log(`move: ${direction}`);
}
move(Directions.UP); // move: up
// move("literally anything"); // ❌ Argument of type '"literally anything"' is not assignable to parameter of type 'Direction'.
```

Перевага над справжнім `enum`: цей об'єкт — звичайний JS-об'єкт без додаткового згенерованого коду в рантаймі (`enum` компілюється в окрему IIFE, що заповнює об'єкт; детально порівняння — [enums.md](enums.md)).

## 5. `as const` на рядковому/числовому літералі — зафіксувати точне значення

Рідше застосовується напряму до примітива, але корисно розуміти:

```ts
let widenedLiteral = "GET"; // тип: string
let narrowedLiteral = "GET" as const; // тип: "GET" (буквально це значення)

function sendRequest(method: "GET" | "POST") {
  console.log(`Method: ${method}`);
}
// sendRequest(widenedLiteral); // ❌ Argument of type 'string' is not assignable to parameter of type '"GET" | "POST"'.
sendRequest(narrowedLiteral); // Method: GET — ✅ тип точно "GET"
```

## 6. Глибина as const — застосовується рекурсивно, до всіх рівнів вкладеності

```ts
const nestedConfig = {
  server: {
    host: "localhost",
    port: 8080,
  },
  features: ["auth", "logging"],
} as const;

// усі рівні стали readonly й найвужчими:
// nestedConfig.server.port = 9090; // ❌ Cannot assign to 'port' because it is a read-only property.
// nestedConfig.features.push("cache"); // ❌ Property 'push' does not exist on type 'readonly ["auth", "logging"]'.

type FeatureName = (typeof nestedConfig.features)[number]; // "auth" | "logging"
const feature: FeatureName = "auth"; // ok
console.log(feature); // auth
```

## 7. `as const` vs `Readonly<T>` / `ReadonlyArray<T>` — чим відрізняється

`Readonly<T>` (детально — [utility-types.md](utility-types.md)) бере вже існуючий тип `T` і робить його поля readonly — але не звужує самі типи значень (`number` лишається `number`, а не конкретним літералом):

```ts
interface Point3D {
  x: number;
  y: number;
}
const readonlyViaUtility: Readonly<Point3D> = { x: 10, y: 20 };
// тип x тут — лише readonly number, будь-яке число підійшло б при створенні:
const anotherReadonly: Readonly<Point3D> = { x: 999, y: -1 }; // ok, число будь-яке

// as const, навпаки, і робить readonly, і звужує значення до конкретних літералів:
const literalPoint = { x: 10, y: 20 } as const;
// тип x тут — саме readonly 10, а не "readonly будь-яке число"
```

Правило вибору: `Readonly<T>` — коли важлива лише незмінність, а конкретні значення можуть бути будь-якими (типова структура даних); `as const` — коли важливо зафіксувати саме ці значення (константи, enum-подібні об'єкти, конфігурації для literal union).

## 8. Пастка: as const не захищає в рантаймі (так само, як `Readonly<T>`)

`as const` — лише compile-time перевірка. Для справжнього захисту від мутації в рантаймі потрібен `Object.freeze()` (детально — `common/data-structures/Object/Object.md`):

```ts
const compileTimeOnly = { value: 1 } as const;
function unsafeMutation(obj: Record<string, unknown>) {
  obj.value = 999; // всередині функції obj має ширший, мутабельний тип
}
unsafeMutation(compileTimeOnly); // ⚠️ TS тут мовчить: readonly-об'єкт приймається як мутабельний
console.log(compileTimeOnly.value); // 999 — as const не захистив у рантаймі!
```

Зверни увагу на другу, менш очевидну проблему: TS дозволив передати `readonly`-об'єкт у параметр з мутабельним типом `Record<string, unknown>` без жодного попередження. `readonly` у TypeScript не заважає присвоюваності (readonly-тип вважається сумісним з мутабельним) — це відома «дірка» в системі типів, тож на `readonly` не можна покладатись як на гарантію, щойно об'єкт іде в чужий код.

Для реального, рантайм-незмінного значення поєднують обидва підходи:

```ts
const trulyFrozen = Object.freeze({ value: 1 } as const);
try {
  unsafeMutation(trulyFrozen);
} catch (err) {
  console.log((err as Error).message); // Cannot assign to read only property 'value' of object '#<Object>'
}
console.log(trulyFrozen.value); // 1 — тепер захищено і в рантаймі
```

Помилка кидається, бо код, скомпільований з `--strict`, виконується в strict mode (`--strict` вмикає `alwaysStrict`, і `tsc` додає `"use strict"`). У нестрогому режимі запис у заморожений об'єкт мовчки ігнорувався б, але значення так само лишилося б `1`.

## Шпаргалка

| Запис | Тип властивості `x` при `{ x: 10 }` | Мутація дозволена? |
|---|---|---|
| `let obj = { x: 10 }` | `number` | так (і змінна, і поле) |
| `const obj = { x: 10 }` | `number` (!) | поле — так, змінну — ні |
| `const obj = { x: 10 } as const` | `10` (літерал) | ні (readonly на compile-time) |
| `const obj: Readonly<{x:number}> = {x:10}` | `number` (widened) | ні (readonly, але тип широкий) |
| `Object.freeze({ x: 10 } as const)` | `10` (літерал) | ні навіть у рантаймі |

## Підсумок

- За замовчуванням TS «розширює» (widening) конкретні літерали до загальних типів (`string`/`number`) усередині об'єктів і масивів — навіть якщо сама змінна оголошена через `const` (`const` захищає лише binding змінної, а не типи властивостей усередині).
- `as const` вимикає це розширення: властивості об'єкта стають readonly з найвужчим (літеральним) типом; масив стає readonly tuple із конкретними значеннями на кожній позиції.
- Працює рекурсивно — на всіх рівнях вкладеності об'єкта/масиву.
- Найпоширеніше застосування: enum-подібний об'єкт без додаткового рантайм-коду, у зв'язці з `(typeof obj)[keyof typeof obj]`.
- Відрізняється від `Readonly<T>`: `as const` одночасно і робить readonly, і звужує значення до літералів; `Readonly<T>` лише додає readonly, залишаючи типи значень широкими.
- Як і `Readonly<T>`, `as const` — лише compile-time; до того ж readonly-об'єкт можна непомітно передати туди, де очікується мутабельний тип. Для реального рантайм-захисту потрібен `Object.freeze()`, і їх зазвичай комбінують: `Object.freeze({...} as const)`.
