# Type coercion і рівність — алгоритми приведення типів у JavaScript

## 1. Що таке type coercion

Coercion (приведення типу) — перетворення значення одного типу на інший. Є **явне** приведення (сам пишеш `String(x)`, `Number(x)`) і **неявне** — рушій робить його сам, коли цього вимагає контекст (арифметика, конкатенація, умова `if`, порівняння `==`). Саме неявне й породжує плутанину.

```js
console.log(Number("42")); // 42 — явне
console.log("42" * 1); // 42 — неявне: рушій сам перетворив "42" на число
console.log(String(42)); // 42 — явне (рядок "42")
console.log(42 + ""); // 42 — неявне (рядок "42")
```

(`console.log` не показує лапок у рядків верхнього рівня — `typeof` допоможе розрізнити, де число, а де рядок.)

## 2. ToPrimitive і три «підказки» (hints)

Коли рушію треба перетворити **об'єкт** на примітив, він викликає абстрактну операцію `ToPrimitive(input, hint)`. Hint каже, якого результату очікує контекст, і визначає **порядок** спроб:

| Hint | Де виникає | Порядок |
|---|---|---|
| `"number"` | унарний `+`, `-`, `*`, `/`, `%`, `<`, `>`, `Number(x)` | `Symbol.toPrimitive("number")` → `valueOf()` → `toString()` |
| `"string"` | шаблонні рядки, `String(x)`, ключ властивості `obj[x]` | `Symbol.toPrimitive("string")` → `toString()` → `valueOf()` |
| `"default"` | бінарний `+`, `==` з примітивом | `Symbol.toPrimitive("default")` → `valueOf()` → `toString()` |

На кожному кроці береться перший результат, що є **примітивом**; якщо жоден метод примітиву не повернув — `TypeError`. Для звичайних об'єктів `"default"` поводиться як `"number"`; виняток — `Date`, де `"default"` поводиться як `"string"` (тому `date + 1` дає рядок, а `date - 1` — число).

```js
const customObj = {
  valueOf() {
    return 10;
  },
  toString() {
    return "string representation";
  },
};

console.log(customObj * 2); // 20 — hint "number": valueOf()
console.log(`${customObj}`); // string representation — hint "string": toString()
console.log(customObj + ""); // 10 — hint "default": valueOf() перший (рядок "10")

const date = new Date(0);
console.log(typeof (date + 1), typeof (date - 1)); // string number — Date: "default" як "string"
```

## 3. `Symbol.toPrimitive` — повний контроль

Якщо об'єкт реалізує `[Symbol.toPrimitive](hint)`, він перехоплює **всі** три сценарії — `valueOf()`/`toString()` узагалі не розглядаються (детально — [Symbol.md](data-structures/Symbol/Symbol.md)):

```js
class Money {
  constructor(amount) {
    this.amount = amount;
  }
  [Symbol.toPrimitive](hint) {
    if (hint === "number") return this.amount;
    if (hint === "string") return `${this.amount} UAH`;
    return `Money(${this.amount})`; // hint === "default"
  }
}
const price = new Money(100);
console.log(+price); // 100 — hint "number"
console.log(`${price}`); // 100 UAH — hint "string"
console.log(price + ""); // Money(100) — hint "default"
```

## 4. Масиви й звичайні об'єкти при ToPrimitive

`Array.prototype.valueOf()` і `Object.prototype.valueOf()` повертають **сам об'єкт** (не примітив) — тож алгоритм іде далі до `toString()`. Для масиву це `join(",")`, для звичайного об'єкта — `"[object Object]"`:

```js
console.log([1, 2, 3] + ""); // 1,2,3 — через toString() → join(",")
console.log([1, 2, 3] * 2); // NaN — "1,2,3" не перетворюється на число

console.log([] + []); // "" — обидва дають "" (виведеться порожній рядок)
console.log([] + {}); // [object Object]
console.log({} + []); // [object Object] — тут {} — вираз (аргумент функції)
console.log({} + ""); // [object Object]
console.log(String({})); // [object Object]
```

