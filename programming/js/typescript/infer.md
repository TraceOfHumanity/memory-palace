# TypeScript: infer — «змінна типу» всередині conditional types

## 0. Загальна ідея

`infer` — ключове слово, яке можна використати лише всередині умови conditional type (`T extends ... ? ... : ...`, коротко — [interface-vs-type.md](interface-vs-type.md)). Воно оголошує нову «змінну типу» прямо всередині шаблону, якою TS заповнює «дірку» в структурі типу — і це значення можна потім використати в гілці `true` цього ж conditional type.

Найпростіша аналогія — деструктуризація, але на рівні типів, а не значень: так само, як `const { x } = point` «витягує» значення `x` зі змінної `point`, `infer U` «витягує» тип `U` з типу `T`.

## Як перевіряти твердження про типи

Коментар `// number` біля типу — лише обіцянка. Щоб компілятор сам перевіряв, що тип дорівнює очікуваному, у цій нотатці використовується невеликий помічник (популярний прийом з бібліотек на кшталт type-challenges):

```ts
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
function assertType<_ extends true>() {}

assertType<Equal<string, string>>(); // ок
// assertType<Equal<string, number>>(); // ❌ Type 'false' does not satisfy the constraint 'true'.
```

`Equal` порівнює типи суворо (на відміну від простого `A extends B`, який лише перевіряє сумісність). Якщо будь-яке твердження нижче стане хибним — файл перестане компілюватись.

## 1. Conditional types без infer (основа, на якій працює infer)

```ts
type IsString<T> = T extends string ? true : false;
type CheckA = IsString<"text">;
type CheckB = IsString<42>;
assertType<Equal<CheckA, true>>();
assertType<Equal<CheckB, false>>();
```

Тут `T extends string` — перевірка «чи `T` сумісний зі `string`». `infer` додає до цього можливість не просто перевірити, а й «витягти» якусь частину `T`, якщо перевірка пройшла.

## 2. Перший приклад: «витягти» тип елемента з масиву

Без `infer` ми вже вміємо брати тип елемента масиву через `(typeof arr)[number]` ([typeof-and-keyof.md](typeof-and-keyof.md)) — але це працює лише для конкретного значення (з `typeof`). Якщо ж є generic-тип «масив чогось» і потрібно дістати «щось» — знадобиться саме `infer`:

```ts
type ElementType<T> = T extends (infer U)[] ? U : never;
//                              ^^^^^^^^^^
//                              "якщо T — масив якогось типу U, візьми саме U"

assertType<Equal<ElementType<number[]>, number>>();
assertType<Equal<ElementType<string[]>, string>>();
assertType<Equal<ElementType<boolean>, never>>(); // boolean не масив → гілка false

const oneNumber: ElementType<number[]> = 42;
const oneString: ElementType<string[]> = "ok";
console.log(oneNumber, oneString); // 42 ok
```

Порівняння з `(typeof arr)[number]`: той бере тип елемента з реального значення `arr`, а `ElementType<T>` — з будь-якого типу `T`, навіть якщо жодного значення немає (наприклад, `T` прийшов як generic-параметр іншої функції).

## 3. Як побудований ReturnType<T>

Спрощена власна версія:

```ts
type MyReturnType<T extends (...args: never[]) => unknown> = T extends (...args: never[]) => infer R ? R : never;
//                                                                                       ^^^^^^^
//                                              "якщо T — функція, що повертає щось R, візьми саме R"

function createPoint(x: number, y: number) {
  return { x, y, magnitude: Math.hypot(x, y) };
}
type MyPoint = MyReturnType<typeof createPoint>;
assertType<Equal<MyPoint, { x: number; y: number; magnitude: number }>>();

const samplePoint: MyPoint = { x: 3, y: 4, magnitude: 5 };
console.log(samplePoint); // { x: 3, y: 4, magnitude: 5 }
```

А ось справжнє визначення зі стандартної бібліотеки (`lib.es5.d.ts`, TypeScript 5.8):

```text
type ReturnType<T extends (...args: any) => any> = T extends (...args: any) => infer R ? R : any;
type Parameters<T extends (...args: any) => any> = T extends (...args: infer P) => any ? P : never;
```

Ідея та сама, але зверни увагу на відмінності: бібліотека використовує `any` в обмеженні, а гілка «не функція» у `ReturnType` дає `any`, а не `never`. Тому `ReturnType`/`Parameters` ([utility-types.md](utility-types.md)) не «магічні» — це звичайні conditional types з `infer`, просто вже готові.

