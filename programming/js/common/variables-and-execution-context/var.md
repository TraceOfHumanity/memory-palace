# var — найстаріший спосіб оголошення змінних (ES1)

## 1. Function scope — функціональна область видимості

`var` не бачить блоків `{}`: `if`, `for`, `while` і «голий» блок **не** створюють для неї нову область видимості. Область видимості `var` — найближча функція (або глобальний scope, якщо оголошено поза функцією). Загальна картина областей видимості — [scope.md](scope.md).

```js
function functionScopeExample() {
  if (true) {
    var insideBlock = "inside the if block";
  }
  console.log(insideBlock); // inside the if block — доступна поза блоком!
}
functionScopeExample();

for (var i = 0; i < 3; i++) {
  // тіло циклу
}
console.log(i); // 3 — змінна i «витекла» з циклу
```

## 2. Hoisting — підняття з ініціалізацією `undefined`

Перед виконанням коду рушій проходить фазу creation: знаходить усі оголошення `var` у поточній функції/скрипті, резервує для них пам'ять і **одразу** ініціалізує значенням `undefined`. Тому звернення до `var` до рядка оголошення не кидає помилку, а повертає `undefined` (детально — [hoisting.md](hoisting.md)).

```js
console.log(hoistedVar); // undefined (а не ReferenceError!)
var hoistedVar = "assigned here";
console.log(hoistedVar); // assigned here
```

Рушій фактично «розбиває» рядок `var hoistedVar = "...";` на два кроки:

```text
var hoistedVar;          // оголошення — на фазі creation
hoistedVar = "...";      // присвоєння — на своєму місці, під час виконання
```

Через ініціалізацію `undefined` у `var` **немає** Temporal Dead Zone — на відміну від [let.md](let.md) і [const.md](const.md).

## 3. Re-declaration — повторне оголошення дозволене

Повторне `var` у тій самій області видимості не кидає помилку: саме оголошення ігнорується, а значення перезаписується звичайним присвоєнням.

```js
var redeclared = "first value";
var redeclared = "second value"; // жодної помилки
console.log(redeclared); // second value
```

## 4. Reassignment — переприсвоєння дозволене

```js
var reassignable = 1;
reassignable = 2;
reassignable = "now a string"; // навіть тип значення можна змінити
console.log(reassignable); // now a string
```

## 5. Забруднення глобального об'єкта

`var`, оголошена на верхньому рівні **класичного скрипта**, стає властивістю глобального об'єкта (`window` у браузері, `globalThis` скрізь). `let` і `const` так не роблять.

```js
var globalVar = "I live on globalThis";
console.log(globalThis.globalVar); // у <script>: I live on globalThis; у CommonJS/ES-модулі: undefined
```

> [!warning] Залежить від середовища
> Це правда лише для верхнього рівня класичного `<script>` (і REPL). У Node.js кожен CommonJS-файл обгорнутий у функцію, а ES-модуль має власний module scope — там `var` на верхньому рівні **не** потрапляє на `globalThis`.

## 6. var у циклах і замикання — класична пастка

Оскільки `var` функціонально-скоупна, усі колбеки в циклі ділять **одну** змінну:

```js
var callbacks = [];
for (var j = 0; j < 3; j++) {
  callbacks.push(function () {
    console.log("var j =", j);
  });
}
callbacks.forEach((cb) => cb());
// var j = 3
// var j = 3
// var j = 3
```

До моменту виклику колбеків цикл уже завершився, і всі функції посилаються на ту саму `j`, що дорівнює `3`. З `let` кожна ітерація отримує власний binding — [let.md](let.md), розділ 6; причина через призму замикань — [closures.md](../closures.md), розділ 3.

## 7. Змінна зберігає значення, а не «зв'язок» з іншою змінною

Присвоєння `y = x` копіює **поточне значення** `x` (для примітивів). Подальша зміна `x` на `y` не впливає:

```js
var x = 1;
var y = x;
console.log(x, y); // 1 1
x = 5;
console.log(x, y); // 5 1
```

## 8. Під капотом: Environment Record

Для `var`-оголошень у Function Environment Record (або в object-частині Global Environment Record — звідси властивість на `globalThis`) створюється mutable binding, який одразу отримує значення `undefined` — ще до виконання першого рядка коду.

## Підсумок

