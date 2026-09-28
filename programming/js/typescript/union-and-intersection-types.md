# TypeScript: union та intersection types — об'єднання та перетини типів

## 0. Загальна ідея

Union (`|`) і intersection (`&`) — два способи комбінувати типи, які вже існують, замість того щоб описувати кожну комбінацію заново. Це безпосереднє рішення проблеми, яку в чистому JS доводиться тримати «в голові»: функція/змінна може приймати набір можливих форм даних, і TS дозволяє записати це явно.

- `A | B` → значення є `A` або `B` (щось одне з двох);
- `A & B` → значення є одночасно і `A`, і `B` (усі поля з обох).

Твердження про типи перевіряються помічником `assertType<Equal<A, B>>()` (як він працює — [infer.md](infer.md)):

```ts
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
function assertType<_ extends true>() {}
```

## 1. Union types (`|`) — «це або те»

Union позначає, що значення може бути одним із кількох перелічених типів — саме так у JS зазвичай поводиться змінна, коли розробник сам тримає в голові «тут або число, або рядок»:

```ts
let id: number | string;
id = 42; // ok
id = "abc123"; // ok
// id = true; // ❌ Type 'boolean' is not assignable to type 'string | number'.
```

У чистому JS той самий факт («`id` — число або рядок») живе лише в голові розробника й у коментарях: `let idJS = 42; idJS = true;` — жодного попередження.

## 2. Union у параметрах функцій — найчастіше застосування

```ts
function formatId(id: number | string): string {
  return `ID-${id}`;
}
console.log(formatId(42)); // ID-42
console.log(formatId("abc123")); // ID-abc123
```

## 3. Narrowing — звуження union до конкретного типу перед використанням

Компілятор дозволяє викликати лише ті методи/операції, які є спільними для всіх варіантів union — інакше він не може гарантувати безпеку. Щоб отримати доступ до методів лише одного з варіантів, треба спершу «звузити» (narrow) тип перевіркою (усі способи — [narrowing-and-type-guards.md](narrowing-and-type-guards.md)):

```ts
function printId(id: number | string) {
  // id.toUpperCase(); // ❌ Property 'toUpperCase' does not exist on type 'string | number'.
  // (toUpperCase є лише в string, а не в number)

  if (typeof id === "string") {
    console.log(id.toUpperCase()); // ✅ тут TS знає, що id — саме string
  } else {
    console.log(id.toFixed(2)); // ✅ а тут — що id саме number
  }
}
printId(42); // 42.00
printId("abc123"); // ABC123
```

`typeof` — найпростіший спосіб звуження для примітивів. Для кількох форм об'єктів у union використовують «дискримінантне» поле:

```ts
type SuccessResponse = { status: "success"; data: string[] };
type ErrorResponse = { status: "error"; message: string };
type ApiResponse = SuccessResponse | ErrorResponse; // discriminated union — об'єднання зі спільним полем-міткою status

function handleResponse(response: ApiResponse) {
  if (response.status === "success") {
    console.log(response.data.join(", ")); // TS звузив до SuccessResponse
  } else {
    console.log(`Error: ${response.message}`); // TS звузив до ErrorResponse
  }
}
handleResponse({ status: "success", data: ["a", "b"] }); // a, b
handleResponse({ status: "error", message: "not found" }); // Error: not found
```

## 4. Literal types у union — «enum-подібний» набір дозволених значень

Union може складатися не лише з «широких» типів (`string`, `number`), а й з конкретних, літеральних значень — тоді дозволені лише саме ці значення:

```ts
type Direction = "up" | "down" | "left" | "right";
function move(direction: Direction) {
  console.log(`move: ${direction}`);
}
move("up"); // move: up
// move("north"); // ❌ Argument of type '"north"' is not assignable to parameter of type 'Direction'.

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";
function request(url: string, method: HttpMethod = "GET") {
  console.log(`${method} ${url}`);
}
request("/users"); // GET /users
request("/users", "POST"); // POST /users
// request("/users", "PATCH"); // ❌ Argument of type '"PATCH"' is not assignable to parameter of type 'HttpMethod | undefined'.
// (| undefined — бо параметр зі значенням за замовчуванням можна пропустити)
```

У чистому JS для того самого «enum» зазвичай пишуть об'єкт зі сталими значеннями (`Object.freeze` + `Symbol`, [Symbol.md](../common/data-structures/Symbol/Symbol.md)) — але це лише рантайм-захист, а не перевірка на етапі компіляції. Порівняння literal union з `enum` — [enums.md](enums.md).

## 5. Intersection types (`&`) — «це й те одночасно»

Intersection об'єднує кілька типів в один, що має мати всі поля з кожного з них одночасно — протилежність union:

```ts
type Named = { name: string };
type Aged = { age: number };
type Person = Named & Aged; // має мати і name, і age

const person: Person = { name: "Iryna", age: 30 }; // обидва поля обов'язкові
// const incomplete: Person = { name: "Iryna" }; // ❌ Type '{ name: string; }' is not assignable to type 'Person'.
// (далі: Property 'age' is missing in type '{ name: string; }' but required in type 'Aged'.)
```

## 6. Найчастіше застосування intersection: «додавання» полів

Intersection зручний для комбінування «базових» типів у більш специфічні без повторного опису спільних полів (аналог міксинів з `common/prototypal-inheritance.js`, але на рівні системи типів):

