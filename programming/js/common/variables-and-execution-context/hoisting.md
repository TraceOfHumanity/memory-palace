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
