# TypeScript: typeof і keyof — два оператори, що читають інформацію з коду в тип

## 0. Загальна ідея

`typeof` і `keyof` — два різні оператори TypeScript, які «видобувають» тип із чогось, що ти вже написав, замість того щоб описувати цей тип вручну заново. Вони не пов'язані один з одним напряму, але часто використовуються разом (`typeof x`, а потім `keyof typeof x`).

Найголовніша річ, яку треба зрозуміти ще до прикладів: у TypeScript існують два «простори» — простір значень (values, той самий JS, що виконується в рантаймі) і простір типів (types, існує лише на етапі компіляції). `typeof` і `keyof` — це «мости» з простору значень у простір типів.

Приклади нижче перевіряють твердження про типи через помічник `assertType<Equal<A, B>>()` (як він працює — [infer.md](infer.md)):

```ts
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
function assertType<_ extends true>() {}
```

## 1. typeof у JavaScript (простір значень) — що він робить у рантаймі

Це той самий `typeof`, що є в чистому JS (детально — `common/type-coercion.md`) — рантайм-оператор, що повертає рядок із назвою типу значення:

```ts
const runtimeValue = 42;
console.log(typeof runtimeValue); // number — це рядок, обчислений під час виконання

// у TS-файлах JS-typeof працює так само, коли стоїть у звичайному виразі:
function describeRuntime(value: unknown): string {
  return typeof value; // рантайм typeof — повертає "number"/"string"/... як рядок
}
console.log(describeRuntime("text")); // string
```

## 2. typeof у TypeScript (простір типів) — зовсім інша річ, названа однаково

Коли `typeof` застосовується в позиції типу (після двокрапки, у type alias тощо) — це вже інший оператор: «візьми тип цього значення, який TS вивів для нього», а не рядок-назву типу:

```ts
const configObject = {
  host: "localhost",
  port: 8080,
  debug: true,
};

type ConfigType = typeof configObject;
assertType<Equal<ConfigType, { host: string; port: number; debug: boolean }>>();

const anotherConfig: ConfigType = {
  host: "example.com",
  port: 443,
  debug: false,
};
console.log(anotherConfig); // { host: 'example.com', port: 443, debug: false }
// const invalidConfig: ConfigType = { host: "x", port: "443", debug: false }; // ❌ Type 'string' is not assignable to type 'number'.
```

Головна перевага: замість того щоб окремо написати `type`/`interface` і потім стежити, щоб об'єкт відповідав опису, `typeof` дозволяє спочатку написати реальний об'єкт, а тип «витягти» з нього автоматично — вони ніколи не розсинхронізуються.

## 3. Як відрізнити два typeof між собою

- `typeof` у звичайному виразі (там, де очікується значення) — рантайм-оператор JS, повертає рядок;
- `typeof` після двокрапки типу / у type alias (там, де очікується тип) — TS-оператор, повертає тип.

Обидва можуть зустрітися в одній функції, і компілятор безпомилково розрізняє їх за позицією:

```ts
function demoTwoTypeofs(value: number) {
  const runtimeCheck: string = typeof value; // ← рантайм typeof: "number" (рядок)
  type ValueType = typeof value; // ← TS typeof: тип number (не рядок!)
  const typed: ValueType = 100; // ValueType тут — просто number
  console.log(runtimeCheck, typed);
}
demoTwoTypeofs(5); // number 100
```

## 4. Найпоширеніше застосування TS typeof: тип із функції чи константи

```ts
// тип із самої функції (весь тип функції, разом із сигнатурою):
function calculateArea(width: number, height: number): number {
  return width * height;
}
type CalculateAreaFn = typeof calculateArea;
assertType<Equal<CalculateAreaFn, (width: number, height: number) => number>>();

function logAndCall(fn: CalculateAreaFn, ...args: Parameters<CalculateAreaFn>) {
  // Parameters<T> — utility type (utility-types.md): typeof і Parameters працюють разом
  console.log("calling with:", args);
  return fn(...args);
}
console.log(logAndCall(calculateArea, 5, 10));
// calling with: [ 5, 10 ]
// 50
```

