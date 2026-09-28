# TypeScript: utility types — вбудовані generic-и для трансформації існуючих типів

## 0. Загальна ідея

Utility types — готові, вбудовані в TypeScript generic-типи (механіка generics — [generics.md](generics.md)), які беруть вже існуючий тип і повертають його трансформовану версію — без потреби переписувати структуру вручну. Більшість із них побудовані на mapped types (перебір усіх ключів існуючого типу за шаблоном) і conditional types (тип, що залежить від умови; [infer.md](infer.md)).

Твердження про типи перевіряються помічником `assertType<Equal<A, B>>()` (як він працює — [infer.md](infer.md)). Усі приклади нижче використовують один і той самий `User`:

```ts
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
function assertType<_ extends true>() {}

interface User {
  id: number;
  name: string;
  email: string;
  age: number;
}
```

## 1. Partial<T> — усі поля стають необов'язковими

`Partial<T>` перетворює кожне поле `T` на `поле?: Тип` — зручно для «часткового оновлення» об'єкта (patch-подібні операції):

```ts
function updateUser(user: User, updates: Partial<User>): User {
  return { ...user, ...updates };
}

const existingUser: User = { id: 1, name: "Oleg", email: "oleg@example.com", age: 30 };
const updatedUser = updateUser(existingUser, { age: 31 }); // можна передати лише те, що змінюється
console.log(updatedUser); // { id: 1, name: 'Oleg', email: 'oleg@example.com', age: 31 }

// updateUser(existingUser, { id: "abc" }); // ❌ Type 'string' is not assignable to type 'number'.
```

Пастка: `Partial` дозволяє не лише пропустити поле, а й явно передати `undefined` — і spread перезапише ним обов'язкове поле:

```ts
const brokenUser = updateUser(existingUser, { age: undefined }); // компілюється
console.log(brokenUser.age); // undefined — хоча тип каже, що age: number
```

TS за замовчуванням не розрізняє «поля немає» і «поле є, але `undefined`». Прапорець `exactOptionalPropertyTypes` (не входить у `--strict`) це виправляє — з ним той самий виклик дає помилку:

```text
Argument of type '{ age: undefined; }' is not assignable to parameter of type 'Partial<User>'
with 'exactOptionalPropertyTypes: true'. ...
  Types of property 'age' are incompatible.
    Type 'undefined' is not assignable to type 'number'.
```

## 2. Required<T> — усі поля стають обов'язковими (протилежність Partial)

```ts
interface UserDraft {
  name?: string;
  email?: string;
}

function createUser(draft: Required<UserDraft>): void {
  // тут гарантовано є обидва поля — Required прибрав "?" з кожного
  console.log(`Creating user: ${draft.name} <${draft.email}>`);
}
createUser({ name: "Maria", email: "maria@example.com" }); // Creating user: Maria <maria@example.com>
// createUser({ name: "Maria" }); // ❌ Argument of type '{ name: string; }' is not assignable to parameter of type 'Required<UserDraft>'.
// (далі: Property 'email' is missing in type '{ name: string; }' but required in type 'Required<UserDraft>'.)
```

## 3. Readonly<T> — усі поля стають readonly (лише compile-time)

```ts
const frozenUser: Readonly<User> = { id: 1, name: "Iryna", email: "iryna@example.com", age: 25 };
// frozenUser.age = 26; // ❌ Cannot assign to 'age' because it is a read-only property.
```

`Readonly<T>` — лише compile-time перевірка, у рантаймі вона нічого не захищає. Більше того, readonly-об'єкт можна передати у функцію з мутабельним параметром — без жодного приведення типів:

```ts
function unsafeMutate(obj: { age: number }) {
  obj.age = 999;
}
unsafeMutate(frozenUser); // ⚠️ компілюється: readonly не впливає на присвоюваність
console.log(frozenUser.age); // 999 — Readonly не захистив
```

> ⚠️ Уточнення відносно оригінального файлу: там для цього «обходу» використовувалось `frozenUser as unknown as { age: number }`, ніби без приведення TS не пропустив би виклик. Насправді приведення не потрібне — TS вважає readonly-тип сумісним з мутабельним (докладніше — [const-assertions.md](const-assertions.md), розділ 8).

Для справжнього рантайм-захисту потрібен `Object.freeze()` (`common/data-structures/Object/Object.md`): `Readonly<T>` — дисципліна коду на етапі компіляції, `Object.freeze()` — реальна незмінність у пам'яті.

## 4. Pick<T, Keys> — залишити лише вибрані поля

```ts
type UserPreview = Pick<User, "id" | "name">;
assertType<Equal<UserPreview, { id: number; name: string }>>();

const preview: UserPreview = { id: 1, name: "Oleg" };
console.log(preview); // { id: 1, name: 'Oleg' }
// const invalidPreview: UserPreview = { id: 1, name: "Oleg", email: "x" }; // ❌ Object literal may only specify known properties, and 'email' does not exist in type 'UserPreview'.
```

