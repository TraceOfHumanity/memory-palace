# const — блочно-скоупне оголошення з незмінним binding'ом (ES2015)

## 1. Block scope — як і let

`const` має блочну область видимості — прив'язана до найближчого `{}`, так само як [let.md](let.md):

```js
function blockScopeExample() {
  if (true) {
    const insideBlock = "inside the if block";
    console.log(insideBlock); // inside the if block
  }
  // console.log(insideBlock); // ReferenceError: insideBlock is not defined
}
blockScopeExample();
```

## 2. Hoisting + Temporal Dead Zone

Як і `let`, `const` піднімається на фазі creation у стані «uninitialized», і звернення до неї до рядка оголошення кидає `ReferenceError` ([hoisting.md](hoisting.md)):

```js
// console.log(constVar); // ReferenceError: Cannot access 'constVar' before initialization
const constVar = "must be initialized right away";
console.log(constVar); // must be initialized right away
```

## 3. Обов'язкова ініціалізація при оголошенні

На відміну від `var` і `let`, `const` **вимагає** значення в момент оголошення. Без нього — `SyntaxError` ще до виконання коду:

```js
// const noValue; // SyntaxError: Missing initializer in const declaration
const withValue = "required";
```

## 4. Re-declaration — заборонено (як і в let)

```js
const uniqueConst = "first value";
// const uniqueConst = "second value"; // SyntaxError: Identifier 'uniqueConst' has already been declared
```

## 5. Reassignment — заборонено (головна відмінність від let)

`const` створює **immutable binding** — ідентифікатору не можна присвоїти інше значення:

```js
const pi = 3.14159;
try {
  pi = 3.14;
} catch (err) {
  console.log(err.message); // Assignment to constant variable.
}
```

## 6. Immutable binding ≠ immutable value

`const` робить незмінним **посилання** (binding), а не саме значення. Якщо значення — об'єкт чи масив, його вміст можна змінювати; заборонено лише «перенаправити» ідентифікатор на інше значення:

```js
const user = { name: "John", age: 30 };
user.age = 31; // ок — змінюємо властивість об'єкта, а не binding
user.city = "Kyiv"; // ок — можна навіть додавати властивості
console.log(user); // { name: 'John', age: 31, city: 'Kyiv' }
// user = { name: "Alex" }; // TypeError: Assignment to constant variable.

const numbers = [1, 2, 3];
numbers.push(4); // ок — мутація масиву
numbers[0] = 100; // ок
console.log(numbers); // [ 100, 2, 3, 4 ]
// numbers = [5, 6, 7]; // TypeError: Assignment to constant variable.
```

Якщо потрібна незмінність **вмісту** — `Object.freeze()` (детально — [Object.md](../data-structures/Object/Object.md)):

```js
const frozenUser = Object.freeze({ name: "Ann", address: { city: "Lviv" } });

frozenUser.name = "Bob"; // sloppy mode: запис мовчки ігнорується
console.log(frozenUser.name); // Ann

function renameStrict() {
  "use strict";
  frozenUser.name = "Bob"; // strict mode: помилка
}
try {
  renameStrict();
} catch (err) {
  console.log(err.message); // Cannot assign to read only property 'name' of object '#<Object>'
}

frozenUser.address.city = "Odesa"; // freeze — поверхневий (shallow)
console.log(frozenUser.address.city); // Odesa — вкладений об'єкт не заморожено
```

## 7. Не стає властивістю глобального об'єкта (як і let)

```js
const globalConst = "not on globalThis";
console.log(globalThis.globalConst); // undefined
```

## 8. const у циклах

У класичному `for (const i = 0; ...; i++)` const не підходить: крок `i++` — це переприсвоєння. Перша ітерація виконається, а на `i++` — `TypeError`:

```js
const iterations = [];
try {
  for (const n = 0; n < 3; n++) {
    iterations.push(n);
  }
} catch (err) {
  console.log(iterations, err.message); // [ 0 ] Assignment to constant variable.
}
```

У `for...of` / `for...in` `const` використовувати можна й прийнято: на кожній ітерації створюється **новий** binding.

```js
for (const item of ["a", "b", "c"]) {
  console.log("const item =", item);
}
// const item = a
// const item = b
// const item = c
```

## 9. Лексичний скоупінг (як і let)

```js
const lexicalValue = "outer value";
function readsLexicalValue() {
  console.log(lexicalValue);
}
{
  const lexicalValue = "inner value";
}
readsLexicalValue(); // outer value
```

## 10. Під капотом: Declarative Environment Record

`const`, як і `let`, створює binding у Declarative Environment Record поточного лексичного оточення зі станом uninitialized (звідси TDZ). Відмінність — binding позначений як immutable: будь-яке присвоєння, крім самої ініціалізації, дає `TypeError`.

## Підсумок

- Scope: блочна, як у `let`; hoisting — з TDZ.
- Ініціалізація при оголошенні обов'язкова (`SyntaxError` без неї).
- Повторне оголошення — `SyntaxError`; переприсвоєння — `TypeError`.
- `const` захищає binding, а не значення: вміст об'єктів і масивів можна мутувати; для незмінності вмісту — `Object.freeze` (лише поверхнево).
- У класичному `for` з `i++` const не працює, у `for...of`/`for...in` — працює.
- Глобальний `const` не потрапляє на `globalThis`.
- Рекомендований дефолт: `const`, а `let` — лише коли потрібне переприсвоєння.