- Scope: функціональна (function-scoped), **не** блочна — блоки `if`/`for` її не обмежують.
- Hoisting: так, з ініціалізацією `undefined`, тому TDZ немає.
- Повторне оголошення й переприсвоєння — дозволені.
- Глобальна `var` у класичному скрипті стає властивістю `globalThis` (у модулях і CommonJS — ні).
- У циклах усі замикання ділять одну змінну — класична пастка.
- У сучасному коді `var` краще не використовувати: `const` за замовчуванням, `let` — коли потрібне переприсвоєння.

## Задачі для закріплення

22 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Код виконуйте в консолі браузера чи в Node.js 24.

### Рівень 1. Основи

**1.** Що поверне `var`-змінна до оголошення?

```js
(() => { const r = typeof a; var a = 1; return r; })()
```

**2.** Яка область видимості в `var` усередині блоку `if`?

```js
(() => { if (true) { var x = 1; } return x; })()
```

**3.** Чи дозволене повторне оголошення `var`?

```js
(() => { var a = 1; var a = 2; return a; })()
```

**4.** Чи стає глобальна `var` властивістю `globalThis` у модулі/eval-функції? (всередині функції)

```js
(() => { (function () { var inner = 1; })(); return 'inner' in globalThis; })()
```

**5.** Що станеться, якщо присвоїти значення неоголошеній змінній у sloppy?

```js
(function () { leaked = 5; return [typeof leaked, 'leaked' in globalThis]; })()
```

**6.** А у strict?

```js
(function () { 'use strict'; try { leaked2 = 5; } catch (e) { return e.name; } })()
```

### Рівень 2. Деталі й поведінка

**7.** Що поверне цикл із `var` та замиканнями?

```js
(() => { const f = []; for (var i = 0; i < 3; i++) f.push(() => i); return f.map(g => g()); })()
```

**8.** Що дасть IIFE як спосіб створити область?

```js
(() => { (function () { var tmp = 1; })(); return typeof tmp; })()
```

**9.** Чи видно `var` з `for` після циклу?

```js
(() => { for (var k = 0; k < 3; k++); return k; })()
```

**10.** Що дасть `var` у `catch`-блоці?

```js
(() => { try { throw 1; } catch (e) { var inCatch = e; } return inCatch; })()
```

**11.** Чи копіюється значення між `var`-змінними за посиланням для об'єкта?

```js
(() => { var a = { n: 1 }; var b = a; b.n = 2; return a.n; })()
```

**12.** Чи оголошення всередині `function` перекриває зовнішню `var`?

```js
(() => { var x = 'outer'; function f() { var x = 'inner'; return x; } return [f(), x]; })()
```

### Рівень 3. Нюанси та пастки

**13.** Що поверне параметр функції і `var` з тим самим іменем?

```js
((a) => { var a; return a; })(5)
```

**14.** А якщо `var` ще й ініціалізовано?

```js
((a) => { var a = 9; return a; })(5)
```

**15.** Що поверне `typeof` необ'явленої змінної?

```js
typeof neverDeclared
```

**16.** Яке значення має `arguments` і параметр у sloppy-режимі при зміні параметра?

```js
(function (a) { a = 2; return arguments[0]; })(1)
```

**17.** Те саме в strict?

```js
(function (a) { 'use strict'; a = 2; return arguments[0]; })(1)
```

**18.** Що виведе `var` у `switch`-кейсі?

```js
(() => { switch (1) { case 1: var s = 'one'; } return s; })()
```

### Рівень 4. Практика

**19.** Чи піднімається `var` із нереалізованої гілки?

```js
(() => { if (false) { var never = 1; } return never; })()
```

**20.** Що дасть `delete` змінної, оголошеної `var`?

```js
(function () { var v = 1; return delete v; })()
```

**21.** Що поверне перезапис функції змінною `var`?

```js
(() => { function f() { return 1; } var f = 2; return typeof f; })()
```

**22.** Напишіть `makeFns()`, що повертає масив із 3 функцій, які повертають 0, 1, 2 (з `var` та IIFE).

```js
const makeFns = () => { var r = []; for (var i = 0; i < 3; i++) (function (j) { r.push(function () { return j; }); })(i); return r; }
```

### Відповіді

1. `'undefined'`
2. `1`
3. `2`
4. `false`
5. `['number', true]`
6. `'ReferenceError'`
7. `[3, 3, 3]`
8. `'undefined'`
9. `3`
10. `1`
11. `2`
12. `['inner', 'outer']`
13. `5`
14. `9`
15. `'undefined'`
16. `2`
17. `1`
18. `'one'`
19. `undefined`
20. `false`
21. `'number'`
22. Виклик `makeFns().map(f => f())` → `[0, 1, 2]`
