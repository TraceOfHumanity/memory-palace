# TypeScript: interface vs type — два способи описати форму даних

## 0. Загальна ідея

`interface` і type alias — два різні синтаксиси, які в більшості повсякденних випадків роблять одне й те саме: дають ім'я формі об'єкта, щоб не переписувати її щоразу. Але це не повні синоніми — у кожного є можливості, яких немає в іншого, і кілька важливих відмінностей у поведінці (не лише в синтаксисі).

## 1. Базовий синтаксис — однаковий результат, різний запис

```ts
// interface — окрема конструкція мови (як class), своє ключове слово:
interface UserInterface {
  name: string;
  age: number;
}

// type alias — просто ім'я для будь-якого типу (через знак =),
// об'єктна форма тут — лише одне з можливих застосувань type:
type UserType = {
  name: string;
  age: number;
};

// обидва варіанти використовуються ідентично:
const userViaInterface: UserInterface = { name: "Oleg", age: 30 };
const userViaType: UserType = { name: "Iryna", age: 25 };
console.log(userViaInterface.name, userViaType.name); // Oleg Iryna
```

## 2. type може описати будь-що, interface — лише форму об'єкта

Type alias працює для будь-якого типу — примітивів, union, intersection, tuples, функцій:

```ts
type ID = number | string; // union (детально — union-and-intersection-types.md)
type Coordinate = [number, number]; // tuple
type Callback = (value: number) => void; // тип функції
type Status = "pending" | "done" | "error"; // literal union

// interface цього не може — він описує лише "форму" (набір властивостей/методів):
// interface IDBad = number | string; // ❌ '{' expected.
```

Але `interface` може описувати функції через власний синтаксис — call signature:

```ts
interface CallbackInterface {
  (value: number): void; // "call signature" — interface, що описує функцію
}
const cb: CallbackInterface = (value) => console.log(value * 2);
cb(5); // 10
```

## 3. Розширення: extends (interface) vs & (type)

```ts
// interface розширюється через extends — синтаксис як у наслідуванні класів:
interface Animal {
  name: string;
}
interface Dog extends Animal {
  breed: string;
}
const myDog: Dog = { name: "Rex", breed: "Labrador" };

// type досягає того самого через intersection (&):
type AnimalType = { name: string };
type DogType = AnimalType & { breed: string };
const myDogType: DogType = { name: "Barsik", breed: "Mixed breed" };
```

Для простих випадків обидва підходи дають ідентичний результат. Різниця з'являється, коли розширення конфліктує (розділ 5).

## 4. Найважливіша відмінність у поведінці: declaration merging

`interface` з тим самим іменем, оголошений другий раз у тому самому скоупі, не перезаписує перший — TS автоматично об'єднує (merge) їх в один `interface` з усіма полями з обох оголошень:

```ts
interface Config {
  timeout: number;
}
interface Config {
  // ✅ не помилка — це доповнення, а не перезапис!
  retries: number;
}
// тепер Config має обидва поля:
const config: Config = { timeout: 5000, retries: 3 };
console.log(config); // { timeout: 5000, retries: 3 }

// type з тим самим іменем другий раз — завжди помилка компіляції:
// type Settings = { timeout: number }; type Settings = { retries: number }; // ❌ Duplicate identifier 'Settings'.
```

Це зовсім різна поведінка, і саме вона найчастіше вирішує вибір:

- declaration merging корисний для розширення типів із зовнішніх бібліотек (наприклад, додати власні поля до `Express.Request` — стандартний патерн у `.d.ts`);
- але у звичайному коді «непомітне» об'єднання типів з однаковим іменем може бути небажаним побічним ефектом — `type` тут суворіший і одразу ловить дублікат.

## 5. Конфлікт при розширенні: extends ловить помилку, & дає never

Якщо `interface` розширює базовий і намагається змінити тип успадкованого поля на несумісний — TS кидає явну помилку ще на моменті оголошення:

```ts
interface Base {
  id: number;
}
// interface Derived extends Base { id: string; } // ❌ Interface 'Derived' incorrectly extends interface 'Base'.
// (далі: Types of property 'id' are incompatible. Type 'string' is not assignable to type 'number'.)
```

Той самий конфлікт через intersection не ловиться настільки явно — TS «обчислює» перетин `number & string`, що дає `never` для цього поля, і ти дізнаєшся про проблему лише при спробі створити значення:

```ts
type BaseType = { id: number };
type DerivedType = BaseType & { id: string }; // компілюється без помилки тут...
// const broken: DerivedType = { id: "abc" }; // ❌ Type 'string' is not assignable to type 'never'.
// ...а помилка виникає тільки тут, і з менш зрозумілим повідомленням
```

Це важлива практична перевага `interface`: конфлікти при розширенні виявляються раніше й з зрозумілішим повідомленням.

## 6. Класи: implements працює з обома — поки type описує об'єкт

