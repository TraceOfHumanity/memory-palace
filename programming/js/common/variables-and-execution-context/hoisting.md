# Hoisting — підняття оголошень на фазі creation

## 1. Що таке hoisting насправді

Hoisting — це **не** буквальне «перенесення рядків наверх файлу», а видимий ефект того, як JS входить в Execution Context. Кожен запуск скрипта і кожен виклик функції створює Execution Context, а вхід у нього проходить дві фази:

1. **Creation phase** (memory creation):
   - рушій сканує код поточного scope ще **до** виконання;
   - знаходить усі оголошення (`var`, `let`, `const`, `function`, `class`);
   - створює для кожного ідентифікатора binding у відповідному Environment Record;
   - `var` одразу отримує `undefined`, function declaration — саму функцію;
   - `let`, `const`, `class` лишаються «uninitialized» (TDZ).
2. **Execution phase** — код виконується рядок за рядком, присвоєння відбуваються тут.

Тобто ідентифікатор уже існує в пам'яті **до** того, як виконання дійшло до рядка з оголошенням.

## 2. var — піднімається разом з ініціалізацією `undefined`

```js
console.log(varExample); // undefined (а не ReferenceError)
var varExample = "value";
console.log(varExample); // value
```

Що робить рушій:

```text
Creation:  var varExample;         // => undefined
Execution: varExample = "value";
```

## 3. let / const — піднімаються, але потрапляють у TDZ

`let` і `const` **теж** піднімаються (binding створюється на фазі creation), але без ініціалізації. Проміжок від початку блоку до рядка оголошення — Temporal Dead Zone; будь-яке звернення в цей час кидає `ReferenceError`:

```js
try {
  console.log(letExample);
} catch (err) {
  console.log(err.message); // Cannot access 'letExample' before initialization
}
let letExample = "value";
```

Доказ, що `let` таки піднімається: без hoisting внутрішній блок нижче прочитав би зовнішню змінну. Натомість він бачить **свій** binding, ще неініціалізований:

```js
let hoistProof = "outer";
{
  try {
    console.log(hoistProof); // внутрішній hoistProof уже існує і затінює зовнішній
  } catch (err) {
    console.log(err.message); // Cannot access 'hoistProof' before initialization
  }
  let hoistProof = "inner";
}
```

`typeof` для **неоголошеної** змінної безпечний, а для змінної в TDZ — ні:

```js
console.log(typeof neverDeclared); // undefined — безпечно

{
  try {
    typeof zoneVar; // binding існує, але ще не ініціалізований
  } catch (err) {
    console.log(err.constructor.name); // ReferenceError
  }
  let zoneVar = "ok";
}
```

## 4. Function declaration — піднімається повністю, разом з тілом

```js
sayHello(); // Hello! — працює, хоча виклик стоїть вище оголошення

function sayHello() {
  console.log("Hello!");
}
```

## 5. Function expression і стрілки — піднімається лише змінна

Якщо функцію присвоєно змінній, піднімається лише змінна (за правилами `var`/`let`/`const`), а не функція:

```js
try {
  sayBye(); // sayBye — поки що undefined
} catch (err) {
  console.log(err.message); // sayBye is not a function
}
var sayBye = function () {
  console.log("Bye!");
};
sayBye(); // Bye!

try {
  arrowGreet(); // const — TDZ
} catch (err) {
  console.log(err.message); // Cannot access 'arrowGreet' before initialization
}
const arrowGreet = () => console.log("Hello from an arrow!");
arrowGreet(); // Hello from an arrow!
```

## 6. class — як let/const, у TDZ до оголошення

```js
try {
  new MyClass();
} catch (err) {
  console.log(err.message); // Cannot access 'MyClass' before initialization
}
class MyClass {
  greet() {
    console.log("I am a class instance");
  }
}
new MyClass().greet(); // I am a class instance
```

## 7. Колізія імен: function vs var

Якщо в одному scope є і `var foo`, і `function foo() {}`, на фазі creation у binding записується **функція**. Але подальше звичайне присвоєння під час виконання її перезапише:

```js
console.log(typeof duplicateName); // function — function declaration переміг
var duplicateName = "now I am a string"; // виконання: присвоєння перезаписує
function duplicateName() {}
console.log(typeof duplicateName); // string
```

## 8. Hoisting відбувається окремо в кожному Execution Context

Кожен виклик функції має **власну** creation phase:

```js
function outer() {
  console.log(innerVar); // undefined — своя creation phase для виклику outer()
  var innerVar = "local to outer";
  console.log(innerVar); // local to outer
}
outer();
// console.log(innerVar); // ReferenceError: innerVar is not defined
```

## 9. Вправа: подивитися creation phase у DevTools

Відкрийте в браузері або запустіть `node inspect file.js` і зупиніться на першому `debugger`. У панелі Scope (Local) видно результат creation phase **до** виконання першого рядка: `score` і `addPoints` — `undefined`, `resetScore` — уже функція, а в `other` змінні `two`/`three` уже присутні, але ще не мають значення (TDZ).

