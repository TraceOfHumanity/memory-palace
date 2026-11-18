# let — блочно-скоупне оголошення змінних (ES2015)

## 1. Block scope — блочна область видимості

На відміну від [var.md](var.md), `let` створює binding, що належить найближчому блоку `{}` — тілу `if`, `for`, `while` або «голому» блоку. За межами блоку змінна недоступна.

```js
function blockScopeExample() {
  if (true) {
    let insideBlock = "inside the if block";
    console.log(insideBlock); // inside the if block
  }
  // console.log(insideBlock); // ReferenceError: insideBlock is not defined
}
blockScopeExample();

for (let k = 0; k < 3; k++) {
  // k видима лише в межах циклу (включно з умовою і тілом)
}
// console.log(k); // ReferenceError: k is not defined
```

## 2. Hoisting + Temporal Dead Zone (TDZ)

`let` теж піднімається на фазі creation, **але** binding не ініціалізується значенням `undefined` — він лишається в стані «uninitialized» до рядка з оголошенням. Проміжок від початку блоку до цього рядка — Temporal Dead Zone. Будь-яке звернення до змінної в TDZ кидає `ReferenceError` (детально — [hoisting.md](hoisting.md)).

```js
// console.log(letVar); // ReferenceError: Cannot access 'letVar' before initialization
let letVar = "initialized now";
console.log(letVar); // initialized now

{
  // TDZ для zone починається тут, з відкриття блоку
  // console.log(zone); // ReferenceError: Cannot access 'zone' before initialization
  let zone = "value";
  // тут TDZ уже закінчилась
  console.log(zone); // value
}
```

TDZ — поняття **часове**, а не просторове: важливо не де рядок написаний, а коли він виконується. Функція, оголошена вище за `let`, може читати змінну — якщо її **викликати** після ініціалізації:

```js
function readLater() {
  return lateValue; // у тексті — «до» оголошення
}
let lateValue = "ready";
console.log(readLater()); // ready — виклик відбувся після ініціалізації
```

## 3. Re-declaration — заборонено

Повторне оголошення `let` у тій самій області видимості — `SyntaxError` ще **до** виконання коду (весь файл не запуститься):

```js
let unique = "first value";
// let unique = "second value"; // SyntaxError: Identifier 'unique' has already been declared
```

Але у вкладеному блоці — це вже інший binding, і це нормально (shadowing):

```js
let shadow = "outer";
{
  let shadow = "inner"; // НОВА змінна, вона затіняє зовнішню
  console.log(shadow); // inner
}
console.log(shadow); // outer
```

## 4. Reassignment — дозволено

`let` створює mutable binding — значення можна змінювати скільки завгодно (на відміну від [const.md](const.md)):

```js
let counter = 0;
counter = counter + 1;
counter += 1;
console.log(counter); // 2
```

## 5. Не стає властивістю глобального об'єкта

`let` на верхньому рівні скрипта створює binding у декларативній частині Global Environment Record, а **не** на самому `globalThis`:

```js
let globalLet = "not on globalThis";
console.log(globalThis.globalLet); // undefined
```

## 6. let у циклах — кожна ітерація отримує свій binding

Це головна причина, чому `let` «вирішує» класичну проблему замикань у циклах. Для кожної ітерації `for` рушій створює **нове** лексичне оточення з окремим binding'ом і копіює в нього значення з попередньої ітерації:

```js
let letCallbacks = [];
for (let m = 0; m < 3; m++) {
  letCallbacks.push(function () {
    console.log("let m =", m);
  });
}
letCallbacks.forEach((cb) => cb());
// let m = 0
// let m = 1
// let m = 2
```

Кожен колбек «запам'ятав» власне `m`, бо кожна ітерація — окремий Declarative Environment Record. Та сама ситуація з `var` — [var.md](var.md), розділ 6.

## 7. Лексичний скоупінг

`let` (як і `const`) підпорядковується лексичному скоупінгу: видимість визначається **місцем у коді**, а не тим, звідки функцію викликали ([scope.md](scope.md), розділ 5):

```js
let lexicalValue = "outer value";
function readsLexicalValue() {
  console.log(lexicalValue); // бере значення з лексичного оточення, де функція написана
}
{
  let lexicalValue = "inner value (does not affect the function above)";
}
readsLexicalValue(); // outer value
```

## 8. Під капотом: Declarative Environment Record

Для `let`-оголошень у поточному лексичному оточенні створюється binding у стані uninitialized на фазі creation. Виконання рядка `let x = ...` переводить його в стан initialized — саме до цього моменту й триває TDZ.

## Підсумок