```ts
interface Shape {
  area(): number;
}
class Circle implements Shape {
  constructor(private radius: number) {}
  area(): number {
    return Math.PI * this.radius ** 2;
  }
}

// type теж можна implements, якщо він описує форму об'єкта:
type Sizeable = { area(): number };
class Square implements Sizeable {
  constructor(private side: number) {}
  area(): number {
    return this.side ** 2;
  }
}
console.log(new Circle(2).area().toFixed(2), new Square(3).area()); // 12.57 9

// але union-тип реалізувати неможливо — клас не може бути "або тим, або тим":
type Shapeish = { kind: "circle"; r: number } | { kind: "square"; s: number };
// class ShapeImpl implements Shapeish { kind = "circle" as const; r = 1; } // ❌ A class can only implement an object type or intersection of object types with statically known members.
```

За конвенцією для «контрактів», які клас реалізує, найчастіше обирають `interface` — це не технічна вимога, а питання читабельності й консистентності.

## 7. Неочевидна відмінність: implicit index signature

Об'єктний `type` вважається сумісним з `Record<string, unknown>` (TS неявно додає йому index signature), а `interface` — ні, бо його можуть доповнити через declaration merging і TS не може гарантувати, що всі поля підходять:

```ts
interface UserI {
  name: string;
}
type UserT = { name: string };

function takesRecord(r: Record<string, unknown>) {
  console.log(Object.keys(r));
}
const ui: UserI = { name: "a" };
const ut: UserT = { name: "b" };

takesRecord(ut); // [ 'name' ] — ок для type
// takesRecord(ui); // ❌ Argument of type 'UserI' is not assignable to parameter of type 'Record<string, unknown>'.
// (далі: Index signature for type 'string' is missing in type 'UserI'.)
```

Це часто «ламає» код при заміні `type` на `interface` у функціях, що приймають довільні об'єкти (логери, серіалізатори). Обхід — розширити параметр до `object` або додати в `interface` явний index signature.

## 8. Відображення в IDE та продуктивність компілятора

IDE-підказка для змінної з типом-`interface` зазвичай показує саме ім'я (`Config`), а для складних intersection-типів нерідко розгортає весь об'єднаний тип, що менш читабельно для багаторівневих типів.

Крім того, команда TypeScript у своїх рекомендаціях щодо продуктивності компілятора радить надавати перевагу `interface ... extends` над intersection-типами для об'єктів: зв'язки між інтерфейсами компілятор кешує, а перетин щоразу обчислює заново. На невеликих проєктах це непомітно, на великих — відчутно в часі перевірки типів.

## 9. Коли type обов'язковий (interface не зможе)

```ts
// а) union/intersection як самостійний, іменований тип:
type PaymentMethod = "card" | "cash" | "crypto";

// б) mapped types (перетворення існуючого типу за шаблоном,
// детально — utility-types.md):
type ReadonlyUser = { readonly [K in keyof UserType]: UserType[K] };

// в) conditional types (тип, що залежить від умови над іншим типом,
// детально — infer.md):
type IsString<T> = T extends string ? true : false;
type CheckA = IsString<"text">; // true
type CheckB = IsString<42>; // false
```

`interface` не може виразити жодне з цього напряму — тільки `type`.

## 10. Коли interface традиційно обирають (за звичаєм)

- публічний API бібліотеки/модуля — форма даних, яку можуть захотіти розширити споживачі (завдяки declaration merging);
- контракти для класів (`implements`);
- прості, «плоскі» описи форми об'єкта без union/intersection — де можна обрати будь-що, і `interface` читається ідіоматичніше для «опису сутності».

Handbook TypeScript пропонує просту евристику: використовуй `interface`, доки не знадобляться можливості, доступні лише в `type`.

## Шпаргалка

| Критерій | interface | type |
|---|---|---|
| Union/intersection/tuple/примітив | ні, лише форму об'єкта | так, будь-який тип |
| Розширення | `extends` | `&` (intersection) |
| Повторне оголошення з тим самим іменем | об'єднується (declaration merging) | помилка (Duplicate identifier) |
| Конфлікт типів при розширенні | явна помилка на оголошенні | поле тихо стає `never`, помилка — при використанні |
| Mapped / conditional types | ні | так |
| `implements` у класах | так | так, якщо це форма об'єкта (не union) |
| Сумісність з `Record<string, unknown>` | ні (немає implicit index signature) | так |
| Типове застосування | публічні API, контракти класів | union/literal-типи, трансформації типів |

## Підсумок

- Для простої форми об'єкта `interface` і `type` практично взаємозамінні, вибір здебільшого стилістичний.
- `interface` описує лише форму об'єкта (включно з call signatures), `type` — будь-який тип: union, intersection, tuple, mapped, conditional.
- Найважливіша поведінкова різниця: `interface` з однаковим іменем об'єднується (declaration merging); `type` — одразу дає «Duplicate identifier».
- Конфлікт при розширенні: `interface extends` ловить його явно й рано; `&` мовчки зводить поле до `never`, і помилка виринає пізніше.
- Union-`type` не можна `implements`; `interface` не приймається там, де очікується `Record<string, unknown>` (немає implicit index signature).
- Для публічних API і контрактів класів за конвенцією обирають `interface`; для union/literal-типів і складних трансформацій — лише `type`.