> [!note] `{} + []` у консолі
> Якщо ввести `{} + []` **окремим рядком** у консолі браузера, `{}` на початку інструкції розбирається як порожній **блок коду**, і лишається унарний `+[]` → `0`. Усередині виразу (як аргумент `console.log`) `{}` — об'єкт-літерал, і результат `"[object Object]"`.

## 5. Явне приведення до числа: `Number()`, унарний `+`, `parseInt`/`parseFloat`

```js
console.log(Number("42")); // 42
console.log(Number("  42  ")); // 42 — пробіли навколо ігноруються
console.log(Number("")); // 0 — порожній рядок → 0 (часта пастка!)
console.log(Number("42px")); // NaN — «сміття» в кінці ламає все приведення
console.log(Number(null)); // 0
console.log(Number(undefined)); // NaN
console.log(Number(true), Number(false)); // 1 0
console.log(Number([])); // 0 — [] → "" → 0
console.log(Number([42])); // 42 — [42] → "42" → 42
console.log(Number([1, 2])); // NaN — "1,2" не число
console.log(Number({})); // NaN — "[object Object]" не число

console.log(+"42"); // 42 — унарний + те саме, що Number(x)
console.log(+true); // 1
console.log(+new Date(0)); // 0 — Date → timestamp у мілісекундах
```

Винятки: унарний `+` на `BigInt` кидає `TypeError` (`Number(10n)` — працює), а `Symbol` не перетворюється на число жодним способом.

`parseInt`/`parseFloat` працюють інакше — розбирають **початок** рядка:

```js
console.log(parseInt("42px")); // 42 — «сміття» в кінці не заважає (на відміну від Number)
console.log(parseInt("px42")); // NaN — а на початку вже заважає
console.log(parseFloat("3.14abc")); // 3.14
console.log(parseInt("0x1F")); // 31 — розпізнає hex-префікс
console.log(parseInt("10", 2)); // 2 — другий аргумент: система числення
console.log(parseInt(0.0000005)); // 5 — аргумент спершу стає рядком "5e-7"!
```

## 6. Явне приведення до рядка: `String()`, `.toString()`, шаблонні рядки

```js
console.log(String(42)); // 42
console.log(String(null)); // null
console.log(String(undefined)); // undefined
console.log(String([1, 2, 3])); // 1,2,3
console.log(String([null, undefined])); // , — null/undefined у join стають ""
console.log(String({})); // [object Object]
console.log(String(function foo() {})); // function foo() {} — вихідний код функції
```

`String(symbol)` працює, а неявне приведення символу — ні (навмисний захист):

```js
const sym = Symbol("test");
console.log(String(sym)); // Symbol(test) — явне приведення дозволене
try {
  sym + "";
} catch (err) {
  console.log(err.message); // Cannot convert a Symbol value to a string
}
```

`null.toString()` і `undefined.toString()` кидають `TypeError` — `String(x)` безпечніший.

## 7. Приведення до boolean: `Boolean()`, `!!`

Falsy-значень рівно **вісім** — усе інше truthy:

```js
console.log(
  [false, 0, -0, 0n, "", null, undefined, NaN].map(Boolean),
); // [ false, false, false, false, false, false, false, false ]
```

(Історичний дев'ятий виняток — браузерний `document.all`: це об'єкт, але `typeof document.all === "undefined"` і він falsy — заради сумісності зі старими сайтами.)

Класичні пастки — truthy-значення, які «здаються» порожніми:

```js
console.log(Boolean("0")); // true — рядок "0" не порожній
console.log(Boolean(" ")); // true — рядок із пробілом
console.log(Boolean("false")); // true — будь-який непорожній рядок
console.log(Boolean([])); // true — порожній масив
console.log(Boolean({})); // true — порожній об'єкт
console.log(!!"text"); // true — !! — ідіоматичний Boolean(x)
```

## 8. Оператор `+` — єдиний арифметичний оператор з «гілкою»

Спершу обидва операнди проходять `ToPrimitive` (hint `"default"`). Якщо **хоча б один** результат — рядок → конкатенація; інакше — числове додавання. Усі інші арифметичні оператори (`-`, `*`, `/`, `%`, `**`) **завжди** приводять обидва операнди до числа.

