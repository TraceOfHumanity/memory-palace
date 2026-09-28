# TypeScript: generics — типи, параметризовані іншими типами

## 0. Загальна ідея

Generic — це спосіб написати функцію/тип/клас, який працює з будь-яким типом, але зберігає зв'язок між типом входу і типом виходу. Це рішення проблеми, яка виникає, якщо намагатись «узагальнити» функцію через `any`: `any` може прийняти будь-що, але повністю втрачає інформацію про те, який саме тип був переданий.

Generic-параметр пишеться в кутових дужках `<T>` одразу після імені функції/типу/класу — за конвенцією одна велика літера (`T`, `U`, `K`, `V`), хоча можна писати й повне слово.

## 1. Проблема, яку вирішують generics

```ts
// ❌ Варіант 1: конкретний тип — працює лише з number, для рядків
// доведеться писати окрему, майже ідентичну функцію:
function firstNumber(arr: number[]): number {
  return arr[0];
}

// ❌ Варіант 2: any — "працює з усім", але втрачає тип результату:
function firstAny(arr: any[]): any {
  return arr[0];
}
const resultAny = firstAny([1, 2, 3]);
try {
  resultAny.toUpperCase(); // компілятор мовчить: для any дозволено все
} catch (err) {
  console.log((err as Error).message); // resultAny.toUpperCase is not a function
}

// ✅ Варіант 3: generic — одна функція, що працює з будь-яким типом,
// але зберігає, який саме тип був переданий:
function first<T>(arr: T[]): T {
  return arr[0];
}
const firstString = first(["a", "b", "c"]); // T виведено як string
console.log(firstString.toUpperCase()); // A — TS знає, що це string

const firstNum = first([1, 2, 3]); // T виведено як number
console.log(firstNum.toFixed(2)); // 1.00 — TS знає, що це number
```

## 2. Generic-функції: T виводиться автоматично з аргументу

У більшості випадків `T` не потрібно вказувати вручну — компілятор сам виводить його з переданого аргументу (той самий принцип type inference, що й у [basic-types.md](basic-types.md)):

```ts
function wrapInArray<T>(value: T): T[] {
  return [value];
}
const wrappedNumbers = wrapInArray(42); // T виведено як number → number[]
const wrappedStrings = wrapInArray("text"); // T виведено як string → string[]
console.log(wrappedNumbers, wrappedStrings); // [ 42 ] [ 'text' ]

// явна вказівка типу (коли вивід неможливий або потрібно змінити
// висновок компілятора) — той самий синтаксис <T> при виклику:
const explicitCall = wrapInArray<string | number>(42); // (string | number)[]
console.log(explicitCall); // [ 42 ]
```

## 3. Кілька generic-параметрів одночасно

Функція може мати скільки завгодно generic-параметрів — кожен незалежно виводиться зі свого аргументу:

```ts
function pair<K, V>(key: K, value: V): [K, V] {
  return [key, value];
}
const idNamePair = pair(1, "Oleg"); // [number, string]
console.log(idNamePair); // [ 1, 'Oleg' ]

// типовий приклад — злиття двох об'єктів зі збереженням типів обох
// аргументів у типі результату (A & B — intersection,
// детально — union-and-intersection-types.md):
function merge<A, B>(a: A, b: B): A & B {
  return { ...a, ...b };
}
const mergedConfig = merge({ name: "Oleg" }, { age: 30 });
console.log(mergedConfig.name, mergedConfig.age); // Oleg 30 — TS знає обидва поля
```

## 4. Generic constraints (extends) — обмеження, що T має вміти

Без обмежень `T` може бути будь-яким типом — а отже, компілятор дозволяє звертатись лише до того, що є в абсолютно всіх типах:

```ts
// function getLengthBad<T>(value: T): number { return value.length; } // ❌ Property 'length' does not exist on type 'T'.
// (T міг бути числом, у якого немає .length)

// ✅ extends обмежує T до типів, що мають конкретну властивість —
// тут "має length: number" (не плутати з extends у класах чи
// interface — тут це обмеження, а не наслідування):
function getLength<T extends { length: number }>(value: T): number {
  return value.length; // тепер TS знає, що value точно має .length
}
console.log(getLength("string")); // 6 — у string є .length
console.log(getLength([1, 2, 3, 4])); // 4 — у масиву є .length
// console.log(getLength(42)); // ❌ Argument of type 'number' is not assignable to parameter of type '{ length: number; }'.
```

## 5. Обмеження до конкретного союзу типів — і пастка з `as T`

Оригінальний приклад виглядав так:

```ts
function double<T extends number | string>(value: T): T {
  if (typeof value === "number") return (value * 2) as T;
  return ((value as string) + (value as string)) as T; // as — type assertion
}
console.log(double(5)); // 10
console.log(double("ab")); // abab
```

Працює в рантаймі, але тип результату — неправда. Для виклику `double(5)` TS виводить `T` як літеральний тип `5` (бо `T extends number | string` зберігає літерал), і сигнатура `(value: T): T` обіцяє повернути саме `5`:

```ts
const doubled = double(5);
const proof: 5 = doubled; // компілюється — TS вважає, що тут рівно 5
console.log(proof); // 10 — а в рантаймі 10
// const honest: 10 = doubled; // ❌ Type '5' is not assignable to type '10'.
```

> ⚠️ Уточнення відносно оригінального файлу: там цей приклад подавався як правильне застосування generic-обмеження. Насправді `as T` тут приховує помилку типів — generic, що повертає `T`, обіцяє «той самий тип, що на вході», а подвоєне значення вже інше. Узагальнене правило: `as` у generic-функції — сигнал, що сигнатура бреше.

Чесний варіант — overloads (перевантаження сигнатур): «число на вході → число на виході, рядок → рядок», без прив'язки до конкретного літерала:

```ts
function doubleSafe(value: number): number;
function doubleSafe(value: string): string;
function doubleSafe(value: number | string): number | string {
  return typeof value === "number" ? value * 2 : value + value;
}
const safeNum = doubleSafe(5); // тип: number
const safeStr = doubleSafe("ab"); // тип: string
console.log(safeNum, safeStr); // 10 abab
```

## 6. keyof + generic — типобезпечний доступ до властивостей об'єкта

`keyof T` — тип-union з усіх імен властивостей `T` (детально — [typeof-and-keyof.md](typeof-and-keyof.md)); у поєднанні з generics це найпоширеніший практичний прийом:

```ts
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const userForGetProp = { name: "Maria", age: 28, email: "maria@example.com" };
const nameValue = getProperty(userForGetProp, "name"); // TS знає: тип — string
const ageValue = getProperty(userForGetProp, "age"); // TS знає: тип — number
console.log(nameValue.toUpperCase(), ageValue.toFixed(0)); // MARIA 28

// getProperty(userForGetProp, "phone"); // ❌ Argument of type '"phone"' is not assignable to parameter of type '"name" | "age" | "email"'.
```

Це основна перевага: неможливо звернутись до властивості, якої не існує на об'єкті — помилка ловиться ще до запуску, а не як `undefined` у рантаймі (у чистому JS `userForGetProp.phone === undefined` без жодного попередження).

## 7. Generic interfaces / type aliases

Так само, як функції, `interface` і `type` можуть бути параметризовані:

```ts
interface Box<T> {
  value: T;
}
const numberBox: Box<number> = { value: 42 };
const stringBox: Box<string> = { value: "text" };
console.log(numberBox.value, stringBox.value); // 42 text

// поширений реальний приклад — типізована "обгортка" для відповіді API
// (discriminated union з union-and-intersection-types.md, тепер параметризований):
type ApiResult<T> = { status: "success"; data: T } | { status: "error"; message: string };

function handleUserResult(result: ApiResult<{ name: string; age: number }>) {
  if (result.status === "success") {
    console.log(result.data.name, result.data.age); // TS знає форму data
  } else {
    console.log("Error:", result.message);
  }
}
handleUserResult({ status: "success", data: { name: "Ivan", age: 40 } }); // Ivan 40
```

