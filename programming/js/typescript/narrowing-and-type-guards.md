# TypeScript: narrowing і type guards — звуження типу до конкретного варіанта

## 0. Загальна ідея

Narrowing (звуження) — процес, коли компілятор зменшує можливий набір типів змінної на основі коду, який ти написав (перевірка `typeof`, порівняння, оператор `in` тощо). Type guard — будь-який вираз, що дозволяє TS звузити тип у гілці коду після перевірки.

Найпростіший narrowing (`typeof`) згадувався в [union-and-intersection-types.md](union-and-intersection-types.md) — тут розглянуто всі способи звуження систематично.

## 1. typeof narrowing — для примітивів

```ts
function formatValue(value: string | number | boolean) {
  if (typeof value === "string") {
    return value.toUpperCase(); // тут value — точно string
  }
  if (typeof value === "number") {
    return value.toFixed(2); // тут value — точно number
  }
  return value ? "true" : "false"; // те, що лишилось, — точно boolean
}
console.log(formatValue("abc")); // ABC
console.log(formatValue(3.14159)); // 3.14
console.log(formatValue(true)); // true

// typeof розрізняє примітиви й функції, але всі об'єкти для нього — "object":
console.log(typeof (() => 1), typeof [], typeof null, typeof new Date()); // function object object object
```

`typeof` корисний для примітивів (`string`/`number`/`boolean`/`bigint`/`symbol`/`undefined`) і для функцій (`"function"`), але не розрізняє різні форми об'єктів: масиви, `null`, дати — усе `"object"` (про `typeof null` — [javascript.md](../javascript.md), розділ 4).

## 2. Truthiness narrowing — звуження через if (value)

Перевірка «значення truthy» (детально truthy/falsy — `common/type-coercion.md`) відкидає `null`/`undefined`/`""`/`0`/`NaN`/`false` з можливих варіантів усередині гілки:

```ts
function printName(name: string | null | undefined) {
  if (name) {
    console.log(name.toUpperCase()); // тут name — гарантовано string
  } else {
    console.log("no name given");
  }
}
printName("Maria"); // MARIA
printName(null); // no name given
printName(""); // no name given — порожній рядок теж falsy!
```

Пастка: truthiness-перевірка відкидає більше, ніж `null`/`undefined` — якщо порожній рядок чи `0` є легітимним значенням, а не «відсутністю даних», вона помилково відфільтрує і їх:

```ts
function printCount(count: number | null) {
  if (count) {
    console.log(`Count: ${count}`);
  } else {
    console.log("count not provided"); // ❗ але якщо count === 0 (легітимний нуль!) — потрапить сюди
  }
}
printCount(0); // count not provided — імовірно, не те, що очікувалось

// ✅ правильніше для чисел — явна перевірка саме на null:
function printCountSafe(count: number | null) {
  if (count !== null) {
    console.log(`Count: ${count}`); // 0 тепер обробляється коректно
  } else {
    console.log("count not provided");
  }
}
printCountSafe(0); // Count: 0
```

## 3. Equality narrowing — звуження через ===, !==, ==, !=

```ts
function compareValues(a: string | number, b: string | boolean) {
  if (a === b) {
    // TS звужує обидві змінні до типу, спільного для їхніх union —
    // тут це може бути лише string (єдиний тип, що є в обох)
    console.log(a.toUpperCase(), b.toUpperCase());
  }
}
compareValues("text", "text"); // TEXT TEXT
```

`== null` / `!= null` — ідіоматичний спосіб одразу відкинути і `null`, і `undefined` (чому саме `==` тут доречний — `common/type-coercion.md`):

```ts
function greetUser(name: string | null | undefined) {
  if (name != null) {
    console.log(`Hello, ${name.toUpperCase()}!`); // тут name — точно string
  }
}
greetUser("Ivan"); // Hello, IVAN!
greetUser(null); // нічого не виведе
greetUser(undefined); // нічого не виведе
```

## 4. instanceof narrowing — для класів

```ts
class ValidationError extends Error {
  field: string;
  constructor(field: string, message: string) {
    super(message);
    this.field = field;
  }
}
class NetworkError extends Error {
  statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

function handleError(error: Error) {
  if (error instanceof ValidationError) {
    console.log(`Validation error in field "${error.field}": ${error.message}`);
  } else if (error instanceof NetworkError) {
    console.log(`Network error (${error.statusCode}): ${error.message}`);
  } else {
    console.log(`Unknown error: ${error.message}`);
  }
}
handleError(new ValidationError("email", "Invalid format")); // Validation error in field "email": Invalid format
handleError(new NetworkError(404, "Not found")); // Network error (404): Not found
```

## 5. in narrowing — чи існує властивість (для об'єктів без спільного тегу)

Оператор `in` перевіряє, чи існує властивість на об'єкті — корисно для union-типів без явного «дискримінантного» поля:

```ts
type Fish = { swim: () => void };
type Bird = { fly: () => void };

function move(animal: Fish | Bird) {
  if ("swim" in animal) {
    animal.swim(); // тут TS звузив animal до Fish
  } else {
    animal.fly(); // тут — до Bird
  }
}
move({ swim: () => console.log("swims") }); // swims
move({ fly: () => console.log("flies") }); // flies
```

## 6. Discriminated union narrowing — найпоширеніший практичний патерн

```ts
type LoadingState = { status: "loading" };
type SuccessState = { status: "success"; data: string[] };
type ErrorState = { status: "error"; error: string };
type FetchState = LoadingState | SuccessState | ErrorState;

function renderState(state: FetchState): string {
  switch (state.status) {
    // "status" — спільне, "тегуюче" поле для всіх трьох
    case "loading":
      return "Loading...";
    case "success":
      return `Data: ${state.data.join(", ")}`; // тут TS знає про data
    case "error":
      return `Error: ${state.error}`; // тут TS знає про error
  }
}
console.log(renderState({ status: "loading" })); // Loading...
console.log(renderState({ status: "success", data: ["a", "b"] })); // Data: a, b
console.log(renderState({ status: "error", error: "something broke" })); // Error: something broke
```

Зверни увагу: функція з return-типом `string` не має `default` і фінального `return` — і TS не скаржиться, бо довів, що `switch` вичерпний. Якщо додати в `FetchState` четвертий варіант, з'явиться помилка «Function lacks ending return statement and return type does not include 'undefined'.»

## 7. Custom type guards — функції-предикати з `value is Type`

Якщо логіка перевірки складна і потрібна в багатьох місцях — можна написати власну функцію-перевірку, тип повернення якої записується як `параметр is Тип`. Це «обіцянка» компілятору: «якщо функція повернула `true`, вважай параметр саме цим типом».

```ts
type Cat = { kind: "cat"; meow: () => void };
type Dog = { kind: "dog"; bark: () => void };

function isCat(animal: Cat | Dog): animal is Cat {
  return animal.kind === "cat";
}

function makeSound(animal: Cat | Dog) {
  if (isCat(animal)) {
    animal.meow(); // TS довіряє isCat() і звужує до Cat
  } else {
    animal.bark(); // а тут — до Dog
  }
}
makeSound({ kind: "cat", meow: () => console.log("Meow!") }); // Meow!
makeSound({ kind: "dog", bark: () => console.log("Woof!") }); // Woof!
```

Якщо явно написати тип повернення `: boolean`, зв'язок з типом параметра втрачається:

```ts
function isCatBool(animal: Cat | Dog): boolean {
  return animal.kind === "cat";
}
function useBool(animal: Cat | Dog) {
  if (isCatBool(animal)) {
    // animal.meow(); // ❌ Property 'meow' does not exist on type 'Cat | Dog'.
  }
}
```

А ось без жодної анотації — починаючи з TypeScript 5.5 — компілятор сам виводить предикат (inferred type predicates), якщо тіло функції — проста перевірка:

```ts
function isCatInferred(animal: Cat | Dog) {
  return animal.kind === "cat"; // TS 5.5+ виводить тип: (animal) => animal is Cat
}
function useInferred(animal: Cat | Dog) {
  if (isCatInferred(animal)) animal.meow(); // звуження працює
}
```

Практичне застосування — перевірка довільних вхідних даних (парсинг JSON/API-відповіді):

```ts
function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function processUnknownInput(input: unknown) {
  if (isStringArray(input)) {
    console.log(input.join(", ")); // тут TS знає, що input — string[]
  } else {
    console.log("invalid input format");
  }
}
processUnknownInput(["a", "b", "c"]); // a, b, c
processUnknownInput([1, 2, 3]); // invalid input format
```

Важливо: TS не перевіряє, чи тіло функції-предиката правдиве. Якщо в `isStringArray` помилитись у логіці, компілятор все одно повірить `value is string[]` — предикат так само «на совісті» автора, як і `as`.

## 8. Assertion functions — `asserts value is Type` (кидають помилку, а не boolean)

Схожі на custom type guards, але не повертають `boolean` — замість цього кидають помилку, якщо умова не виконана. Після виклику такої функції (без `if`!) TS звужує тип на весь залишок коду нижче:

```ts
function assertIsString(value: unknown): asserts value is string {
  if (typeof value !== "string") {
    throw new TypeError("Expected a string");
  }
}

function processValue(value: unknown) {
  assertIsString(value); // якщо тут не кинуло помилку — value точно string
  console.log(value.toUpperCase()); // ✅ без if — TS вже звузив тип вище
}
processValue("text"); // TEXT
try {
  processValue(42);
} catch (err) {
  console.log((err as Error).message); // Expected a string
}
```

Різниця з custom type guard: `is` звужує тип лише всередині if-гілки; `asserts` — для всього коду після виклику.