```js
console.log(1 + 2); // 3
console.log("1" + 2); // 12 — конкатенація
console.log(1 + "2"); // 12 — порядок не важливий
console.log(1 + 2 + "3"); // 33 — але зліва направо: спершу 1 + 2 = 3, потім "3" + ...
console.log("1" + 2 + 3); // 123
console.log(1 + true); // 2 — true → 1
console.log(1 + null); // 1 — null → 0
console.log(1 + undefined); // NaN — undefined → NaN
console.log("5" - 2); // 3 — мінус завжди числовий
console.log("5" * "2"); // 10
console.log("abc" - 1); // NaN
```

## 9. `==` vs `===`

`===` (Strict Equality) не приводить типів: різні типи — одразу `false`. `==` (Loose Equality) спершу приводить типи за окремим алгоритмом і лише потім порівнює.

```js
console.log(1 === "1"); // false
console.log(1 == "1"); // true — "1" → 1

console.log(null === undefined); // false
console.log(null == undefined); // true — спеціальне правило
console.log(null == 0); // false — null/undefined через == дорівнюють лише одне одному
console.log(undefined == 0); // false
console.log(null == false); // false
```

## 10. Алгоритм `==` покроково (IsLooselyEqual)

Спрощено, у порядку перевірки:

1. Типи **однакові** → працює як `===`.
2. `null == undefined` → `true` (і лише один з одним).
3. number vs string → рядок приводиться до числа.
4. bigint vs string → рядок приводиться до BigInt.
5. boolean vs будь-що → boolean **спершу** стає числом (`true` → 1, `false` → 0), і порівняння повторюється.
6. об'єкт vs примітив → об'єкт через `ToPrimitive` (hint `"default"`), і порівняння повторюється.
7. bigint vs number → порівнюються математичні значення.
8. Інакше → `false`. `NaN` нічому не дорівнює (розділ 13).

```js
console.log(true == 1); // true — true → 1
console.log(true == "1"); // true — true → 1, "1" → 1
console.log(true == "true"); // false — true → 1, "true" → NaN
console.log(false == ""); // true — false → 0, "" → 0
console.log(false == "0"); // true — false → 0, "0" → 0
console.log([] == false); // true — false → 0, [] → "" → 0
console.log([] == ""); // true — [] → ""
console.log([] == 0); // true — [] → "" → 0
console.log([1] == 1); // true — [1] → "1" → 1
console.log([1, 2] == "1,2"); // true
console.log(1n == 1, 1n == "1"); // true true
```

Найвідоміша «дивність»:

```js
console.log([] == ![]); // true
```

`![]` → `false` (масив truthy, `!` інвертує), далі `[] == false` → `0 == 0` → `true`.

Два **об'єкти** через `==` порівнюються за посиланням, без жодного приведення:

```js
console.log([] == []); // false — різні об'єкти
console.log({} == "[object Object]"); // true — а з примітивом уже є приведення
```

## 11. Чому рекомендують `===`

`===` передбачуваний: результат залежить лише від типу й значення, без прихованих кроків `ToPrimitive`. Style guide'и (Airbnb, Google) і лінтер (ESLint `eqeqeq`) вимагають `===` скрізь, з одним поширеним винятком — ідіомою `x == null`, що перевіряє одразу `null` і `undefined`:

```js
function isNil(value) {
  return value == null; // еквівалент: value === null || value === undefined
}
console.log(isNil(null), isNil(undefined), isNil(0), isNil("")); // true true false false
```

(`eqeqeq` має для цього опцію `"smart"` / `{ "null": "ignore" }`.)

## 12. `Object.is()` і SameValueZero — чотири алгоритми рівності

Детально — [Object.md](data-structures/Object/Object.md). Від найслабшого до найсуворішого:

| Алгоритм | Де використовується | Приведення | `NaN` і `NaN` | `+0` і `-0` |
|---|---|---|---|---|
| IsLooselyEqual | `==` | так | не рівні | рівні |
| IsStrictlyEqual | `===`, `indexOf` | ні | не рівні | рівні |
| SameValueZero | `Map`/`Set`, `includes` | ні | **рівні** | рівні |
| SameValue | `Object.is()` | ні | **рівні** | **не рівні** |

