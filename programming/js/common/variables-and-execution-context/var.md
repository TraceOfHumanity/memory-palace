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