Тип з enum-подібного об'єкта (детально `as const` — [const-assertions.md](const-assertions.md); без нього значення мали б ширший тип `string`):

```ts
const Colors = {
  RED: "red",
  GREEN: "green",
  BLUE: "blue",
} as const;

type ColorValue = (typeof Colors)[keyof typeof Colors];
assertType<Equal<ColorValue, "red" | "green" | "blue">>();
// тут typeof і keyof працюють разом: ключі Colors → типи значень за цими ключами

function paint(color: ColorValue) {
  console.log(`Painting with color: ${color}`);
}
paint(Colors.RED); // Painting with color: red
// paint("purple"); // ❌ Argument of type '"purple"' is not assignable to parameter of type 'ColorValue'.
```

## 5. keyof — union з усіх імен властивостей типу

`keyof T` повертає тип, що є union-ом усіх ключів об'єктного типу `T` (`string`-, `number`- і `symbol`-літералів) — literal union, той самий принцип, що й у [union-and-intersection-types.md](union-and-intersection-types.md):

```ts
interface Product {
  id: number;
  name: string;
  price: number;
}

type ProductKey = keyof Product;
assertType<Equal<ProductKey, "id" | "name" | "price">>();

function getProductField(product: Product, key: ProductKey) {
  return product[key];
}
const sampleProduct: Product = { id: 1, name: "Laptop", price: 25000 };
console.log(getProductField(sampleProduct, "name")); // Laptop
// getProductField(sampleProduct, "weight"); // ❌ Argument of type '"weight"' is not assignable to parameter of type 'keyof Product'.
```

У чистому JS звернення до `sampleProduct["weight"]` мовчки поверне `undefined` — `keyof` робить цю перевірку доступною на етапі компіляції.

Пастка з index signature: якщо тип описаний як «словник з рядковими ключами», `keyof` дає не `string`, а `string | number` — бо в JS числові ключі все одно перетворюються на рядки (`obj[1]` те саме, що `obj["1"]`):

```ts
type Dictionary = { [key: string]: unknown };
assertType<Equal<keyof Dictionary, string | number>>();
```

## 6. keyof + generic — чому працює `<T, K extends keyof T>`

Комбінація `<T, K extends keyof T>` ([generics.md](generics.md)) працює тому, що `keyof T` — звичайний union-тип, і його можна використати як обмеження для generic-параметра `K`:

```ts
function pluck<T, K extends keyof T>(obj: T, keys: K[]): T[K][] {
  return keys.map((key) => obj[key]);
}
console.log(pluck(sampleProduct, ["name", "price"])); // [ 'Laptop', 25000 ]
// pluck(sampleProduct, ["weight"]); // ❌ Type '"weight"' is not assignable to type 'keyof Product'.
```

## 7. keyof на typeof — найпоширеніша комбінація (покроково)

Чому в `ColorValue` з розділу 4 два оператори в одному рядку — розберемо на іншому прикладі:

```ts
const HttpStatusMessages = {
  200: "OK",
  404: "Not Found",
  500: "Internal Server Error",
} as const;

// крок 1: typeof — тип об'єкта
// { readonly 200: "OK"; readonly 404: "Not Found"; readonly 500: "Internal Server Error" }
type StatusMessagesType = typeof HttpStatusMessages;

// крок 2: keyof — union ключів (числові літерали, бо ключі числові!)
type StatusCode = keyof StatusMessagesType;
assertType<Equal<StatusCode, 200 | 404 | 500>>();

// крок 3: індексний доступ — тип значень за цими ключами
type StatusMessage = StatusMessagesType[StatusCode];
assertType<Equal<StatusMessage, "OK" | "Not Found" | "Internal Server Error">>();

function getStatusMessage(code: StatusCode): StatusMessage {
  return HttpStatusMessages[code];
}
console.log(getStatusMessage(404)); // Not Found
// getStatusMessage(999); // ❌ Argument of type '999' is not assignable to parameter of type '200 | 404 | 500'.

// той самий результат в один рядок:
type StatusMessageShort = (typeof HttpStatusMessages)[keyof typeof HttpStatusMessages];
const shortVersion: StatusMessageShort = "OK";
console.log(shortVersion); // OK
```