```js
console.log(NaN === NaN, Object.is(NaN, NaN)); // false true
console.log(0 === -0, Object.is(0, -0)); // true false
console.log([NaN].indexOf(NaN), [NaN].includes(NaN)); // -1 true — === vs SameValueZero
console.log(new Set([0, -0]).size); // 1 — SameValueZero вважає +0 і -0 однаковими
```

Детально про `Map`/`Set` — [Map.md](data-structures/Map/Map.md), [Set.md](data-structures/Set/Set.md).

## 13. NaN — єдине значення, не рівне самому собі

```js
console.log(NaN == NaN); // false
console.log(NaN === NaN); // false
console.log(NaN != NaN); // true
```

Як правильно перевірити на `NaN`:

```js
console.log(Number.isNaN(NaN)); // true — надійно (ES2015)
console.log(Number.isNaN("text")); // false — не приводить тип
console.log(isNaN("text")); // true — глобальний isNaN спершу робить Number("text") → NaN
console.log(Object.is(NaN, NaN)); // true — теж працює
```

Глобальний `isNaN()` дає «так» для будь-якого нечислового рядка — уникай його.

## 14. `<` `>` `<=` `>=` — теж з приведенням, але за іншими правилами

Оператори відношення запускають `ToPrimitive` з hint `"number"`. Якщо **обидва** результати — рядки, порівняння **лексикографічне** (за кодами UTF-16), інакше обидва операнди стають числами:

```js
console.log("10" < "9"); // true — обидва рядки: посимвольно, "1" < "9"
console.log(10 < 9); // false
console.log("10" < 9); // false — один операнд число → обидва числа: 10 < 9
console.log([10] < [9]); // true — [10] → "10", [9] → "9" → знову рядки
console.log("a" < "B"); // false — "a" (97) більше за "B" (66)
```

Асиметрія `null`: у `==` він дорівнює лише `undefined`, а в `<`/`>` приводиться до `0`. `undefined` у реляційних операторах стає `NaN`, а будь-яке порівняння з `NaN` — `false`:

```js
console.log(null < 1, null == 0, null >= 0); // true false true — null >= 0, але не == 0!
console.log(undefined < 1, undefined > 1, undefined == 0); // false false false
```

## Підсумок

- `ToPrimitive(input, hint)` перетворює об'єкт на примітив: hint `"string"` — спершу `toString()`, `"number"`/`"default"` — спершу `valueOf()`; `Date` трактує `"default"` як `"string"`.
- `Symbol.toPrimitive` повністю замінює цей алгоритм, якщо об'єкт його реалізує.
- `valueOf()` масивів і звичайних об'єктів повертає сам об'єкт, тож працює `toString()`: `"1,2,3"` та `"[object Object]"`.
- `Number("")` → `0`, `Number("42px")` → `NaN`; `parseInt` розбирає початок рядка.
- Falsy-значень вісім: `false`, `0`, `-0`, `0n`, `""`, `null`, `undefined`, `NaN`; усе інше truthy, включно з `"0"`, `[]`, `{}`.
- `+` — єдиний арифметичний оператор з гілкою (конкатенація, якщо хоч один операнд після `ToPrimitive` — рядок); `- * / % **` завжди числові.
- `===` нічого не приводить; `==` має власний алгоритм: boolean спершу стає числом, об'єкт — примітивом; `null == undefined` і більше нічому.
- Чотири алгоритми рівності: `==` → `===` → SameValueZero (`Map`/`Set`/`includes`) → `Object.is()` (SameValue).
- `Number.isNaN()` — надійна перевірка; глобальний `isNaN()` спершу приводить аргумент.
- `<`/`>` для двох рядків порівнюють лексикографічно; `null` у них стає `0` (`null >= 0` — `true`), а `undefined` — `NaN`.
- Правило індустрії: завжди `===`, узвичаєний виняток — `x == null`.