```ts
type Timestamped = { createdAt: Date };
type Identifiable = { id: number };

type Entity = Identifiable & Timestamped; // спільна "база" для будь-якої сутності
type User = Entity & { email: string }; // User = id + createdAt + email
type Product = Entity & { price: number }; // Product = id + createdAt + price

const newUser: User = {
  id: 1,
  createdAt: new Date(),
  email: "user@example.com",
};
const newProduct: Product = {
  id: 100,
  createdAt: new Date(),
  price: 29.99,
};
console.log(newUser.email, newProduct.price); // user@example.com 29.99
```

## 7. Intersection, що дає `never` (поширена пастка)

Intersection двох несумісних примітивних типів не має жодного реального значення, яке відповідало б обом — TS зводить такий тип до `never` ([basic-types.md](basic-types.md)):

```ts
type ImpossibleType = string & number;
assertType<Equal<ImpossibleType, never>>();
// let impossible: ImpossibleType = "text"; // ❌ Type '"text"' is not assignable to type 'never'.
```

Для об'єктів є дві різні поведінки. Якщо конфліктує звичайне поле — `never` стає лише це поле (приклад з `id: number & string` — [interface-vs-type.md](interface-vs-type.md), розділ 5). А якщо конфліктує поле-мітка з літеральними типами (як `status` чи `kind`), TS зводить до `never` увесь об'єктний тип — бо об'єкт не може бути водночас і `"a"`, і `"b"`:

```ts
type A = { kind: "a"; x: number };
type B = { kind: "b"; y: number };
assertType<Equal<A & B, never>>(); // увесь тип — never, а не лише kind
```

## 8. Масиви й функції — неочевидні відмінності

Масив з union-елементами і union масивів — різні речі:

```ts
// (number | string)[] — один масив, де кожен елемент може бути будь-якого з типів:
const mixedArray: (number | string)[] = [1, "two", 3, "four"];

// number[] | string[] — або масив лише чисел, або масив лише рядків:
const onlyNumbers: number[] | string[] = [1, 2, 3];
// const notAllowed: number[] | string[] = [1, "two"]; // ❌ Type '(string | number)[]' is not assignable to type 'string[] | number[]'.
```

(Порядок членів union у повідомленнях — `string[] | number[]` замість написаного `number[] | string[]` — визначає внутрішній порядок створення типів у компіляторі, тож у різних файлах він може відрізнятись; на сенс це не впливає.)

Перетин функції та об'єкта — функція, яка також має властивості (callable + методи):

```ts
type Loggable = { log: (msg: string) => void };
type Callable = (msg: string) => void;
type LoggerFunction = Callable & Loggable; // функція, яка також має метод .log

function makeLogger(): LoggerFunction {
  // Object.assign повертає тип Callable & { log }, тож TS перевіряє, що .log справді є
  return Object.assign((msg: string) => console.log(msg), {
    log: (msg: string) => console.log(`[LOG] ${msg}`),
  });
}
const logger = makeLogger();
logger("plain call"); // plain call
logger.log("via the log method"); // [LOG] via the log method
```

Часто трапляється інший варіант — з приведенням `as`: `const fn = ((msg) => ...) as LoggerFunction; fn.log = ...;`. Він компілюється, але якщо забути рядок з `fn.log = ...`, TS не помітить — `as` вимикає перевірку:

```ts
function makeBrokenLogger(): LoggerFunction {
  const fn = ((msg: string) => console.log(msg)) as LoggerFunction; // .log так і не додали
  return fn;
}
try {
  makeBrokenLogger().log("x"); // компілюється...
} catch (err) {
  console.log((err as Error).message); // makeBrokenLogger(...).log is not a function — ...і падає в рантаймі
}
```

З `Object.assign` та сама помилка ловиться компілятором:

```ts
// function makeMissing(): LoggerFunction { return Object.assign((msg: string) => {}, {}); } // ❌ Type '(msg: string) => void' is not assignable to type 'LoggerFunction'.
```

## Шпаргалка: union vs intersection

| Критерій | Union (`\|`) | Intersection (`&`) |
|---|---|---|
| Сенс | «одне з перелічених» | «усі перелічені одночасно» |
| Доступні поля | лише спільні для всіх варіантів | усі поля з кожного типу |
| Типове застосування | параметр, що приймає кілька форм | комбінування «базових» типів у складніший |
| З примітивами | природно (`number \| string`) | несумісні дають `never` (`string & number`) |
| Потрібне звуження | так, перед використанням специфічних полів | ні, усі поля доступні одразу |

## Підсумок

- Union (`A | B`) — значення може бути одним із перелічених типів; напряму доступні лише операції, спільні для всіх варіантів, для решти потрібне звуження.
- Intersection (`A & B`) — значення має відповідати всім типам одночасно; для об'єктів — «має всі поля з обох»; несумісні примітиви дають `never`.
- Конфлікт звичайного поля в intersection робить `never` лише це поле, а конфлікт поля-мітки з літералами — увесь об'єктний тип.
- Literal types у union (`"up" | "down"`) — compile-time набір дозволених значень, якого в чистому JS немає.
- Discriminated union (поле-мітка, напр. `status`) — найпоширеніший практичний патерн: TS автоматично звужує тип усередині `if`/`switch`.
- `(A | B)[]` (масив змішаних елементів) і `A[] | B[]` (однорідний масив одного з типів) — різні типи.
- Для «функції з властивостями» краще `Object.assign`, ніж `as`: приведення типу мовчки пропустить забуту властивість.
