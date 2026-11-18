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

## Задачі для закріплення

Сорок задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Код виконуйте в консолі браузера чи в Node.js 24.

### Рівень 1. Основи

**1.** Що поверне `Number` для різних значень?

```js
[Number('42'), Number(''), Number(' 7 '), Number('4px'), Number(null), Number(undefined), Number(true), Number([]), Number([5]), Number([1, 2])]
```

**2.** Що поверне унарний плюс?

```js
[+'3.5', +'', +'0x10', +'1e3', +{}, +[], +new Date(0)]
```

**3.** Що поверне `parseInt` та `parseFloat`?

```js
[parseInt('42px'), parseInt('px42'), parseInt('0x1F'), parseInt('101', 2), parseFloat('3.14abc'), parseFloat('.5'), parseInt('')]
```

**4.** Чому `parseInt(0.0000005)` дорівнює 5?

```js
[String(0.0000005), parseInt(0.0000005), parseInt(null, 36)]
```

**5.** Що поверне `String` для різних значень?

```js
[String(null), String(undefined), String(123), String(true), String([1, 2]), String({}), String(Symbol('s')), String(() => 1)]
```

**6.** Що поверне `Boolean` для falsy-значень?

```js
[false, 0, -0, 0n, '', null, undefined, NaN].map(Boolean)
```

**7.** Які значення truthy, хоч і виглядають як falsy?

```js
['0', 'false', [], {}, ' ', -1, Infinity].map(Boolean)
```

**8.** Що поверне `!!document.all`-подібне: `typeof null` і `null instanceof Object`?

```js
[typeof null, null instanceof Object]
```

**9.** Що поверне `+` для різних операндів?

```js
[1 + '2', '3' + 4, 1 + 2 + '3', '1' + 2 + 3, true + 1, null + 1, undefined + 1, [] + [], [] + {}, 1 + null]
```

**10.** Що поверне `-`, `*`, `/` із рядками?

```js
['5' - 2, '5' * '2', '10' / '4', 'a' - 1, '5' - '', true - 1]
```

### Рівень 2. Деталі й поведінка

**11.** Що поверне `==` для базових пар?

```js
[1 == '1', 0 == '', 0 == '0', '' == '0', null == undefined, null == 0, undefined == 0, NaN == NaN]
```

**12.** Як `==` працює з boolean?

```js
[true == 1, true == '1', true == 'true', false == '', false == [], false == '0']
```

**13.** Як `==` працює з масивами?

```js
[[] == false, [] == '', [0] == false, [1] == 1, [1, 2] == '1,2', [] == []]
```

**14.** Як `==` працює з об'єктами?

```js
(() => { const a = {}; return [a == a, {} == {}, {} == '[object Object]']; })()
```

**15.** Що дасть порівняння `<` для рядків і чисел?

```js
['10' < '9', '10' < 9, 10 < '9', 'a' < 'b', 'B' < 'a', null >= 0, null > 0, null == 0, undefined >= 0]
```

**16.** Чому `null >= 0` істинне, а `null == 0` хибне?

```js
[null >= 0, null <= 0, null > 0, null < 0, null == 0]
```

**17.** Що поверне `Object.is` у порівнянні з `===`?

```js
[Object.is(NaN, NaN), NaN === NaN, Object.is(0, -0), 0 === -0, Object.is('a', 'a')]
```

**18.** Що поверне SameValueZero (`includes`) і `indexOf`?

```js
[[NaN].includes(NaN), [NaN].indexOf(NaN), [0].includes(-0), [-0].indexOf(0)]
```

**19.** Як перевірити NaN?

```js
[isNaN('abc'), Number.isNaN('abc'), isNaN('12'), Number.isNaN(NaN), isNaN(undefined), Number.isNaN(undefined)]
```

**20.** Що поверне `ToPrimitive` для звичайного об'єкта з `valueOf` та `toString`?

```js
(() => { const o = { valueOf() { return 42; }, toString() { return 'str'; } }; return [o + 1, `${o}`, String(o), o * 2, o + '', o == 42]; })()
```

### Рівень 3. Нюанси та пастки

**21.** Що поверне об'єкт із `Symbol.toPrimitive` для різних hint?

```js
(() => { const o = { [Symbol.toPrimitive](h) { return h; } }; return [`${o}`, +o, o + '', o * 1]; })()
```

**22.** Що поверне приведення `Date` в `+` та `-`?

```js
(() => { const d = new Date(0); return [typeof (d + 1), typeof (d - 1)]; })()
```

**23.** Що поверне `[] + []`, `[] + {}`, `[1] + [2]`?

```js
[[] + [], [] + {}, [1] + [2], [1, 2] + [3]]
```

**24.** Що поверне `{} + []` в позиції виразу і в дужках?

```js
[({}) + [], eval('{} + []')]
```

**25.** Що поверне `typeof NaN` та `typeof []`?

```js
[typeof NaN, typeof [], typeof null, typeof function () {}, typeof Symbol(), typeof 1n]
```

