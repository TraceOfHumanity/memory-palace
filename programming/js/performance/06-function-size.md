# V8: розмір функції та inlining

## Загальна ідея

Inlining — оптимізація TurboFan, яка копіює тіло функції прямо в місце виклику, усуваючи overhead функційного виклику (push/pop стека, передача аргументів, jump до адреси). Крім усунення overhead, inlining відкриває двері для подальших оптимізацій — V8 бачить більший контекст і може спростити математику, усунути мертвий код тощо.

## 1. Call overhead на рівні CPU

ARM64: кожен виклик функції коштує кількох додаткових інструкцій (детально про регістри й асемблер ARM64 — нотатка `programming/assembly/arm64/arm64.md`):

```asm
stp x29, x30, [sp, #-16]!  ; збережи frame pointer та link register
mov x0, #5                  ; передай аргумент a
mov x1, #3                  ; передай аргумент b
bl  add                     ; jump до функції (зберігає адресу повернення)
ldp x29, x30, [sp], #16    ; відновити стан після повернення
```

На мільйони викликів це відчутний overhead, навіть без урахування самого обчислення. Після inlining замість виклику лишається одна інструкція прямо в циклі:

```asm
add x0, x19, #5   ; i + 5 без жодного виклику
```

## 2. Ліміти inlining у V8

- розмір функції: приблизно до 600 байтів байт-коду;
- глибина inline: приблизно 5–6 рівнів вкладеності;
- кількість inline: приблизно 1000 на одну компіляцію.

Якщо функція перевищує ліміт — V8 ніколи її не інлайнить, незалежно від частоти виклику. Конкретні числа — деталь реалізації конкретної версії V8, а не стабільний контракт.

## 3. Inlining відкриває подальші оптимізації

Це найважливіший ефект inlining — після копіювання коду V8 бачить більший контекст і може оптимізувати далі:

```js
function multiplyByTwo(x) {
  return x * 2;
}
function addTen(x) {
  return x + 10;
}
function process(x) {
  return addTen(multiplyByTwo(x));
}
```

Після inlining V8 бачить (концептуально):

```js
function process(x) { return x * 2 + 10; }
```

Потім constant folding спрощує це до пари ARM64-інструкцій (зсув замість множення, одразу додавання константи):

```asm
lsl x0, x0, #1
add x0, x0, #10
```

Без inlining V8 не міг би побачити, що `(x * 2) + 10` — один простий вираз, бо `x * 2` і `x + 10` живуть у різних, окремо скомпільованих функціях.

## 4. Що руйнує inlining

### 4.1. Занадто велика функція (більше ~600 байтів байт-коду)

```js
function tooLarge(data) {
  // 100+ рядків → ніколи не інлайниться
}
```

### 4.2. `try`/`catch` усередині функції

```js
function withTryCatch(x) {
  try {
    return x * 2; // ❌ не інлайниться
  } catch (e) {
    return 0;
  }
}
```

### 4.3. Рекурсія

```js
function factorial(n) {
  return n <= 1 ? 1 : n * factorial(n - 1); // ❌ не інлайниться
}
```

### 4.4. Об'єкт `arguments` (legacy)

```js
function withArguments() {
  return arguments[0] + arguments[1]; // ❌ не інлайниться
}
```

### 4.5. `eval()`

```js
function withEval(x) {
  eval("console.log(x)"); // ❌ відключає всі оптимізації для функції
  return x * 2;
}
```

### 4.6. `debugger`

```js
function withDebugger(x) {
  debugger; // ❌ повністю відключає оптимізації
  return x * 2;
}
```

## 5. Важливий нюанс: `try`/`catch` зовні не руйнує inlining

```js
// ❌ try/catch усередині → функція не інлайниться
function processItemBad(item) {
  try {
    return item.value * 2;
  } catch (e) {
    return 0;
  }
}
```

```js
// ✅ try/catch зовні → функція інлайниться нормально
function processItem(item) {
  return item.value * 2; // чиста функція, інлайниться!
}
function safeProcess(item) {
  try {
    return processItem(item); // processItem інлайниться тут
  } catch (e) {
    return 0;
  }
}
```

Правило: `try`/`catch` руйнує inlining тільки для функції, усередині якої він знаходиться. Функції, що викликаються всередині `try`/`catch`, — інлайняться нормально.

## Правила для розміру функції та inlining

### Правило 1: розділяй велику логіку на маленькі функції

```js
// ❌ Неправильно: одна велика функція (не інлайниться)
// function processOrderBad(order) {
//   // валідація (20 рядків)
//   // розрахунок ціни (20 рядків)
//   // застосування знижки (20 рядків)
//   // форматування результату (20 рядків)
//   // загалом: ~80 рядків → не інлайниться
// }
```

```js
// ✅ Правильно: маленькі функції (кожна інлайниться)
function validateOrder(order) {
  return Boolean(order && order.items && order.items.length > 0);
}
function calculatePrice(order) {
  return order.items.reduce((sum, item) => sum + item.price * item.qty, 0);
}
function applyDiscount(price) {
  return price > 100 ? price * 0.9 : price;
}
function formatResult(price) {
  return `$${price.toFixed(2)}`;
}
function processOrder(order) {
  const valid = validateOrder(order);   // інлайниться
  const price = calculatePrice(order);   // інлайниться
  const final = applyDiscount(price);    // інлайниться
  return valid ? formatResult(final) : "Order is invalid";
}
```

### Правило 2: винось `try`/`catch` назовні

(Показано в розділі 5 вище: `processItem()` чиста, `safeProcess()` містить `try`/`catch`.)