## 9. Коли narrowing «зникає» — і коли, навпаки, небезпечно лишається

Перший випадок — колбеки. Колбек може виконатись пізніше, коли змінну вже перепризначили, тому TS не переносить звуження `let`-змінної всередину функції, якщо після неї є присвоєння:

```ts
function closureLoss() {
  let v: string | number = "abc";
  if (typeof v === "string") {
    // const later = () => v.toUpperCase(); // ❌ Property 'toUpperCase' does not exist on type 'string | number'.
  }
  v = 1; // через це присвоєння звуження всередині колбека не діє
}
```

Починаючи з TypeScript 5.4, якщо після звуження присвоєнь немає, звуження всередині замикання зберігається:

```ts
function closureKept() {
  let v: string | number = Math.random() > 2 ? 1 : "abc";
  if (typeof v === "string") {
    const later = () => v.toUpperCase(); // ок у TS 5.4+
    console.log(later()); // ABC
  }
}
closureKept();
```

Другий випадок — навпаки, і він небезпечніший. Звуження властивості об'єкта (`obj.value`) TS зберігає навіть після виклику функції, яка могла цю властивість змінити. Компілятор не аналізує тіло викликаної функції і оптимістично вважає, що нічого не змінилось:

```ts
const box: { value: string | number } = { value: "text" };
function sneakyMutation() {
  box.value = 42;
}

function useBox(obj: { value: string | number }) {
  if (typeof obj.value === "string") {
    sneakyMutation(); // змінює obj.value на число
    try {
      console.log(obj.value.toUpperCase()); // TS не бачить проблеми...
    } catch (err) {
      console.log((err as Error).message); // obj.value.toUpperCase is not a function — ...а в рантаймі падає
    }
  }
}
useBox(box);
```

> ⚠️ Виправлено відносно оригінального файлу: там стверджувалось, що звуження `obj.prop` «часто злітає» після будь-якого виклику функції між перевіркою й використанням. Перевірка на TS 5.8 показує протилежне: звуження зберігається (це свідомий компроміс команди TypeScript — інакше майже будь-який виклик функції ламав би narrowing). Тому реальна небезпека — не зайва помилка компіляції, а відсутня: код компілюється і падає в рантаймі.

Надійний патерн — скопіювати значення в локальну `const` перед перевіркою. Тоді звужене значення справді не може змінитись, хай що робить решта коду:

```ts
function demoSafePattern(obj: { value: string | number }) {
  const value = obj.value; // копія в const
  if (typeof value === "string") {
    sneakyMutation(); // змінює obj.value на 42, але не нашу копію
    console.log(value.toUpperCase()); // надійно: value — незмінний рядок
    console.log(obj.value); // 42 — сам об'єкт таки змінився
  }
}
box.value = "text"; // попередній приклад уже записав туди 42
demoSafePattern(box);
// TEXT
// 42
```

## Шпаргалка: який спосіб narrowing обрати

| Ситуація | Спосіб звуження |
|---|---|
| union із примітивів (`string \| number \| boolean`) | `typeof` |
| потрібно відкинути `null`/`undefined` | `!= null` / `!== null` |
| union з класів | `instanceof` |
| union об'єктів без спільного поля-тегу | `in` (перевірка властивості) |
| union об'єктів зі спільним полем-тегом (найкраще!) | discriminated union + `switch` |
| складна власна перевірка, потрібна багато разів | custom type guard (`is`) |
| треба кинути помилку й звузити решту коду одразу | assertion function (`asserts`) |
| значення може змінитись між перевіркою і використанням | скопіювати в локальну `const` |

## Підсумок

- Narrowing — процес, коли TS звужує union-тип до конкретного варіанта всередині гілки коду на основі перевірки, яку ти написав.
- `typeof` — для примітивів і функцій; truthiness (`if (value)`) — простий, але може помилково відкинути легітимні falsy-значення (`0`, `""`).
- `== null` / `!= null` — ідіоматичний спосіб одразу відкинути і `null`, і `undefined`.
- `instanceof` — для union із класів; `in` — для union об'єктів без спільного поля-мітки.
- Discriminated union + `switch` — найнадійніший патерн; компілятор сам простежує вичерпність варіантів.
- Custom type guard (`value is Type`) — власна перевірка для повторного використання; з TS 5.5 простий предикат виводиться й без анотації; явне `: boolean` звуження вимикає. Правдивість предиката TS не перевіряє.
- Assertion function (`asserts value is Type`) кидає помилку й звужує тип на весь код після виклику, без `if`.
- Звуження `let`-змінної не переходить у колбек, якщо змінну потім перепризначають (з TS 5.4 — переходить, якщо не перепризначають).
- Звуження властивості `obj.prop` TS зберігає навіть після викликів, що могли її змінити — це може призвести до падіння в рантаймі; надійний захист — копія в локальну `const`.