```js
function scoreTracker() {
  debugger; // score: undefined, addPoints: undefined, resetScore: ƒ
  var score;

  var addPoints = function (count) {
    score += count;
    return `Score incremented by ${count}. Current score is ${score}`;
  };

  function resetScore() {
    score = 0;
    return `Score reset to ${score}`;
  }

  score = 0;
  console.log(addPoints(10)); // Score incremented by 10. Current score is 10
  console.log(resetScore()); // Score reset to 0
  debugger; // тепер усе ініціалізовано
}
scoreTracker();

function other() {
  debugger; // one: undefined, two і three — ще в TDZ
  var one = 1;
  const two = 2;
  let three = 3;
  debugger; // one: 1, two: 2, three: 3
}
other();
```

(Без підключеного дебагера `debugger` нічого не робить.)

## Підсумок

- Hoisting — наслідок creation phase, що передує execution phase в кожному Execution Context.
- `var`: піднімається й одразу ініціалізується `undefined` — читання до оголошення дає `undefined`.
- `let`/`const`/`class`: піднімаються без ініціалізації → TDZ, доступ до оголошення кидає `ReferenceError` (навіть `typeof`).
- Function declaration піднімається повністю, з тілом — її можна викликати до оголошення.
- Function expression / стрілка: піднімається лише змінна-контейнер, не функція (`var` → `TypeError: ... is not a function`, `let`/`const` → TDZ).
- При колізії `var` і `function` з однаковим ім'ям на старті перемагає функція, далі — звичайне присвоєння.
- Hoisting відбувається окремо для глобального контексту і для кожного виклику кожної функції.

## Задачі для закріплення

Двадцять задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Код виконуйте в консолі браузера чи в Node.js 24.

### Рівень 1. Основи

**1.** Що поверне function declaration, викликана до оголошення?

```js
(() => { return f(); function f() { return 'hoisted'; } })()
```

**2.** Що поверне `var` до оголошення?

```js
(() => { const r = v; var v = 1; return r; })()
```

**3.** Що поверне function expression у `var` до присвоєння?

```js
(() => { try { fe(); } catch (e) { return e.name + ': ' + e.message; } var fe = function () {}; })()
```

**4.** А стрілка у `const` до оголошення?

```js
(() => { try { ar(); } catch (e) { return e.name; } const ar = () => 1; })()
```

**5.** Що буде з `class` до оголошення?

```js
(() => { try { new K(); } catch (e) { return e.name; } class K {} })()
```

### Рівень 2. Деталі й поведінка

**6.** Що переможе при колізії: function чи var?

```js
(() => { var a = 1; function a() {} return typeof a; })()
```

**7.** А якщо `var` без присвоєння?

```js
(() => { var a; function a() {} return typeof a; })()
```

**8.** Що дасть дві function declaration з однаковим іменем?

```js
(() => { function f() { return 1; } function f() { return 2; } return f(); })()
```

**9.** Що поверне `typeof` змінної `let` до оголошення у блоці?

```js
(() => { try { typeof z; let z; } catch (e) { return e.name; } })()
```

**10.** Що поверне `typeof` необ'явленої?

```js
typeof notDeclaredAnywhere
```

### Рівень 3. Нюанси та пастки

**11.** Що виведе класичний приклад: змінна `a` у функції, що перекриває глобальну?

```js
(() => { var a = 'global'; function f() { const r = a; var a = 'local'; return r; } return f(); })()
```

**12.** Що дасть function declaration у блоці (sloppy)?

```js
(function () { { function inBlock() { return 1; } } return typeof inBlock; })()
```

**13.** А у strict?

```js
(function () { 'use strict'; { function inBlock() { return 1; } } return typeof inBlock; })()
```

**14.** Що дасть оголошення функції в `if` (sloppy)?

```js
(function () { if (true) { function g() { return 'g'; } } return g(); })()
```

**15.** Чи піднімається `import`-подібний параметр за замовчуванням?

```js
(() => { const f = (a = 1, b = a + 1) => [a, b]; return f(); })()
```

### Рівень 4. Практика

**16.** Що дасть hoisting для вкладених функцій з однаковими змінними?

```js
(() => { var x = 1; function o() { var x = 2; function i() { return x; } return i(); } return o(); })()
```

**17.** Що поверне виклик функції, оголошеної після `return`?

```js
(() => { return h(); function h() { return 42; } })()
```

**18.** Що дасть `let` з тим самим ім'ям, що й параметр?

```js
(() => { try { eval('((a) => { let a; })()'); } catch (e) { return e.name; } })()
```

**19.** Що дасть IIFE із `var`, що піднімається у власну функцію?

```js
(function () { return typeof inner; var inner = 1; })()
```

**20.** Що поверне змінна, оголошена в `for (var ...)` перед циклом?

```js
(() => { const before = i; for (var i = 0; i < 1; i++); return [before, i]; })()
```

### Відповіді

1. `'hoisted'`
2. `undefined`
3. `'TypeError: fe is not a function'`
4. `'ReferenceError'`
5. `'ReferenceError'`
6. `'number'`
7. `'function'`
8. `2`
9. `'ReferenceError'`
10. `'undefined'`
11. `undefined`
12. `'function'`
13. `'undefined'`
14. `'g'`
15. `[1, 2]`
16. `2`
17. `42`
18. `'SyntaxError'`
19. `'undefined'`
20. `[undefined, 1]`