**26.** Що поверне зведення BigInt та Number?

```js
[1n == 1, 1n === 1, 2n > 1, typeof (1n + 1n), (() => { try { return 1n + 1; } catch (e) { return e.name; } })()]
```

**27.** Що поверне `Number` для великих/спеціальних рядків?

```js
[Number('Infinity'), Number('-Infinity'), Number('infinity'), Number('1_000'), Number('0b101'), Number('0o17'), Number('.')]
```

**28.** Що поверне `String(-0)` та `Number('-0')`?

```js
[String(-0), Object.is(Number('-0'), -0), `${-0}`, JSON.stringify(-0), (-0).toString()]
```

**29.** Що поверне `JSON.stringify` для спеціальних значень?

```js
[JSON.stringify(NaN), JSON.stringify(undefined), JSON.stringify(() => 1), JSON.stringify({ a: undefined, b: null })]
```

**30.** Яке значення у виразі `'b' + 'a' + +'a' + 'a'`?

```js
'b' + 'a' + +'a' + 'a'
```

### Рівень 4. Практика

**31.** Що поверне `[] == ![]`?

```js
[] == ![]
```

**32.** Що поверне `0.1 + 0.2 == 0.3` і як порівняти безпечно?

```js
[0.1 + 0.2 == 0.3, Math.abs(0.1 + 0.2 - 0.3) < Number.EPSILON]
```

**33.** Що поверне `'b' > 'a'` та `'2' > '12'`?

```js
['b' > 'a', '2' > '12', 2 > '12']
```

**34.** Що поверне `if ('0')` та `if ([])`?

```js
[Boolean('0'), Boolean([]), Boolean(new Boolean(false))]
```

**35.** Яке значення має `1 < 2 < 3` і `3 > 2 > 1`?

```js
[1 < 2 < 3, 3 > 2 > 1]
```

**36.** Що поверне `Array(3).join('-')` і `Array(3) + ''`?

```js
[Array(3).join('-'), Array(3) + '']
```

**37.** Що поверне `'5' + - '2'` та `'5' - - '2'`?

```js
['5' + - '2', '5' - - '2']
```

**38.** Напишіть `isLooselyEqualNullish(v)`: `true` лише для null/undefined, використовуючи `==`.

```js
const isNullish = (v) => v == null
```

**39.** Напишіть `toNum(v)`: повертає 0 замість NaN.

```js
const toNum = (v) => { const n = Number(v); return Number.isNaN(n) ? 0 : n; }
```

**40.** Напишіть `strictToInt(s)`, що приймає лише рядки з цифр.

```js
const strictToInt = (s) => /^-?\d+$/.test(s) ? Number(s) : null
```

### Відповіді

1. `[42, 0, 7, NaN, 0, NaN, 1, 0, 5, NaN]`
2. `[3.5, 0, 16, 1000, NaN, 0, 0]`
3. `[42, NaN, 31, 5, 3.14, 0.5, NaN]`
4. `['5e-7', 5, 1112745]`
5. `['null', 'undefined', '123', 'true', '1,2', '[object Object]', 'Symbol(s)', '() => 1']`
6. `[false, false, false, false, false, false, false, false]`
7. `[true, true, true, true, true, true, true]`
8. `['object', false]`
9. `['12', '34', '33', '123', 2, 1, NaN, '', '[object Object]', 1]`
10. `[3, 10, 2.5, NaN, 5, 0]`
11. `[true, true, true, false, true, false, false, false]`
12. `[true, true, false, true, true, true]`
13. `[true, true, true, true, true, false]`
14. `[true, false, true]`
15. `[true, false, false, true, true, true, false, false, false]`
16. `[true, true, false, false, false]`
17. `[true, false, false, true, true]`
18. `[true, -1, true, 0]`
19. `[true, false, false, true, true, false]`
20. `[43, 'str', 'str', 84, '42', true]`
21. `['string', NaN, 'default', NaN]`
22. `['string', 'number']`
23. `['', '[object Object]', '12', '1,23']`
24. `['[object Object]', 0]`
25. `['number', 'object', 'object', 'function', 'symbol', 'bigint']`
26. `[true, false, true, 'bigint', 'TypeError']`
27. `[Infinity, -Infinity, NaN, NaN, 5, 15, NaN]`
28. `['0', true, '0', '0', '0']`
29. `['null', undefined, undefined, '{"b":null}']`
30. `'baNaNa'`
31. `true`
32. `[false, true]`
33. `[true, true, false]`
34. `[true, true, true]`
35. `[true, false]`
36. `['--', ',,']`
37. `['5-2', 7]`
38. Виклик `[null, undefined, 0, '', false, NaN].map(isNullish)` → `[true, true, false, false, false, false]`
39. Виклик `['5', 'x', '', null, undefined, '7.5'].map(toNum)` → `[5, 0, 0, 0, 0, 7.5]`
40. Виклик `['12', '-5', '1.5', '12px', ''].map(strictToInt)` → `[12, -5, null, null, null]`
