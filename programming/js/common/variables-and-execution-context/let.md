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