## 4. Як побудований Parameters<T> — infer з tuple

```ts
type MyParameters<T extends (...args: never[]) => unknown> = T extends (...args: infer P) => unknown ? P : never;
//                                                                                ^^^^^^^
//                                                   "візьми весь tuple аргументів як один тип P"

type CreatePointArgs = MyParameters<typeof createPoint>;
assertType<Equal<CreatePointArgs, [x: number, y: number]>>();

function callWithLoggedArgs(...args: CreatePointArgs) {
  console.log("calling with args:", args);
  return createPoint(...args);
}
console.log(callWithLoggedArgs(1, 2));
// calling with args: [ 1, 2 ]
// { x: 1, y: 2, magnitude: 2.23606797749979 }
```

## 5. Awaited<T> — infer «зазирає всередину» Promise

Спрощена версія:

```ts
type MyAwaited<T> = T extends Promise<infer V> ? V : T;
//                                    ^^^^^^^^
//                   "якщо T — Promise чогось V, візьми саме V"

async function fetchUserById(id: number) {
  return { id, name: "Loaded user" };
}
type FetchedUser = MyAwaited<ReturnType<typeof fetchUserById>>;
// ReturnType<typeof fetchUserById> — Promise<{ id: number; name: string }>,
// а MyAwaited "розгортає" Promise:
assertType<Equal<FetchedUser, { id: number; name: string }>>();

async function useAwaited() {
  const user: FetchedUser = await fetchUserById(1);
  console.log(user.name); // Loaded user
}
useAwaited();
```

Справжній вбудований `Awaited<T>` відрізняється двічі. По-перше, він рекурсивний — розгортає навіть `Promise<Promise<T>>`, а наш — лише один шар:

```ts
assertType<Equal<MyAwaited<Promise<Promise<number>>>, Promise<number>>>(); // лише один шар
assertType<Equal<Awaited<Promise<Promise<number>>>, number>>(); // до кінця
```

По-друге, він шукає не `Promise`, а будь-який «thenable» — об'єкт з методом `then`, як і сам оператор `await`. Спрощене визначення з `lib.es5.d.ts`:

```text
type Awaited<T> = T extends null | undefined ? T :
    T extends object & { then(onfulfilled: infer F, ...args: infer _): any; } ?
        F extends ((value: infer V, ...args: infer _) => any) ?
            Awaited<V> :   // рекурсивно розгортаємо значення
        never :
    T;
```

Тут одразу три `infer` в одному типі — і рекурсія, про яку далі.

## 6. Distributive conditional types — умова над union

Якщо conditional type застосувати до union-типу, TS обчислює його окремо для кожного члена union, а потім об'єднує результати:

```ts
type ElementOrSelf<T> = T extends (infer U)[] ? U : T;

type Mixed = ElementOrSelf<number[] | string | boolean[]>;
// number[]  → number
// string    → string (не масив, гілка T)
// boolean[] → boolean
assertType<Equal<Mixed, number | string | boolean>>();

const mixedValue: Mixed = "just a string"; // ok, string — один із варіантів
console.log(mixedValue); // just a string
```

Розподіл діє лише тоді, коли з лівого боку `extends` стоїть «голий» параметр типу. Якщо обгорнути його в tuple `[T]`, union перевіряється цілком:

```ts
type ElementTypeWhole<T> = [T] extends [(infer U)[]] ? U : never;
assertType<Equal<ElementType<number[] | boolean>, number>>(); // розподіл: boolean → never, зникає з union
assertType<Equal<ElementTypeWhole<number[] | boolean>, never>>(); // цілком: "number[] | boolean" не масив
assertType<Equal<ElementTypeWhole<number[] | string[]>, number | string>>();
```

## 7. Кілька infer в одній умові

Можна «витягти» одразу декілька частин типу за один conditional type:

```ts
type FirstAndRest<T> = T extends [infer First, ...infer Rest] ? [First, Rest] : never;

type SplitTuple = FirstAndRest<[string, number, boolean]>;
assertType<Equal<SplitTuple, [string, [number, boolean]]>>();

const splitResult: SplitTuple = ["text", [42, true]];
console.log(splitResult); // [ 'text', [ 42, true ] ]
```

