# Scope — де і як JS шукає значення ідентифікатора

## 1. Що таке scope

Scope (область видимості) — «територія» коду, у межах якої ідентифікатор (змінна, функція, клас) видимий і доступний. Кожна функція і кожен блок `{}` (для `let`/`const`) створюють власне лексичне оточення (Lexical Environment), яке зберігає свої binding'и і посилання на батьківське оточення.

## 2. Глобальний scope

Усе, що оголошене поза будь-якою функцією чи блоком, живе в глобальному scope і доступне звідусіль у файлі/скрипті:

```js
var globalVar = "I am global";
function canSeeGlobal() {
  console.log(globalVar); // I am global — доступна всередині будь-якої функції
}
canSeeGlobal();
```

## 3. Function scope — функціональна область видимості

Кожен **виклик** функції створює нове лексичне оточення. Усе, що оголошено всередині (`var`, `let`, `const`, параметри), живе лише в цій функції:

```js
function functionScopeDemo() {
  var localVar = "only here";
  console.log(localVar); // only here
}
functionScopeDemo();
// console.log(localVar); // ReferenceError: localVar is not defined
```

`var` — саме функціонально-скоупна: блоки `if`/`for`/`while` усередині функції для неї нову область не створюють ([var.md](var.md)):

```js
function varIgnoresBlocks() {
  if (true) {
    var leaked = "not block-scoped";
  }
  console.log(leaked); // not block-scoped — var бачить лише межу функції
}
varIgnoresBlocks();
```

## 4. Block scope — блочна область видимості

`let` і `const` прив'язані до найближчого блоку `{}` — тіла `if`/`for`/`while` або «голого» блоку ([let.md](let.md), [const.md](const.md)):

```js
function blockScopeDemo() {
  if (true) {
    let blockLet = "only in this block";
    const blockConst = "me too";
    console.log(blockLet, blockConst); // only in this block me too
  }
  // console.log(blockLet); // ReferenceError: blockLet is not defined
}
blockScopeDemo();

{
  let standalone = "a bare block creates a scope too";
  console.log(standalone); // a bare block creates a scope too
}
// console.log(standalone); // ReferenceError: standalone is not defined
```

## 5. Лексичний (статичний) скоупінг

JavaScript використовує **лексичний** скоупінг: область видимості визначається місцем, де функція **написана** в коді, а не тим, **звідки** її викликали. Протилежність — динамічний скоупінг (так працюють, наприклад, `local`-змінні в Bash).

```js
let lexicalValue = "outer value";

function outerLexical() {
  let lexicalValue = "value from outerLexical";
  innerLexical(); // innerLexical шукає змінні там, де її оголошено, а не тут
}

function innerLexical() {
  console.log(lexicalValue); // innerLexical лексично оголошена на верхньому рівні
}

outerLexical(); // outer value
```

## 6. Scope chain — ланцюжок областей видимості

Рушій спершу шукає ідентифікатор у поточному лексичному оточенні; якщо не знайшов — у батьківському, і так далі аж до глобального. Цей шлях пошуку і є scope chain:

```js
const chainLevel1 = "level 1 (global)";

function chainOuter() {
  const chainLevel2 = "level 2 (outer)";

  function chainMiddle() {
    const chainLevel3 = "level 3 (middle)";

    function chainInner() {
      // власних змінних немає — пошук іде по scope chain:
      console.log(chainLevel3); // level 3 (middle)
      console.log(chainLevel2); // level 2 (outer)
      console.log(chainLevel1); // level 1 (global)
    }
    chainInner();
  }
  chainMiddle();
}
chainOuter();
```

Якщо ідентифікатор не знайдено ніде в ланцюжку — `ReferenceError`.

## 7. Shadowing — затінення

Якщо у вкладеному scope оголосити ідентифікатор з тим самим іменем, він «затінює» зовнішній на весь час дії внутрішнього scope. Це **новий**, окремий binding:

```js
let shadowed = "outer";
function shadowDemo() {
  let shadowed = "inner"; // окремий binding, не пов'язаний із зовнішнім
  console.log(shadowed); // inner
}
shadowDemo();
console.log(shadowed); // outer — не змінилось
```

## 8. Scope vs TDZ: «знайдено, але ще не ініціалізовано»

Scope визначає, **який** binding буде знайдено, а TDZ — **чи можна** його вже читати. Функція нижче бачить `greeting` через scope chain, але виклик відбувається раніше, ніж рядок `let` виконався:

```js
try {
  greet(); // (1) виклик — ще ДО рядка let greeting
} catch (err) {
  console.log(err.message); // Cannot access 'greeting' before initialization
}

let greeting = "Hello, universe"; // (3) ініціалізація

function greet() {
  console.log(greeting); // (2) binding знайдено в глобальному scope, але він у TDZ
}

greet(); // Hello, universe — тепер ініціалізовано
```

Функцію `greet` піднято повністю (function declaration), а `greeting` — лише як неініціалізований binding ([hoisting.md](hoisting.md)).

## 9. Closure — scope, що «переживає» свою функцію

Функція зберігає посилання на лексичне оточення, де її **створено**, навіть після завершення зовнішньої функції. Це замикання — прямий наслідок лексичного скоупінгу (детально — [closures.md](../closures.md)):

```js
function makeCounter() {
  let count = 0; // живе в лексичному оточенні makeCounter
  return function increment() {
    count += 1; // increment «пам'ятає» scope makeCounter
    return count;
  };
}

const counter = makeCounter();
console.log(counter()); // 1
console.log(counter()); // 2
const counter2 = makeCounter(); // новий виклик — нове, окреме оточення
console.log(counter2()); // 1 — незалежний від counter
```

## 10. Модульний scope

В ES-модулях (файли з `import`/`export`) верхній рівень файлу — це **не** глобальний scope, а окремий module scope. Оголошене на верхньому рівні модуля не потрапляє в глобальний простір і не видно в інших модулях без явного `export`/`import`. У CommonJS (Node.js) схожий ефект дає обгортка-функція навколо кожного файлу.

## Шпаргалка: var / let / const за scope

| | Scope | Видно до оголошення? | Потрапляє на `globalThis` (класичний скрипт) |
|---|---|---|---|
| `var` | функція | так, `undefined` | так |
| `let` | блок | ні, TDZ | ні |
| `const` | блок | ні, TDZ | ні |

Усі три підпорядковуються лексичному скоупінгу і формують один і той самий scope chain.

## Підсумок

- Scope визначає, де ідентифікатор видимий і доступний.
- Глобальний scope — видно скрізь у скрипті; у модулях верхній рівень — окремий module scope.
- Function scope: `var` бачить лише межу функції й ігнорує блоки; block scope: `let`/`const` прив'язані до найближчого `{}`.
- Лексичний скоупінг: видимість визначається місцем написання коду, а не місцем виклику.
- Scope chain: пошук іде від поточного оточення до батьківських, аж до глобального; не знайдено — `ReferenceError`.
- Shadowing: внутрішній ідентифікатор ховає однойменний зовнішній.
- Знайдений binding може бути ще в TDZ — тоді доступ теж дає `ReferenceError`, але з іншим повідомленням.
- Closure: функція зберігає доступ до свого лексичного оточення після завершення зовнішньої функції.