## 8. keyof на typeof масиву — відмінність від об'єкта

Для масиву `keyof` повертає не лише числові індекси, а й усі методи й службові властивості з `Array.prototype` — часта пастка для тих, хто очікує «лише індекси»:

```ts
const fruitsArray = ["apple", "banana", "cherry"];
type FruitsArrayKeys = keyof typeof fruitsArray;
// великий union: number | "length" | "push" | "pop" | ... — а не просто 0 | 1 | 2
assertType<Equal<Extract<FruitsArrayKeys, number>, number>>();
assertType<Equal<Extract<FruitsArrayKeys, "push" | "length">, "push" | "length">>();

// щоб отримати тип елементів масиву (а не ключі), використовують
// індексний доступ через number, а не keyof:
type FruitElement = (typeof fruitsArray)[number];
assertType<Equal<FruitElement, string>>();
const oneFruit: FruitElement = "orange";
console.log(oneFruit); // orange

// для tuple (масиву фіксованої довжини — basic-types.md) [number]-доступ
// дає union реальних типів елементів, що точніше:
const responseTuple = [200, "OK"] as const;
type ResponseTupleElement = (typeof responseTuple)[number];
assertType<Equal<ResponseTupleElement, 200 | "OK">>();
```

## 9. typeof над класом — тип екземпляра vs тип самого класу

```ts
class Repository {
  constructor(public name: string) {}
  save(item: string): void {
    console.log(`Saved "${item}" to repository ${this.name}`);
  }
}

const repo = new Repository("users");
type RepoInstanceType = typeof repo; // Repository — тип екземпляра
assertType<Equal<RepoInstanceType, Repository>>();
type RepoClassType = typeof Repository; // тип самого класу: конструктор + статичні члени + prototype

function createRepo(RepoClass: RepoClassType, name: string): RepoInstanceType {
  return new RepoClass(name); // typeof Repository дозволяє викликати new
}
const anotherRepo = createRepo(Repository, "products");
anotherRepo.save("new product"); // Saved "new product" to repository products

// const notAClass: RepoClassType = repo; // ❌ Property 'prototype' is missing in type 'Repository' but required in type 'typeof Repository'.
```

Важлива різниця: `repo: Repository` означає «значення — екземпляр класу», а `RepoClass: typeof Repository` — «значення — сам клас (конструктор), який можна викликати через `new`».

## Шпаргалка

| Оператор | Простір | Що повертає |
|---|---|---|
| `typeof x` (у виразі) | значення (JS) | рядок з назвою типу в рантаймі (`"number"` тощо) |
| `typeof x` (у позиції типу) | типи (TS) | тип значення `x`, виведений компілятором |
| `keyof T` | типи (TS) | union усіх імен властивостей типу `T` |
| `typeof Клас` | типи (TS) | тип конструктора (можна `new`), не екземпляра |
| `(typeof arr)[number]` | типи (TS) | тип елемента масиву/tuple (а не ключів!) |

## Підсумок