## 8. Generic classes

```ts
class Stack<T> {
  private items: T[] = [];

  push(item: T): void {
    this.items.push(item);
  }
  pop(): T | undefined {
    return this.items.pop();
  }
  peek(): T | undefined {
    return this.items[this.items.length - 1];
  }
  get size(): number {
    return this.items.length;
  }
}

const numberStack = new Stack<number>();
numberStack.push(1);
numberStack.push(2);
numberStack.push(3);
console.log(numberStack.pop()); // 3
console.log(numberStack.size); // 2
// numberStack.push("text"); // ❌ Argument of type 'string' is not assignable to parameter of type 'number'.

const stringStack = new Stack<string>();
stringStack.push("a");
stringStack.push("b");
console.log(stringStack.peek()); // b
```

У чистому JS клас `Stack` був би тим самим кодом (типів немає), але нічого не заважало б випадково зробити `numberStack.push("text")` — помилка виявилась би лише там, де результат реально зламав би логіку, а не в місці самої помилки.

Зверни увагу: `private` тут — лише TS-перевірка, у рантаймі `items` звичайне поле; справжня приватність — `#items` (детально — `common/data-structures/Object/Object.md`).

## 9. Default type parameters — тип «за замовчуванням» для generic

Так само, як у параметрів функцій можуть бути дефолтні значення, у generic-параметрів можуть бути дефолтні типи — якщо конкретний тип не вказано явно й нема звідки його вивести:

```ts
interface Container<T = string> {
  value: T;
}
const defaultContainer: Container = { value: "text" }; // T = string (за замовчуванням)
const explicitContainer: Container<number> = { value: 42 }; // T явно вказано як number
console.log(defaultContainer.value, explicitContainer.value); // text 42
```

## 10. Generic-функція, що повертає іншу функцію (збереження типів крізь колбеки)

Поширений реальний патерн — фабрика функцій-валідаторів/трансформаторів, де важливо, щоб тип входу й тип виходу лишались пов'язаними навіть крізь «прошарок» функції вищого порядку:

```ts
function createArrayValidator<T>(predicate: (item: T) => boolean) {
  return function validate(items: T[]): T[] {
    return items.filter(predicate);
  };
}

const keepPositive = createArrayValidator<number>((n) => n > 0);
console.log(keepPositive([1, -2, 3, -4, 5])); // [ 1, 3, 5 ]

const keepNonEmpty = createArrayValidator<string>((s) => s.length > 0);
console.log(keepNonEmpty(["a", "", "b", ""])); // [ 'a', 'b' ]
```

## Підсумок

- Generic (`<T>`) — параметризація типу: функція/interface/type/клас працює з будь-яким типом, але зберігає зв'язок між типом входу й типом виходу — на відміну від `any`, який цей зв'язок повністю втрачає.
- `T` переважно виводиться автоматично з аргументу (type inference); явна вказівка `<Тип>` при виклику потрібна рідко.
- Можна мати кілька generic-параметрів одночасно (`<K, V>`).
- `extends` у generic-контексті — обмеження («`T` має бути хоча б таким»), не наслідування; дозволяє звертатись лише до того, що гарантовано є в усіх допустимих `T`.
- Пастка: `T extends number | string` виводить літеральні типи, тож сигнатура `(value: T): T` з `as T` всередині може обіцяти `5`, повертаючи `10`. Якщо результат не «той самий тип, що на вході» — потрібні overloads, а не `as T`.
- `<T, K extends keyof T>` — типобезпечний доступ до властивостей об'єкта: неможливо звернутись до неіснуючого ключа.
- Generic interface/type/class — той самий принцип параметризації, застосований до опису форми даних чи структури класу.
- Default type parameters (`<T = string>`) — тип «за замовчуванням», якщо конкретний не вказано й нема звідки вивести.
- Головна практична вигода: одна функція/клас/тип замінює багато майже ідентичних — без втрати перевірки типів, яку дав би `any`.