### Правило 3: уникай `arguments`, використовуй rest parameters

```js
// ❌ Неправильно: arguments руйнує inlining
function sumBad() {
  let total = 0;
  for (let i = 0; i < arguments.length; i++) {
    total += arguments[i];
  }
  return total;
}
```

```js
// ✅ Правильно: rest parameters
function sum(...args) {
  let total = 0;
  for (let i = 0; i < args.length; i++) {
    total += args[i];
  }
  return total;
}
```

### Правило 4: ніколи не використовуй `eval()` у гарячих функціях

```js
// ❌ eval() — повністю відключає оптимізації для всієї функції
// function processTemplateBad(template, data) {
//   return eval(`\`${template}\``); // відключає все
// }
```

```js
// ✅ Використовуй явні підстановки
function processTemplate(template, data) {
  return template.replace(/\{(\w+)\}/g, (_, key) => data[key] ?? "");
}
console.log(processTemplate("Hello, {name}!", { name: "World" })); // "Hello, World!"
```

### Правило 5: тримай гарячі функції маленькими та чистими

Ідеальна hot function для inlining: маленька (< 10 рядків), без `try`/`catch`, без рекурсії, без `arguments`/`eval`/`debugger`, зі стабільними типами аргументів (детально — нотатка про стабільність типів).

```js
function dot(ax, ay, bx, by) {
  return ax * bx + ay * by;
}
function normalize(x, y) {
  const len = Math.sqrt(x * x + y * y);
  return { x: x / len, y: y / len };
}
// обидві інлайняться → V8 бачить весь вираз і оптимізує максимально
```

## 6. Як перевірити, чи функція інлайниться

```bash
node --trace-turbo-inlining myfile.js 2>&1 | head -50
```

Виведе щось на кшталт:

```text
Inlining small function add called from loop     ← ✅ інлайновано
Did not inline bigFunction (too large)            ← ❌ не інлайновано
Did not inline withTryCatch (try-catch in body)   ← ❌ не інлайновано
```

## Вплив на продуктивність — чесний бенчмарк

```js
const { performance } = require("perf_hooks");

// ✅ Маленька функція (інлайниться)
function addSmall(a, b) {
  return a + b;
}

// ❌ Велика функція (не інлайниться — штучно роздута)
function addLarge(a, b) {
  const r1 = a + b;
  const r2 = r1;
  const r3 = r2;
  const r4 = r3;
  const r5 = r4;
  const r6 = r5;
  const r7 = r6;
  const r8 = r7;
  const r9 = r8;
  return r9;
}

let result = 0;

let t0 = performance.now();
for (let i = 0; i < 100000000; i++) result = addSmall(i, i + 1);
console.log(`Small (inlined):     ${(performance.now() - t0).toFixed(0)}ms`);

t0 = performance.now();
for (let i = 0; i < 100000000; i++) result = addLarge(i, i + 1);
console.log(`Large (not inlined): ${(performance.now() - t0).toFixed(0)}ms`);
```

⚠️ **Реальний вимір** (Node.js v24): `Small (inlined): 66ms`, `Large (not inlined): 59ms` — тобто «велика» функція виявилась не повільнішою, а навіть трохи швидшою на цьому прогоні. `addLarge` тут — штучно роздута ланцюжком присвоєнь (`r1`...`r9`), а не реальною логікою; сучасний V8, найімовірніше, все одно спрощує цей ланцюжок до того самого результату ще до чи під час компіляції, тому штучний приклад не демонструє заявлену різницю в 3 рази. Це той самий висновок, що й у сусідніх нотатках цієї серії: сама механіка inlining і його лімітів задокументована й реальна, але наведений синтетичний бенчмарк застарів для сучасних версій рушія — щоб побачити реальний ефект, потрібна функція, яка справді не влазить у ліміт розміру чи використовує щось із розділу 4 (рекурсію, `try`/`catch`, `eval`), а не штучно подовжений, але тривіальний для оптимізатора код.

## Коли inlining найбільш критичний

1. Математичні утиліти — vector math, matrix operations, physics.
2. Гарячі цикли — функції всередині циклів з мільйонами ітерацій.
3. `requestAnimationFrame`-колбеки — виконуються 60 разів на секунду.
4. Array-методи на великих даних — колбек у `.map()`/`.filter()`/`.reduce()`.

Для рідко викликаних функцій (менше приблизно 1000 викликів) inlining не має помітного впливу.

## Підсумок

| Ситуація | Інлайниться? | Причина |
|---|---|---|
| Маленька чиста функція | ✅ Так | менше ліміту, без обмежень |
| Функція понад ~600 байтів байт-коду | ❌ Ні | перевищує ліміт розміру |
| `try`/`catch` усередині функції | ❌ Ні | складний потік виконання |
| Функція викликається в `try`/`catch` | ✅ Так | `try`/`catch` зовні не впливає |
| Рекурсивна функція | ❌ Ні | нескінченна глибина inline |
| Функція з `arguments` | ❌ Ні | legacy, відключає оптимізації |
| Функція з `eval()` | ❌ Ні | відключає всі оптимізації |

Ключовий принцип: тримай гарячі функції маленькими та чистими. Розділяй велику логіку на маленькі функції — V8 заінлайнить кожну з них і побачить більший контекст для подальших оптимізацій. Але, як показує розділ вище, не варто сподіватися на драматичний виграш від самого лише «зробити функцію коротшою» — реальний блокувальник inlining (розділ 4) значно важливіший за суб'єктивне відчуття «великий/маленький».
