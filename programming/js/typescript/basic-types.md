# TypeScript: базові типи та type annotations

## 0. Що таке TypeScript насправді

TypeScript — це JavaScript + статична система типів, яка існує лише на етапі розробки/компіляції. Компілятор (`tsc`) перевіряє типи, а потім просто видаляє їх, залишаючи чистий JS — жодна анотація типу не існує в рантаймі, вона не сповільнює виконання і не доступна через `typeof`/introspection.

Це ключова відмінність від динамічної типізації JS (детально — `common/type-coercion.js`): у JS тип значення перевіряється під час виконання (runtime), у TS — під час компіляції (compile-time), а в рантаймі коду з перевірками вже не залишається взагалі.

Той самий код у JS і в TS:

```js
// JavaScript (немає жодних анотацій — тип дізнається лише в рантаймі):
function addJS(a, b) {
  return a + b;
}
console.log(addJS(1, "2")); // "12" — рантайм мовчки дозволяє це
```

```ts
// TypeScript (анотація типу — помилка виявляється до запуску коду):
function addTS(a: number, b: number): number {
  return a + b;
}
addTS(1, 2); // 3 — ок
// addTS(1, "2"); // ❌ Argument of type 'string' is not assignable to parameter of type 'number'.
```

## 1. Синтаксис type annotation: завжди `: Тип` після ідентифікатора

Анотація типу пишеться після імені змінної/параметра/поля, через двокрапку — це та сама позиція, де в JS нічого немає:

```ts
let age: number = 30;
let username: string = "Oleg";
let isActive: boolean = true;
```

У JS цей самий код виглядав би просто `let age = 30;` тощо. TS не змінює те, як код працює — лише додає перевірку, що можна присвоїти цій змінній.

## 2. Примітивні типи — точно ті самі, що й у JS, але з перевіркою

TypeScript не вигадує нові типи даних — він лише «називає» ті самі примітиви, що вже є в JS, і перевіряє, щоб змінна завжди відповідала заявленому типу:

```ts
let tsNumber: number = 42; // те саме, що typeof x === "number" у JS
let tsString: string = "text"; // те саме, що typeof x === "string"
let tsBoolean: boolean = false; // те саме, що typeof x === "boolean"
let tsBigInt: bigint = 42n; // те саме, що typeof x === "bigint"
let tsSymbol: symbol = Symbol("id"); // те саме, що typeof x === "symbol"
let tsUndefined: undefined = undefined;
let tsNull: null = null;

// помилка присвоєння неправильного типу виявляється ще до запуску:
// tsNumber = "42"; // ❌ Type 'string' is not assignable to type 'number'.
```

У чистому JS такого захисту немає — `let numberJS = 42; numberJS = "42";` мовчки працює, і про проблему дізнаєшся хіба що в рантаймі (або й ніколи).

## 3. Type inference — TS часто може «вгадати» тип сам, без анотації

Якщо змінній одразу присвоюється значення, TS автоматично виводить (infers) тип із самого значення — писати анотацію вручну не обов'язково:

```ts
let inferredNumber = 42; // TS сам виводить тип: number
let inferredString = "text"; // TS сам виводить тип: string
// inferredNumber = "now a string"; // ❌ Type 'string' is not assignable to type 'number'.
// TS "запам'ятав" number з першого присвоєння, хоч анотації не було

let laterAssigned: number;
laterAssigned = 100; // ок, тип уже заявлений заздалегідь
```

Анотацію пишуть явно, коли:

- значення ще немає в момент оголошення (`let x: number;` — заповниться пізніше);
- тип, який TS вивів би сам, ширший, ніж треба (розширення літералів — [const-assertions.md](const-assertions.md));
- сигнатура функції — параметри й повернене значення (компілятор не може «вгадати» тип параметра функції з нічого).

## 4. Масиви: `Тип[]` або `Array<Тип>`

```ts
let numbersArr: number[] = [1, 2, 3];
let stringsArr: Array<string> = ["a", "b", "c"]; // ідентичний запис, інший синтаксис
let mixedNotAllowed: number[] = [1, 2, 3];
// mixedNotAllowed.push("text"); // ❌ Argument of type 'string' is not assignable to parameter of type 'number'.

// для змішаного масиву потрібен явний union-тип
// (детально — union-and-intersection-types.md):
let explicitMixedArr: (number | string)[] = [1, "two"]; // TS дозволяє, якщо це заявлено явно
```

У JS масив може містити будь-які типи одночасно без жодних скарг: `const jsArr = [1, "two", true];` повністю легально.

## 5. Tuples — масив із фіксованою довжиною й типом кожного елемента

Tuple — концепція, якої немає в самому JS: це масив, де заздалегідь відомі і кількість елементів, і тип кожного з них окремо.