- Scope: блочна — `{}`, `if`, `for`, `while` тощо.
- Hoisting: так, але без ініціалізації — TDZ до рядка оголошення; TDZ визначається часом виконання, а не позицією в тексті.
- Повторне оголошення в тому самому блоці — `SyntaxError`; у вкладеному блоці — shadowing.
- Переприсвоєння дозволене.
- Глобальний `let` не потрапляє на `globalThis`.
- У циклах кожна ітерація має власний binding — важливо для замикань.

## Задачі для закріплення

Двадцять задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Код виконуйте в консолі браузера чи в Node.js 24.

### Рівень 1. Основи

**1.** Що станеться при зверненні до `let` до оголошення?

```js
(() => { try { v; } catch (e) { return e.name + ': ' + e.message; } let v = 1; })()
```

**2.** Що поверне `typeof` для змінної в TDZ?

```js
(() => { try { typeof t; } catch (e) { return e.name; } let t; })()
```

**3.** Яка область видимості у `let` усередині блоку?

```js
(() => { { let b = 1; } return typeof b; })()
```

**4.** Чи можна перепризначити `let`?

```js
(() => { let a = 1; a = 2; return a; })()
```

**5.** Що станеться при повторному оголошенні `let` у тій самій області?

```js
(() => { try { eval('let a = 1; let a = 2;'); } catch (e) { return e.name; } })()
```

### Рівень 2. Деталі й поведінка

**6.** А в різних блоках?

```js
(() => { let a = 1; { let a = 2; } return a; })()
```

**7.** Чи затіняє `let` у вкладеному блоці зовнішню змінну до свого оголошення?

```js
(() => { let x = 1; { try { x; } catch (e) { return e.name; } let x = 2; } })()
```

**8.** Чи стає `let` властивістю `globalThis`?

```js
(() => { (0, eval)('let glob = 1'); return 'glob' in globalThis; })()
```

**9.** Що дасть `let` у `for` з замиканнями?

```js
(() => { const f = []; for (let i = 0; i < 3; i++) f.push(() => i); return f.map(g => g()); })()
```

**10.** Чи кожна ітерація `for (let ...)` має свою копію змінної?

```js
(() => { const f = []; for (let i = 0; i < 3; i++) { f.push(() => i); i++; } return f.map(g => g()); })()
```

### Рівень 3. Нюанси та пастки

**11.** Що буде із `let` у `for...of`?

```js
(() => { const f = []; for (let x of ['a', 'b']) f.push(() => x); return f.map(g => g()); })()
```

**12.** Що дасть деструктуризація з `let`?

```js
(() => { let [a, b] = [1, 2]; [a, b] = [b, a]; return [a, b]; })()
```

**13.** Що станеться з `let x = x`?

```js
(() => { try { eval('let x = x;'); } catch (e) { return e.name; } })()
```

**14.** Чи можна оголосити `let` без значення і яке в нього значення?

```js
(() => { let u; return u; })()
```

**15.** Чи є `let` у `switch`-кейсі окремою областю?

```js
(() => { try { eval('switch (1) { case 1: let a = 1; break; case 2: let a = 2; }'); } catch (e) { return e.name; } })()
```

### Рівень 4. Практика

**16.** Як обгорнути `case` у блок, щоб уникнути конфлікту?

```js
(() => { switch (2) { case 1: { let a = 1; return a; } case 2: { let a = 2; return a; } } })()
```

**17.** Що поверне замикання, що читає `let` після зміни?

```js
(() => { let c = 0; const g = () => c; c = 5; return g(); })()
```

**18.** Чи функція-вираз бачить `let` зі зовнішньої функції?

```js
(() => { let o = 'o'; return (function () { return o; })(); })()
```

**19.** Що буде із параметром за замовчуванням, що посилається на пізніший параметр?

```js
(() => { try { ((a = b, b = 1) => a)(); } catch (e) { return e.name; } })()
```

**20.** Що дає блок із `let` усередині `try`?

```js
(() => { try { let t = 1; throw t; } catch (e) { return typeof t; } })()
```

### Відповіді

1. `'ReferenceError: Cannot access 'v' before initialization'`
2. `'ReferenceError'`
3. `'undefined'`
4. `2`
5. `'SyntaxError'`
6. `1`
7. `'ReferenceError'`
8. `false`
9. `[0, 1, 2]`
10. `[1, 3]`
11. `['a', 'b']`
12. `[2, 1]`
13. `'ReferenceError'`
14. `undefined`
15. `'SyntaxError'`
16. `2`
17. `5`
18. `'o'`
19. `'ReferenceError'`
20. `'undefined'`
