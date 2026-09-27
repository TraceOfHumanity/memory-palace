# V8: спекулятивна оптимізація та деоптимізація

## Загальна ідея

Speculative optimization — ключова стратегія TurboFan: компілювати найшвидший можливий код на основі спостережень, і мати запасний план, якщо припущення виявилось хибним. Ця нотатка узагальнює механіки з попередніх нотаток цієї серії й додає практичні патерни для контролю деоптимізації.

## 1. Як працює speculation

V8 не просто компілює код — він компілює оптимістичний код із вбудованими перевірками (guards):

```js
function multiply(x) {
  return x * x;
}
```

V8 спостерігає: завжди SMI → компілює (концептуально):

```js
function multiply(x) {
  // GUARD: typeof x === SMI → якщо ні: DEOPTIMIZE
  return x * x; // пряма машинна інструкція
}
```

Guard — це маленька перевірка перед швидким кодом:

```asm
; ARM64: оптимізований multiply(x)
tst  x0, #1              ; перевір, чи x — SMI (bit tag)
bne  .deoptimize          ; якщо ні → deoptimize
mul  x0, x0, x0          ; x * x (швидко!)
ret
.deoptimize:
bl   DeoptimizeFunction  ; повернись до інтерпретатора
```

Якщо guard спрацьовує рідко або ніколи — функція працює на максимальній швидкості. Якщо часто — деоптимізація стає вузьким місцем (детально про регістри й асемблер ARM64 — нотатка `programming/assembly/arm64/arm64.md`).

## 2. Два типи деоптимізації

### 2.1. Eager deopt (негайна)

Відбувається, коли guard не пройшов прямо під час виконання:

```js
function add(a, b) {
  return a + b;
}
for (let i = 0; i < 100000; i++) add(i, 1); // 100k разів з числами →
                                              // TurboFan компілює під числа
// add("hello", " world"); // ← eager deopt тут і зараз
// V8: "guard failed! Викидаю оптимізований код, повертаюсь до Ignition"
```

### 2.2. Lazy deopt (відкладена)

Відбувається, коли зовнішній стан змінився, поки функція виконувалась:

```js
function processUser(user) {
  return user.name.toUpperCase(); // оптимізовано під { name: String }
}
// поки processUser виконується, хтось робить:
//   user.name = 42; // тип змінився! → lazy deopt при наступному виклику
```

## 3. Вартість деоптимізації

Один deopt event: зупини виконання оптимізованого коду → відтвори stack frame для інтерпретатора → продовж в Ignition (значно повільніше) → збери нову статистику типів → спробуй скомпілювати знову (тепер ширше). Функція тимчасово виконується в інтерпретаторі, поки не набереться достатньо спостережень для повторної компіляції.

Якщо деоптимізація відбувається в циклі `requestAnimationFrame`, навіть невелика затримка з'їдає помітну частку бюджету одного кадру (~16.67мс на 60fps).

## 4. Як знайти деоптимізації

```bash
node --trace-deopt myfile.js
node --trace-deopt --trace-deopt-verbose myfile.js
```

Виведе щось на кшталт:

```text
[deoptimizing (DEOPT eager)]: begin 0x2a4b multiply
  reason: not a Smi
  function: multiply (0x2a4b)
  bytecode offset: 4
[deoptimizing]: end 0x2a4b multiply => node=3 height=1 took 0.432 ms
```

Або через повний профіль:

```bash
node --prof myfile.js
node --prof-process isolate-*.log | grep -A5 "deopt"
```

## 5. Правильний «розігрів» функцій

V8 потребує кілька тисяч викликів, щоб вирішити компілювати функцію через TurboFan. Правильний warm-up критичний для production-коду.

```js
function calculate(x) {
  return x * 2 + 1;
}
```

```js
// ❌ Неправильний warm-up: різні типи під час розігріву
// calculate(1);
// calculate(1.5);   // ← HeapNumber під час warm-up!
// calculate("2");   // ← String під час warm-up!
// після warm-up функція стає поліморфною — повільна надовго
```

```js
// ✅ Правильний warm-up: тільки очікувані типи
for (let i = 0; i < 10000; i++) {
  calculate(i); // тільки SMI → TurboFan компілює під SMI
}
// тепер calculate оптимізована для чисел
```

## Правила для спекулятивної оптимізації

### Правило 1: не «бруднити» функції під час розробки чи тестування