```ts
let coordinate: [number, number] = [10, 20]; // рівно 2 числа
// coordinate = [10, 20, 30]; // ❌ Type '[number, number, number]' is not assignable to type '[number, number]'. Source has 3 element(s) but target allows only 2.
// coordinate = ["10", 20]; // ❌ Type 'string' is not assignable to type 'number'.

let httpResponseTuple: [number, string] = [200, "OK"]; // код + повідомлення, різні типи на різних позиціях
console.log(httpResponseTuple[0], httpResponseTuple[1]); // 200 OK
```

У чистому JS немає способу гарантувати, що масив `[200, "OK"]` завжди матиме рівно 2 елементи саме таких типів — це лише угода в голові розробника; tuple робить цю угоду перевірюваною компілятором.

## 6. any — «відключення» перевірки типів (уживай мінімально)

`any` каже компілятору: «не перевіряй цю змінну взагалі, довіряй мені». Це, по суті, повернення до поведінки чистого JS для цієї конкретної змінної — TS більше не дає жодних гарантій щодо неї.

```ts
let anythingGoes: any = 42;
anythingGoes = "now a string"; // ок, any дозволяє будь-що
anythingGoes = { key: "value" }; // теж ок

try {
  anythingGoes.nonExistentMethod(); // компілятор мовчить — помилка лише в рантаймі
} catch (err) {
  console.log((err as Error).message); // anythingGoes.nonExistentMethod is not a function
}
```

`any` «заражує» усе, куди потрапляє — якщо функція повертає `any`, увесь подальший код, що працює з результатом, теж втрачає перевірку. Тому `any` вважається «аварійним люком», а не звичним інструментом.

## 7. unknown — безпечна альтернатива any

`unknown` теж означає «тип поки невідомий», але, на відміну від `any`, забороняє використовувати значення без попередньої перевірки типу (детально механізм narrowing — [narrowing-and-type-guards.md](narrowing-and-type-guards.md)):

```ts
let notSureYet: unknown = "could have been anything";
// notSureYet.toUpperCase(); // ❌ 'notSureYet' is of type 'unknown'.

if (typeof notSureYet === "string") {
  console.log(notSureYet.toUpperCase()); // COULD HAVE BEEN ANYTHING — TS "звузив" тип до string
}
```

Правило: якщо значення дійсно невідомого типу (дані з зовнішнього API чи user input) — використовуй `unknown`, а не `any`. `unknown` змушує явно перевірити тип перед використанням, `any` — дозволяє мовчки помилятись.

## 8. void — відсутність значення, що повертається

`void` використовується як тип поверненого значення функції, яка нічого корисного не повертає (лише виконує побічну дію):

```ts
function logMessage(message: string): void {
  console.log(message);
  // немає return — або є "порожній" return;
}
logMessage("Hello!"); // Hello!
```

У чистому JS такого поняття, як «тип повернення», немає — функція просто повертає `undefined`, якщо немає `return`. `void` — спосіб TS явно задекларувати намір «ця функція не призначена повертати значення», навіть якщо технічно вона все одно повертає `undefined` у рантаймі.

## 9. never — тип, який ніколи не має значення

`never` позначає функцію/вираз, який ніколи не завершується нормально — або завжди кидає помилку, або йде в нескінченний цикл. Це не те саме, що `void` (яка завершується, просто без значення).

```ts
function throwError(message: string): never {
  throw new Error(message); // функція завжди кидає, ніколи не "повертається"
}

function infiniteLoop(): never {
  while (true) {
    // ніколи не завершується
  }
}
```

Практичне застосування: `never` ловить пропущені випадки (exhaustiveness checking) — детально в [union-and-intersection-types.md](union-and-intersection-types.md), тут лише сама ідея:

```ts
type Shape = { kind: "circle"; radius: number } | { kind: "square"; side: number };
function getArea(shape: Shape): number {
  switch (shape.kind) {
    case "circle":
      return Math.PI * shape.radius ** 2;
    case "square":
      return shape.side ** 2;
    default:
      // якщо колись додасться новий варіант Shape і про нього забудуть
      // тут — TS підкаже помилку, бо shape тут мав би мати тип never
      const exhaustiveCheck: never = shape;
      return exhaustiveCheck;
  }
}
console.log(getArea({ kind: "circle", radius: 2 }).toFixed(2)); // 12.57
```

## 10. object, Object, {} — три схожі, але різні записи (пастка для початківців)