## 5. Omit<T, Keys> — прибрати вибрані поля (протилежність Pick)

```ts
type UserWithoutEmail = Omit<User, "email">;
assertType<Equal<UserWithoutEmail, { id: number; name: string; age: number }>>();

const noEmailUser: UserWithoutEmail = { id: 2, name: "Nastia", age: 22 };
console.log(noEmailUser); // { id: 2, name: 'Nastia', age: 22 }

// типове застосування Pick/Omit — форма даних для конкретного сценарію
// (форма реєстрації, публічний профіль) без повторного написання interface:
type UserRegistrationInput = Omit<User, "id">; // id генерується сервером
function registerUser(input: UserRegistrationInput): User {
  return { id: 42, ...input };
}
console.log(registerUser({ name: "Taras", email: "taras@example.com", age: 27 }));
// { id: 42, name: 'Taras', email: 'taras@example.com', age: 27 }
```

Пастка: на відміну від `Pick`, `Omit` не перевіряє, що ключ існує (його параметр обмежений `keyof any`, а не `keyof T`). Помилка в назві поля мовчки нічого не прибирає:

```ts
type TypoOmit = Omit<User, "emial">; // друкарська помилка — жодної скарги
assertType<Equal<TypoOmit, User>>(); // email так і лишився в типі
```

## 6. Record<Keys, ValueType> — об'єкт із відомими ключами й однаковим типом значень

```ts
type Role = "admin" | "editor" | "viewer";
const rolePermissions: Record<Role, string[]> = {
  admin: ["read", "write", "delete"],
  editor: ["read", "write"],
  viewer: ["read"],
};
console.log(rolePermissions.editor); // [ 'read', 'write' ]
// rolePermissions.superadmin = ["read"]; // ❌ Property 'superadmin' does not exist on type 'Record<Role, string[]>'.

// Record<Role, ...> змушує вказати значення для кожного варіанта Role:
// const incompletePermissions: Record<Role, string[]> = { admin: ["read"], editor: ["read"] }; // ❌ Property 'viewer' is missing in type '{ admin: string[]; editor: string[]; }' but required in type 'Record<Role, string[]>'.
```

`Record<string, T>` — поширений спосіб типізувати «словник» з довільними рядковими ключами. Але він стверджує, що будь-який ключ існує:

```ts
const wordCounts: Record<string, number> = { hello: 3, world: 1 };
console.log(wordCounts["hello"]); // 3

const missing = wordCounts["nope"];
assertType<Equal<typeof missing, number>>(); // TS каже: number...
console.log(missing); // undefined — ...а в рантаймі ключа немає
```

Прапорець `noUncheckedIndexedAccess` (теж не входить у `--strict`) додає `| undefined` до результату такого доступу, змушуючи перевірити значення:

```text
const n: number = wordCounts["nope"];
error: Type 'number | undefined' is not assignable to type 'number'.
```

Для словника, в який додають і з якого видаляють ключі, часто зручніше `Map` ([Map.md](../common/data-structures/Map/Map.md)) — його `get()` чесно повертає `T | undefined`.

## 7. Exclude<T, U> / Extract<T, U> — фільтрація всередині union

```ts
type AllStatuses = "pending" | "active" | "completed" | "cancelled" | "error";

type ActiveStatuses = Exclude<AllStatuses, "cancelled" | "error">;
assertType<Equal<ActiveStatuses, "pending" | "active" | "completed">>();

type FinalStatuses = Extract<AllStatuses, "completed" | "cancelled" | "error">;
assertType<Equal<FinalStatuses, "completed" | "cancelled" | "error">>();

const currentStatus: ActiveStatuses = "active"; // ok
// const badStatus: ActiveStatuses = "error"; // ❌ Type '"error"' is not assignable to type 'ActiveStatuses'.
console.log(currentStatus); // active
```

Мнемоніка: `Exclude` «викидає» перелічені варіанти з union, `Extract` «залишає лише» ті, що перетинаються з другим union — вони дзеркальні. Обидва — distributive conditional types ([infer.md](infer.md), розділ 6).

## 8. NonNullable<T> — прибрати null та undefined з типу

```ts
type MaybeName = string | null | undefined;
type DefiniteName = NonNullable<MaybeName>;
assertType<Equal<DefiniteName, string>>();

function printDefiniteName(name: DefiniteName) {
  console.log(name.toUpperCase()); // безпечно — тут гарантовано string
}
printDefiniteName("Olena"); // OLENA
// printDefiniteName(null); // ❌ Argument of type 'null' is not assignable to parameter of type 'string'.
```

Корисно, коли тип беремо з іншого місця (через `typeof` чи generic-параметр) і знаємо, що в цьому сценарії `null`/`undefined` вже виключені (наприклад, після narrowing — [narrowing-and-type-guards.md](narrowing-and-type-guards.md)).