```js
function calculatePrice(quantity, price) {
  // основна функція — завжди числа, завжди швидка
  return quantity * price;
}
// ❌ Тести з неправильними типами "бруднять" функцію
// calculatePrice("invalid", 10); // ← бруднить у тестах!
// calculatePrice(5, null);        // ← бруднить у тестах!
// у production функція вже поліморфна після тестів!
```

```js
// ✅ Перевіряй типи явно, не бруднь основну логіку
function safeCalculatePrice(quantity, price) {
  // захист тут — окремо від гарячої функції
  if (typeof quantity !== "number" || typeof price !== "number") {
    throw new TypeError("Expected numbers");
  }
  return calculatePrice(quantity, price);
}
```

### Правило 2: ізолюй поліморфний код від мономорфного

```js
// ❌ Поліморфний код в одній функції з гарячою логікою
function processValueBad(value) {
  const result = value * 2 + 1; // ця частина — гаряча, має бути monomorphic
  if (typeof value === "number") console.log(`Number: ${value}`); // поліморфне логування
  else if (typeof value === "string") console.log(`String: ${value}`);
  return result;
}
```

```js
// ✅ Розділи: гаряча функція залишається monomorphic
function processValue(value) {
  return value * 2 + 1; // завжди числа, monomorphic, inlining!
}
function logValue(value) {
  if (typeof value === "number") console.log(`Number: ${value}`);
  else if (typeof value === "string") console.log(`String: ${value}`);
}
function processValueWithLog(value) {
  const result = processValue(value); // processValue інлайниться
  logValue(value);                     // поліморфний код окремо
  return result;
}
```

### Правило 3: уникай зміни типів властивостей після ініціалізації

```js
// ❌ Зміна типу властивості → deopt для всього коду, що використовує об'єкт
const configBad = { timeout: 5000 }; // number
// десь пізніше:
// configBad.timeout = "disabled"; // ← змінює тип! Lazy deopt!
```

```js
// ✅ Використовуй окрему властивість для різних станів
const config = {
  timeout: 5000,
  timeoutDisabled: false,
};
config.timeoutDisabled = true; // Boolean → Boolean (стабільно)
```

### Правило 4: перевіряй типи на межах системи, не всередині

```js
// ❌ Перевірка типів усередині гарячої функції
function transformBad(matrix, vector) {
  if (!Array.isArray(matrix)) throw new Error("matrix must be array"); // guard всередині гарячої функції
  if (!Array.isArray(vector)) throw new Error("vector must be array");
  return [
    matrix[0] * vector[0] + matrix[1] * vector[1],
    matrix[2] * vector[0] + matrix[3] * vector[1],
  ];
}
```

```js
// ✅ Перевірка на межі + чиста гаряча функція
function validateInputs(matrix, vector) {
  if (!Array.isArray(matrix)) throw new Error("matrix must be array");
  if (!Array.isArray(vector)) throw new Error("vector must be array");
}
function transform(matrix, vector) {
  // чиста математика, без перевірок → завжди monomorphic
  return [
    matrix[0] * vector[0] + matrix[1] * vector[1],
    matrix[2] * vector[0] + matrix[3] * vector[1],
  ];
}

// використання:
const sampleMatrix = [1, 0, 0, 1];
const sampleVector = [3, 4];
validateInputs(sampleMatrix, sampleVector); // один раз, на межі
const transformResult = transform(sampleMatrix, sampleVector); // швидко, без guards
console.log(transformResult); // [ 3, 4 ]
```

### Правило 5: стеж за «отруєними» (poisoned) функціями

Функція може бути «отруєна» і не відновитись до оптимального стану після деоптимізації з поліморфного стану:

```js
function hotFunction(x) {
  return x + 1; // ніколи не отримує неправильний тип
}
// якщо хтось викликав з рядком: hotFunction("oops"); ← deopt! Тепер
// поліморфна надовго. Єдине надійне рішення в такому разі — створити
// нову функцію (свіжа компіляція) або перезапустити процес.
```

```js
// ✅ Захист: перевіряй у wrapper, не в самій функції
function hotFunctionSafe(x) {
  if (typeof x !== "number") return NaN; // wrapper перехоплює
  return hotFunction(x);
}
```

## 6. Deopt-resistant patterns

Патерни, які роблять код стійким до деоптимізації:

1. **Константні функції** — не деоптимізуються, якщо тип аргументів стабільний: `const double = (x) => x * 2;`
2. **Typed arrays** — V8 точно знає тип елементів: `new Float64Array(1000)` — жодних guards на тип значення.
3. **Методи класу зі стабільними формами:**

```js
class Vec2 {
  constructor(x, y) {
    this.x = x; // завжди number
    this.y = y; // завжди number
  }
  dot(other) {
    return this.x * other.x + this.y * other.y; // monomorphic надовго
  }
}
```

4. **Чисті функції (pure functions)** — легко оптимізуються та стабільні: `function lerp(a, b, t) { return a + (b - a) * t; }` — завжди числа, без побічних ефектів.

## Вплив на продуктивність — чесний бенчмарк

```js
const { performance } = require("perf_hooks");

function hotCalc(x) {
  return x * x + x * 2 + 1;
}

// ✅ Правильний warm-up
for (let i = 0; i < 10000; i++) hotCalc(i);

let t0 = performance.now();
for (let i = 0; i < 100000000; i++) hotCalc(i);
console.log(`After correct warmup: ${(performance.now() - t0).toFixed(0)}ms`);

// ❌ "Отруюємо" функцію
hotCalc("poison");
hotCalc(1.5);
hotCalc(null);

t0 = performance.now();
for (let i = 0; i < 100000000; i++) hotCalc(i);
console.log(`After poisoning:      ${(performance.now() - t0).toFixed(0)}ms`);
```

**Реальний вимір** (Node.js v24): `After correct warmup: 57ms`, `After poisoning: 613ms` — приблизно у 10.7 рази повільніше. Це один із небагатьох прикладів цієї серії, де ефект не лише реально відтворюється, а й перевершує заявлену в застарілих джерелах оцінку (~5x). «Отруєння» гарячої функції випадковими типами — це справді один із найдорожчих сюрпризів продуктивності, який легко пропустити в тестах чи debug-коді, і, на відміну від деяких сусідніх нотаток цієї серії, тут не варто заспокоюватись тим, що «сучасний V8 нібито все виправив сам».

## Підсумок: усі десять принципів разом

Speculative optimization — це фінальний шар. Усі попередні нотатки цієї серії по суті про те, щоб не змушувати V8 деоптимізуватись:

| Нотатка | Як запобігає deopt |
|---|---|
| Hidden classes | стабільна форма → guard для shape завжди проходить |
| Стабільність типів | стабільний тип → guard для типу завжди проходить |
| Escape analysis | менше об'єктів на купі → менше приводів для GC-пов'язаних guards |
| Inline caching | monomorphic IC → швидкий шлях без deopt |
| GC patterns | менше алокацій → менше GC-induced deopt |
| Розмір функції | маленькі функції → inlining → менше точок deopt |
| Оптимізація циклів | typed arrays → V8 точно знає типи → менше guards |
| Branch prediction | передбачувані гілки → CPU не флашить pipeline |
| Оптимізація алокацій | менше алокацій → менше тиску → стабільніша компіляція |
| Спекулятивна оптимізація | правильний warm-up → V8 компілює під правильний тип |

Ключовий принцип: V8 оптимізує агресивно, але потребує передбачуваності. Будь передбачуваним у типах, формах об'єктів та патернах доступу — і TurboFan згенерує код, що конкурує з компільованими мовами. Водночас, як показали виміри в цій серії нотаток, конкретна величина виграшу від кожного окремого принципу сильно залежить від версії рушія й точного коду — спекулятивна оптимізація (ця нотатка) виявилась одним із небагатьох прикладів, де застарілі оцінки навіть применшують реальний ефект.

## Чекліст

- [ ] Чи є функції, що отримують різні типи в різних контекстах?
- [ ] Чи «бруднять» тести або dev-код production-функції неправильними типами?
- [ ] Чи є зміни типів властивостей після ініціалізації об'єктів?
- [ ] Чи є валідація типів усередині гарячих функцій (виноси назовні)?
- [ ] Чи розігріваються гарячі функції правильними типами перед використанням?

## Профілювання: повний набір інструментів

```bash
node --trace-deopt myfile.js      # знайти всі deopt-події
node --trace-opt myfile.js        # детальний профіль оптимізацій
node --trace-ic myfile.js         # IC-стани (monomorphic/polymorphic/megamorphic)
node --prof myfile.js             # повний профіль для аналізу
node --prof-process isolate-*.log > profile.txt
```
