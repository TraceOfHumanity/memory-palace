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

## Задачі для закріплення

Двадцять задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Код виконуйте в консолі браузера чи в Node.js 24.

### Рівень 1. Основи

**1.** Що станеться, якщо оголосити `const` без значення?

```js
(() => { try { eval('const a;'); } catch (e) { return e.name + ': ' + e.message; } })()
```

**2.** Що станеться при переприсвоєнні `const`?

```js
(() => { const a = 1; try { a = 2; } catch (e) { return e.name + ': ' + e.message; } })()
```

**3.** Чи можна змінювати властивості об'єкта, збереженого в `const`?

```js
(() => { const o = { n: 1 }; o.n = 2; return o; })()
```

**4.** Чи можна додавати елементи до `const`-масиву?

```js
(() => { const a = [1]; a.push(2); return a; })()
```

**5.** Чи захищає `Object.freeze` значення у `const`?

```js
(() => { const o = Object.freeze({ n: 1 }); o.n = 2; return o.n; })()
```

### Рівень 2. Деталі й поведінка

**6.** А вкладений об'єкт у frozen?

```js
(() => { const o = Object.freeze({ in: { n: 1 } }); o.in.n = 2; return o.in.n; })()
```

**7.** Що буде у strict при записі у frozen?

```js
(() => { 'use strict'; const o = Object.freeze({ n: 1 }); try { o.n = 2; } catch (e) { return e.name; } })()
```

**8.** Чи `const` має TDZ?

```js
(() => { try { c; } catch (e) { return e.name; } const c = 1; })()
```

**9.** Чи є `const` властивістю `globalThis`?

```js
(() => { (0, eval)('const gc = 1'); return 'gc' in globalThis; })()
```

**10.** Чи можна `const` у `for (const i = 0; ...; i++)`?

```js
(() => { try { eval('for (const i = 0; i < 2; i++) {}'); } catch (e) { return e.name; } })()
```

### Рівень 3. Нюанси та пастки

**11.** А `for (const x of ...)` працює?

```js
(() => { const r = []; for (const x of [1, 2]) r.push(x); return r; })()
```

**12.** А `for (const k in obj)`?

```js
(() => { const r = []; for (const k in { a: 1, b: 2 }) r.push(k); return r; })()
```

**13.** Чи можна використати деструктуризацію з `const`?

```js
(() => { const { a, b: { c } } = { a: 1, b: { c: 2 } }; return [a, c]; })()
```

**14.** Чи можна повторно оголосити `const` в іншому блоці?

```js
(() => { const a = 1; { const a = 2; } return a; })()
```

**15.** Що станеться при `const` + інкремент?

```js
(() => { const n = 1; try { eval('n++'); } catch (e) { return e.name; } })()
```

### Рівень 4. Практика

**16.** Що поверне `typeof` для `const`-стрілки?

```js
(() => { const f = () => 1; return typeof f; })()
```

**17.** Чи змінить `const`-змінну виклик функції, що отримала її значення?

```js
(() => { const n = 5; const inc = (x) => ++x; inc(n); return n; })()
```

**18.** Чи змінить виклик функції вміст масиву з `const`?

```js
(() => { const a = [1, 2]; const add = (arr) => arr.push(3); add(a); return a; })()
```

**19.** Як створити глибоко незмінний об'єкт через рекурсивний freeze?

```js
(() => { const deep = (o) => { Object.values(o).forEach(v => typeof v === 'object' && v && deep(v)); return Object.freeze(o); }; const o = deep({ a: { b: [1] } }); try { o.a.b.push(2); } catch (e) { return e.name; } })()
```

**20.** Що дасть `const` + замикання в циклі `while`?

```js
(() => { const f = []; let i = 0; while (i < 3) { const j = i; f.push(() => j); i++; } return f.map(g => g()); })()
```

### Відповіді

1. `'SyntaxError: Missing initializer in const declaration'`
2. `'TypeError: Assignment to constant variable.'`
3. `{ n: 2 }`
4. `[1, 2]`
5. `1`
6. `2`
7. `'TypeError'`
8. `'ReferenceError'`
9. `false`
10. `'TypeError'`
11. `[1, 2]`
12. `['a', 'b']`
13. `[1, 2]`
14. `1`
15. `'TypeError'`
16. `'function'`
17. `5`
18. `[1, 2, 3]`
19. `'TypeError'`
20. `[0, 1, 2]`