## 9. ReturnType<T> / Parameters<T> — «витягти» типи з сигнатури функції

```ts
function createPoint(x: number, y: number) {
  return { x, y, magnitude: Math.hypot(x, y) };
}

type Point = ReturnType<typeof createPoint>;
assertType<Equal<Point, { x: number; y: number; magnitude: number }>>();
// typeof тут — TS-оператор "візьми тип цього значення", а не рантайм-typeof
// (різниця — typeof-and-keyof.md)

const samplePoint: Point = { x: 3, y: 4, magnitude: 5 };
console.log(samplePoint); // { x: 3, y: 4, magnitude: 5 }

type CreatePointArgs = Parameters<typeof createPoint>;
assertType<Equal<CreatePointArgs, [x: number, y: number]>>(); // tuple з аргументів (з іменами як мітками)

function callWithLoggedArgs(...args: CreatePointArgs) {
  console.log("calling with args:", args);
  return createPoint(...args);
}
console.log(callWithLoggedArgs(1, 2));
// calling with args: [ 1, 2 ]
// { x: 1, y: 2, magnitude: 2.23606797749979 }
```

Найбільша перевага: якщо сигнатура `createPoint` зміниться, `Point` і `CreatePointArgs` оновляться автоматично. Як ці типи побудовані всередині — [infer.md](infer.md).

## 10. Awaited<T> — «розгорнути» тип із Promise (TS 4.5+)

```ts
async function fetchUserById(id: number): Promise<User> {
  // умовний асинхронний запит
  return { id, name: "Loaded user", email: "loaded@example.com", age: 0 };
}

type FetchedUser = Awaited<ReturnType<typeof fetchUserById>>;
assertType<Equal<FetchedUser, User>>(); // User, а не Promise<User>
assertType<Equal<Awaited<Promise<Promise<User>>>, User>>(); // розгортає й вкладені

async function useAwaited() {
  const user: FetchedUser = await fetchUserById(1);
  console.log(user.name); // Loaded user
}
useAwaited();
```

## 11. Комбінування utility types — реальний приклад

Utility types часто комбінують: «форма для оновлення» — усі поля, окрім `id`, і всі необов'язкові:

```ts
type UserUpdatePayload = Partial<Omit<User, "id">>;

function patchUser(id: number, payload: UserUpdatePayload): void {
  console.log(`Updating user ${id}:`, payload);
}
patchUser(1, { age: 32 }); // Updating user 1: { age: 32 }
patchUser(2, { name: "New name", age: 40 }); // Updating user 2: { name: 'New name', age: 40 }
// patchUser(3, { id: 999 }); // ❌ Object literal may only specify known properties, and 'id' does not exist in type 'Partial<Omit<User, "id">>'.
```

## Шпаргалка

| Утиліта | Що робить |
|---|---|
| `Partial<T>` | усі поля → необов'язкові (`?`) |
| `Required<T>` | усі поля → обов'язкові (прибирає `?`) |
| `Readonly<T>` | усі поля → readonly (лише compile-time!) |
| `Pick<T, K>` | залишити лише перелічені поля `K` |
| `Omit<T, K>` | прибрати перелічені поля `K` (не перевіряє, що вони існують!) |
| `Record<K, V>` | об'єкт із ключами `K` і значеннями типу `V` |
| `Exclude<T, U>` | прибрати з union `T` варіанти, що є в `U` |
| `Extract<T, U>` | залишити з union `T` лише варіанти, що є в `U` |
| `NonNullable<T>` | прибрати `null` і `undefined` з `T` |
| `ReturnType<typeof fn>` | тип значення, яке повертає `fn` |
| `Parameters<typeof fn>` | tuple типів параметрів `fn` |
| `Awaited<T>` | «розгорнути» `Promise<T>` (рекурсивно) до типу значення |

## Підсумок

- Utility types — вбудовані generic-и, що трансформують вже існуючий тип, а не описують структуру з нуля.
- `Partial`/`Required`/`Readonly` змінюють «модальність» полів. `Partial` за замовчуванням пропускає явне `undefined` (виправляє `exactOptionalPropertyTypes`); `Readonly` — лише compile-time і не заважає передати об'єкт у мутуючу функцію.
- `Pick`/`Omit` — вибірка/виключення конкретних полів; `Omit` мовчки приймає неіснуючі ключі.
- `Record<K, V>` — типізований «словник»; для union-ключів змушує заповнити всі; `Record<string, T>` удає, що будь-який ключ існує (виправляє `noUncheckedIndexedAccess`).
- `Exclude`/`Extract` — дзеркальна фільтрація всередині union.
- `NonNullable` — прибирає `null`/`undefined` з типу.
- `ReturnType`/`Parameters`/`Awaited` — «витягують» типи із сигнатури функції, автоматично синхронізуючись з її змінами.
- Utility types часто комбінують (`Partial<Omit<T, "id">>`) для точного опису форми даних під сценарій без дублювання основного типу.