Саме такий шаблон (`[infer First, ...infer Rest]`) лежить в основі багатьох «рекурсивних» бібліотечних типів, що обробляють tuple поелементно (наприклад, типізація каррінгу).

## 8. Рекурсивний infer — «розгорнути» вкладеність повністю

Conditional type може посилатись сам на себе — так виходить рекурсія на рівні типів. Класичний приклад — повне «розгортання» вкладених масивів (аналог `Array.prototype.flat(Infinity)` з [Array.md](../common/data-structures/Array/Array.md), але для типів):

```ts
type DeepFlatten<T> = T extends (infer U)[] ? DeepFlatten<U> : T;

type Nested = DeepFlatten<number[][][]>;
assertType<Equal<Nested, number>>(); // "пройшло" крізь усі три рівні

const deepValue: Nested = 42;
console.log(deepValue); // 42
```

Покроково:

```text
DeepFlatten<number[][][]>   (U = number[][])
→ DeepFlatten<number[][]>
→ DeepFlatten<number[]>
→ DeepFlatten<number>        ← number не масив → гілка T
→ number
```

## 9. Чому infer працює лише всередині extends

`infer` потребує «шаблону», з яким TS порівнюватиме `T`, щоб зрозуміти, яка саме частина відповідає інфер-змінній — саме conditional type (`T extends Шаблон ? ... : ...`) і дає цей шаблон. Поза ним «з чим порівнювати» просто немає:

```ts
// type Invalid<T> = infer U; // ❌ 'infer' declarations are only permitted in the 'extends' clause of a conditional type.
```

## 10. Практичний приклад: тип для «розпаковки» API-відповіді

Комбінація `infer` + discriminated union ([union-and-intersection-types.md](union-and-intersection-types.md)) — «дістати» тип `data` з успішної гілки відповіді API, не пишучи його вручну ще раз:

```ts
type ApiResult<T> = { status: "success"; data: T } | { status: "error"; message: string };

type ExtractData<T> = T extends { status: "success"; data: infer D } ? D : never;

type UserResult = ApiResult<{ name: string; age: number }>;
type ExtractedUserData = ExtractData<UserResult>;
assertType<Equal<ExtractedUserData, { name: string; age: number }>>();

function handleSuccess(data: ExtractedUserData) {
  console.log(data.name, data.age);
}
handleSuccess({ name: "Iryna", age: 30 }); // Iryna 30
```

Тут працює й розподіл з розділу 6: для гілки `error` умова хибна і дає `never`, який зникає з union — лишається тільки тип з гілки `success`.

## Шпаргалка

| Шаблон | Що «витягує» `infer` |
|---|---|
| `T extends (infer U)[] ? U : never` | тип елемента масиву |
| `T extends (...args: any) => infer R ? R : any` | тип результату функції (як `ReturnType`) |
| `T extends (...args: infer P) => any ? P : never` | tuple аргументів функції (як `Parameters`) |
| `T extends Promise<infer V> ? V : T` | значення всередині Promise (один шар; `Awaited` — рекурсивно, для будь-якого thenable) |
| `T extends [infer First, ...infer Rest] ? ... : never` | перший елемент tuple + «решта» окремо |
| `T extends (infer U)[] ? DeepFlatten<U> : T` | повністю «розгорнутий» тип (рекурсія) |

## Підсумок

- `infer` оголошує нову «змінну типу» всередині умови conditional type; працює лише там (поза `extends` — помилка компіляції).
- Механіка: TS порівнює `T` із шаблоном, що містить `infer U`, і якщо структура збігається — «заповнює» `U` відповідною частиною `T` для гілки `true`.
- На `infer` побудовані бібліотечні `ReturnType`/`Parameters`/`Awaited` — це звичайні conditional types, а не магія; справжні визначення трохи відрізняються від «навчальних» (`any` замість `never`, рекурсивний `Awaited` для будь-якого thenable).
- Conditional type над union обчислюється окремо для кожного члена (distributive), якщо ліворуч «голий» параметр типу; `[T] extends [...]` вимикає розподіл.
- Можна «витягти» кілька частин одночасно (`[infer First, ...infer Rest]`).
- Conditional type може бути рекурсивним — так реалізують повне «розгортання» вкладеності на рівні типів.
- Твердження про типи варто перевіряти компілятором (`assertType<Equal<A, B>>()`), а не лише коментарем.