- `typeof` існує у двох зовсім різних ролях: рантайм-оператор JS (повертає рядок із назвою типу) і TS-оператор у позиції типу (повертає сам тип значення) — розрізняються лише за позицією в коді.
- TS `typeof` «витягує» тип із вже написаного значення/функції/класу замість ручного опису — тип і значення ніколи не розсинхронізуються.
- `keyof T` — union усіх імен властивостей об'єктного типу `T`; часто використовується як обмеження generic-параметра (`<T, K extends keyof T>`).
- Для рядкового index signature `keyof` дає `string | number`, а не `string`.
- `typeof` + `keyof` разом — найпоширеніший спосіб отримати union значень (а не ключів) з enum-подібного `as const`-об'єкта.
- Пастка: `keyof` масиву повертає `number` плюс усі методи `Array.prototype` — для типу елемента використовуй `(typeof arr)[number]`.
- `typeof Клас` дає тип конструктора (з `prototype` і статичними членами), `typeof екземпляр` — тип екземпляра (те саме, що ім'я класу в позиції типу).

## Задачі для закріплення

Двадцять задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Код виконуйте в TypeScript Playground чи через tsc.

### Рівень 1. Основи

**1.** Що поверне `typeof` у JS для різних значень?

```ts
[typeof 1, typeof 'a', typeof null, typeof undefined, typeof [], typeof (() => 1)]
```

**2.** `typeof` у просторі типів для змінної.

```ts
const cfg = { host: 'x', port: 80 };
type C = typeof cfg;
```

**3.** `typeof` для функції.

```ts
function f(a: number) { return a + 1; }
type F = typeof f;
```

**4.** `keyof` для об'єкта.

```ts
type P = { a: number; b: string };
type K = keyof P;
```

**5.** `keyof typeof` об'єкта значень.

```ts
const colors = { red: '#f00', blue: '#00f' };
type K = keyof typeof colors;
```

### Рівень 2. Деталі й поведінка

**6.** `keyof` для масиву.

```ts
type K = keyof string[];
```

**7.** `keyof` для індексної сигнатури.

```ts
type K = keyof { [k: string]: number };
```

**8.** Тип значення за ключем: `T[K]`.

```ts
type P = { a: number; b: string };
type V = P['b'];
```

**9.** Union значень: `T[keyof T]`.

```ts
type P = { a: number; b: string };
type V = P[keyof P];
```

**10.** Mapped type через `keyof`.

```ts
type P = { a: number; b: string };
type R = { [K in keyof P]: boolean };
```

### Рівень 3. Нюанси та пастки

**11.** Безпечний доступ за ключем.

```ts
function get<T, K extends keyof T>(o: T, k: K) { return o[k]; }
get({ a: 1 }, 'a');
```

**12.** Недійсний ключ.

```ts
type P = { a: number };
const k: keyof P = 'z';
```

**13.** `typeof` для enum-подібного об'єкта `as const`.

```ts
const D = { Up: 'u', Down: 'd' } as const;
type V = (typeof D)[keyof typeof D];
```

**14.** `typeof` для класу (конструктор) та `InstanceType`.

```ts
class A { x = 1 }
type C = typeof A;
type I = A;
```

**15.** `ReturnType<typeof fn>`.

```ts
const make = () => ({ id: 1, tags: ['a'] });
type T = ReturnType<typeof make>;
```

### Рівень 4. Практика

**16.** `keyof` для union типів (спільні ключі).

```ts
type A = { a: 1; c: 3 }; type B = { b: 2; c: 4 };
type K = keyof (A | B);
```

**17.** `keyof` для intersection.

```ts
type A = { a: 1 }; type B = { b: 2 };
type K = keyof (A & B);
```

**18.** Тип елемента кортежу за індексом.

```ts
type T = [string, number, boolean];
type X = T[1];
```

**19.** Чим `typeof` у JS відрізняється від `typeof` у типах?

**20.** Що повертає `keyof T`?

### Відповіді

1. `['number', 'string', 'object', 'undefined', 'object', 'function']`
2. `{ host: string; port: number; }`
3. `(a: number) => number`
4. `keyof P`
5. `"red" | "blue"`
6. `keyof string[]`
7. `string | number`
8. `string`
9. `string | number`
10. `{ a: boolean; b: boolean; }`
11. Компілюється без помилок
12. Помилка: `TS2322: Type '"z"' is not assignable to type '"a"'.`
13. `"u" | "d"`
14. `A`
15. `{ id: number; tags: string[]; }`
16. `"c"`
17. `"a" | "b"`
18. `number`
19. У виразах повертає рядок із назвою типу під час виконання; у позиції типу бере тип значення на етапі компіляції
20. Union рядкових/числових/символьних літералів — імен ключів типу `T`