```ts
// object (мала буква) — будь-яке не-примітивне значення
// (не number/string/boolean/symbol/null/undefined/bigint) — об'єкти, масиви, функції:
let anyObject: object = { key: "value" };
anyObject = [1, 2, 3]; // масив теж object — ок
// anyObject = 42; // ❌ Type 'number' is not assignable to type 'object'.

// {} (порожній тип-літерал) — означає "будь-яке значення, окрім null
// та undefined": звучить як "порожній об'єкт", а насправді дозволяє майже все:
let almostAnything: {} = 42; // ok!
almostAnything = "text"; // ok!
almostAnything = { a: 1 }; // ok!
// almostAnything = null; // ❌ Type 'null' is not assignable to type '{}'.
// almostAnything = undefined; // ❌ Type 'undefined' is not assignable to type '{}'.
```

`Object` (з великої літери) — тип інтерфейсу `Object.prototype` (`toString`, `hasOwnProperty` тощо); на практиці поводиться майже як `{}` (теж приймає примітиви) і майже ніколи не використовується напряму.

Рекомендація: для «довільного об'єкта з довільними полями» краще явно описати структуру (детально — [interface-vs-type.md](interface-vs-type.md)), а не покладатись на розмиті `object`/`{}`.

## 11. Анотації для функцій: параметри та повернене значення окремо

Кожен параметр анотується окремо, а тип повернення — після списку параметрів (перед `{`):

```ts
function multiply(a: number, b: number): number {
  return a * b;
}

// необов'язкові параметри — знак ? після імені
// (тип параметра стає "Тип | undefined" автоматично):
function greet(name: string, greeting?: string): string {
  return `${greeting ?? "Hello"}, ${name}!`;
}
console.log(greet("Maria")); // Hello, Maria!
console.log(greet("Maria", "Welcome")); // Welcome, Maria!

// параметри зі значенням за замовчуванням — тип виводиться з дефолту:
function power(base: number, exponent = 2): number {
  return base ** exponent;
}
console.log(power(3)); // 9 (exponent за замовчуванням 2)
console.log(power(3, 3)); // 27
```

## 12. Зіставлення: як той самий код виглядає без і з типами

У JS помилки типів виявляються лише під час реального виконання — якщо взагалі виявляються:

```js
function calculateTotal(price, quantity, shipping) {
  return price * quantity + shipping;
}
console.log(calculateTotal(100, 5, 20)); // 520
console.log(calculateTotal(100, 5, "20")); // "50020" — рядок "20" приклеївся до 500, баг
console.log(calculateTotal(100, "5", 20)); // 520 — а тут баг "сховався": * сам привів "5" до числа
```

Зверни увагу на асиметрію: `*` завжди приводить операнди до чисел, тому рядок у множенні проходить непомітно, а `+` з рядком перетворюється на конкатенацію. Саме такі баги важко знайти в JS — вони залежать від того, в яку операцію потрапило значення.

TypeScript (та сама логіка, з типами — компілятор зупинить до запуску):

```ts
function calculateTotal(price: number, quantity: number, shipping: number): number {
  return price * quantity + shipping;
}
console.log(calculateTotal(100, 5, 20)); // 520
// calculateTotal(100, 5, "20"); // ❌ Argument of type 'string' is not assignable to parameter of type 'number'.
```

> ⚠️ Виправлено відносно оригінального файлу: там стверджувалось, що в JS `calculateTotal(100, "5", 0.1)` (з формулою `price * quantity * (1 - discount)`) дає `"50050050050050050..."`. Насправді це `450` (число): оператор `*` приводить `"5"` до числа, тож жодного бага там немає. Проблема конкатенації виникає лише з `+`, тому приклад переписано.

## Підсумок

- TypeScript = JavaScript + типи, які існують лише на етапі компіляції; у скомпільованому JS анотацій не залишається взагалі.
- Синтаксис анотації: `ідентифікатор: Тип` — після імені змінної, параметра чи поля.
- Примітивні типи TS (`number`/`string`/`boolean`/`bigint`/`symbol`/`undefined`/`null`) — ті самі примітиви JS, просто з перевіркою на compile-time.
- Type inference: TS сам виводить тип зі значення при ініціалізації — явну анотацію найчастіше пишуть для параметрів функцій і змінних без початкового значення.
- `Тип[]`/`Array<Тип>` — типізований масив; tuple `[Тип1, Тип2]` — масив фіксованої довжини з різними типами на кожній позиції.
- `any` повністю вимикає перевірку типів (крайній виняток); `unknown` — теж «невідомий тип», але змушує перевірити його перед використанням.
- `void` — функція не повертає корисного значення; `never` — функція взагалі ніколи не завершується нормально.
- `object` / `{}` / `Object` — три різні речі: `object` = не-примітив, `{}` = «усе, крім `null`/`undefined`» (часта пастка), `Object` = тип з методами `Object.prototype` (рідко потрібен).
- Головна практична вигода: помилки типів виявляються до запуску коду, а не десь посеред виконання в продакшені.
