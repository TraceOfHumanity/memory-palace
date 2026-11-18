# Decorator — патерн «додати поведінку, обгорнувши об'єкт»

## 1. Що таке Decorator

Decorator — структурний патерн: динамічно додає об'єкту нову поведінку, обгортаючи його в інший об'єкт із тим самим інтерфейсом. Обгортка виконує власну логіку до/після виклику вкладеного об'єкта. Обгортки можна нашаровувати: декоратор над декоратором.

Навіщо: розширити поведінку без наслідування (не плодити підкласи «CoffeeWithMilkAndSugar…»); додавати/прибирати можливості під час роботи програми; дотримання Open/Closed: клас не змінюється, поведінка розширюється; комбінувати незалежні «шари» (логування + кеш + повтор).

У JS існують три різні речі під назвою «decorator»: 1) патерн Decorator (цей файл, розділи 2–5); 2) функції-декоратори — обгортки функцій (розділ 6); 3) синтаксис `@decorator` для класів (розділ 7), яким користується Nest.

## 2. Проблема: комбінаторний вибух підкласів

```js
// ❌ Кава з молоком, кава з цукром, кава з молоком і цукром, латте з
// сиропом... Кожна комбінація — новий клас: 2ⁿ підкласів для n добавок.
// class CoffeeWithMilk extends Coffee {}
// class CoffeeWithMilkAndSugar extends CoffeeWithMilk {}  // і так далі
```

## 3. Класична реалізація: обгортка з тим самим інтерфейсом

```js
// спільний інтерфейс (duck typing): cost() і description()
class Coffee {
  cost() {
    return 50;
  }
  description() {
    return "Coffee";
  }
}

// базовий декоратор: тримає обгорнутий об'єкт і за замовчуванням делегує
class CoffeeDecorator {
  constructor(coffee) {
    this.coffee = coffee;
  }
  cost() {
    return this.coffee.cost();
  }
  description() {
    return this.coffee.description();
  }
}

class Milk extends CoffeeDecorator {
  cost() {
    return super.cost() + 10;
  }
  description() {
    return `${super.description()} + milk`;
  }
}

class Sugar extends CoffeeDecorator {
  cost() {
    return super.cost() + 5;
  }
  description() {
    return `${super.description()} + sugar`;
  }
}

class Syrup extends CoffeeDecorator {
  cost() {
    return super.cost() + 15;
  }
  description() {
    return `${super.description()} + syrup`;
  }
}

let order = new Coffee();
console.log(order.description(), order.cost()); // Coffee 50

order = new Milk(order);
order = new Sugar(order);
order = new Syrup(order);
console.log(order.description(), order.cost()); // Coffee + milk + sugar + syrup 80

// довільна комбінація без нових класів; можна навіть подвійно:
const doubleSugar = new Sugar(new Sugar(new Coffee()));
console.log(doubleSugar.description(), doubleSugar.cost()); // Coffee + sugar + sugar 60
```

Клієнт працює з `order` так само, як із `Coffee` — інтерфейс той самий.

## 4. Порядок декораторів має значення

Кожен шар виконується «зсередини назовні»: зовнішній декоратор бачить результат внутрішнього. Якщо операції не комутативні — порядок змінює результат:

```js
class Discount extends CoffeeDecorator {
  cost() {
    return super.cost() * 0.5; // знижка 50% на все, що всередині
  }
}

console.log(new Discount(new Milk(new Coffee())).cost()); // (50 + 10) * 0.5 = 30
console.log(new Milk(new Discount(new Coffee())).cost()); // 50 * 0.5 + 10 = 35
```

## 5. Декоратор як обгортка об'єкта з поведінкою: потоки даних

Класичний реальний приклад: обгортки над «джерелом даних».

```js
class PlainStorage {
  #data = new Map();
  write(key, value) {
    this.#data.set(key, value);
  }
  read(key) {
    return this.#data.get(key);
  }
}

class LoggingStorage {
  constructor(inner) {
    this.inner = inner;
  }
  write(key, value) {
    console.log(`  [log] write ${key}`);
    this.inner.write(key, value);
  }
  read(key) {
    console.log(`  [log] read ${key}`);
    return this.inner.read(key);
  }
}

class EncryptedStorage {
  constructor(inner) {
    this.inner = inner;
  }
  // "шифрування" — обернення рядка, лише для демонстрації
  #scramble = (s) => [...s].reverse().join("");
  write(key, value) {
    this.inner.write(key, this.#scramble(value));
  }
  read(key) {
    return this.#scramble(this.inner.read(key));
  }
}

const storage = new LoggingStorage(new EncryptedStorage(new PlainStorage()));
storage.write("token", "abc123"); //   [log] write token
console.log(storage.read("token")); //   [log] read token → abc123
```

Дані у `PlainStorage` зберігаються зашифрованими; лог і шифрування незалежні й складаються довільно (як `node:zlib` + crypto streams: `node/core-concepts/streams/05-duplex-and-transform.md`).

## 6. Функції-декоратори (higher-order functions)

У JS функції — значення, тому найприродніший декоратор — функція, яка приймає функцію й повертає нову з додатковою поведінкою (замикання — `common/closures.md`).

```js
const withLogging = (fn) => (...args) => {
  console.log(`  call ${fn.name}(${args.join(", ")})`);
  const result = fn(...args);
  console.log(`  result: ${result}`);
  return result;
};

const withTiming = (fn) => (...args) => {
  const start = performance.now();
  const result = fn(...args);
  const ms = performance.now() - start;
  console.log(`  ${fn.name} took ${ms < 5 ? "<5" : ms.toFixed(0)} ms`);
  return result;
};

const withRetry = (times) => (fn) => (...args) => {
  let lastError;
  for (let attempt = 1; attempt <= times; attempt++) {
    try {
      return fn(...args);
    } catch (err) {
      lastError = err;
      console.log(`  attempt ${attempt} failed: ${err.message}`);
    }
  }
  throw lastError;
};

function add(a, b) {
  return a + b;
}

const decoratedAdd = withLogging(withTiming(add));
decoratedAdd(2, 3);
//   call (2, 3)        ← ім'я порожнє: withTiming повернув анонімну стрілку
//   add took <5 ms
//   result: 5
// (withLogging бачить обгортку withTiming, а не add — див. пастку з name нижче)

// композиція кількох декораторів:
const compose = (...decorators) => (fn) => decorators.reduceRight((acc, d) => d(acc), fn);

let attempts = 0;
function flaky() {
  attempts++;
  if (attempts < 3) throw new Error("temporary failure");
  return "success";
}

const reliable = compose(withLogging, withRetry(3))(flaky);
console.log(reliable());
//   call ()                          — withLogging зовнішній: спрацював один раз
//   attempt 1 failed: temporary failure
//   attempt 2 failed: temporary failure
//   result: success
// success
// (compose(A, B)(fn) = A(B(fn)): retry вкладений всередину логування)
```

Пастка: `name` і властивості. Обгортка — інша функція: `fn.name` стає `""` або назвою внутрішньої стрілки, зникає `fn.length`, властивості оригіналу. Виправлення — скопіювати потрібне:

```js
const preserve = (wrapper, original) => Object.defineProperty(wrapper, "name", { value: original.name });

console.log(add.name); // add
console.log(withLogging(add).name); // "" — втрачено (анонімна стрілка)
console.log(preserve(withLogging(add), add).name); // add
```

Пастка: `this`. Стрілка-обгортка не зберігає `this` виклику. Для методів використовуйте `function` + `fn.apply(this, args)` (`common/this.md`):

```js
function withLoggingMethod(fn) {
  return function (...args) {
    console.log(`  method ${fn.name}`);
    return fn.apply(this, args);
  };
}

const counter = {
  value: 10,
  inc: withLoggingMethod(function inc() {
    return ++this.value;
  }),
};
console.log(counter.inc()); // method inc → 11
```

Пастка: `async`. Обгортка async-функції має чекати результат:

```js
const withAsyncTiming = (fn) => async (...args) => {
  const result = await fn(...args); // без await час замірявся б до завершення
  console.log("  async completed");
  return result;
};
withAsyncTiming(async (x) => x * 2)(21).then((v) => console.log(v)); // async completed → 42
// (детально async — common/asynchronous/asynchronous.md)
```

## 7. Синтаксис @decorator (TC39 / TypeScript)

Синтаксичний цукор, що застосовує функцію-декоратор до класу чи його членів. В Node без транспіляції не працює — нижче показано, що саме відбувається «під капотом»:

```text
@Log
class Service {
  @Cache
  load() { … }
}

еквівалентно:
  class Service { load() { … } }
  Service.prototype.load = Cache(Service.prototype.load);   // (спрощено)
  Service = Log(Service);
```

Ручний «метод-декоратор» без спеціального синтаксису:

```js
function Log(target, key) {
  const original = target[key];
  target[key] = function (...args) {
    console.log(`  @Log ${key}(${args.join(", ")})`);
    return original.apply(this, args);
  };
}

class Service {
  load(id) {
    return `data ${id}`;
  }
}
Log(Service.prototype, "load"); // те, що зробив би @Log
console.log(new Service().load(7)); //   @Log load(7) → data 7
```

У NestJS декоратори (`@Controller`, `@Injectable`, `@Get`, `@UseGuards`) здебільшого реєструють метадані (`reflect-metadata`), а не обгортають виклики — детально `node/nest/controllers.md`, `node/nest/modules.md`. TypeScript-декоратори: legacy (`experimentalDecorators`, Nest) і нові стандартні (TS 5+ / TC39 Stage 3) мають різні сигнатури.

## 8. Decorator vs Proxy vs Inheritance vs Composite

- Decorator vs Наслідування: наслідування статичне (на етапі опису класу), декоратор — динамічний (комбінація в runtime), без вибуху підкласів.
- Decorator vs Proxy ([proxy.md](proxy.md)): технічно схожі; Proxy керує доступом і зазвичай сам створює/тримає реальний об'єкт, Decorator додає поведінку до вже наданого клієнтом об'єкта.
- Decorator vs Composite ([composite.md](composite.md)): обгортка одного об'єкта проти агрегації багатьох.
- Middleware (Express/Nest/Koa) — по суті ланцюжок декораторів запиту.

## 9. Пастки патерна

1. Багато дрібних обгорток → складний стек викликів і налагодження.
2. Порядок шарів впливає на результат (розділ 4) — документуйте.
3. Ідентичність: `decorated !== original`; `instanceof` для обгортки з іншого класу не спрацює.

```js
console.log(new Milk(new Coffee()) instanceof Coffee); // false
```

4. Видалити конкретний шар зі середини ланцюжка важко — обгортки «вшиті» одна в одну.
5. Для двох-трьох варіантів простіше параметр чи спрощена функція; не створюйте декоратори «про запас».

## Підсумок

- Decorator обгортає об'єкт іншим із тим самим інтерфейсом і додає поведінку до/після виклику; обгортки можна нашаровувати.
- Замінює наслідування там, де комбінацій забагато: додаємо можливості в runtime без 2ⁿ підкласів (Open/Closed).
- Порядок декораторів важливий: шари виконуються зсередини назовні.
- У JS найприродніша форма — функції вищого порядку: `withLogging(fn)`, `withRetry(3)(fn)`, `compose(...)`; пастки: втрата `name`/`length`, `this` (використовуйте `function` + `apply`), `async` (потрібен `await`).
- Синтаксис `@decorator` — цукор для застосування таких функцій до класів/методів; у Nest переважно реєструє метадані.
- Відмінності: Proxy контролює доступ, Decorator додає поведінку, Composite агрегує багатьох, Adapter змінює інтерфейс.
- Пастки: складне налагодження глибоких стеків обгорток, залежність від порядку, зникає `instanceof`, важко прибрати шар зсередини.

## Задачі для закріплення

14 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Код виконуйте в консолі браузера чи в Node.js 24.

### Рівень 1. Основи

**1.** Реалізуйте декоратор `withLog(fn)`, що записує виклики.

```js
const logs = []; const withLog = (fn) => (...a) => { const r = fn(...a); logs.push(`${fn.name || 'fn'}(${a.join(',')}) -> ${r}`); return r; }
```

**2.** Реалізуйте `memoize(fn)` як декоратор.

```js
const memoize = (fn) => { const c = new Map(); return (x) => c.has(x) ? c.get(x) : (c.set(x, fn(x)), c.get(x)); }
```

**3.** Реалізуйте `retry(n)(fn)`.

```js
const retry = (n) => (fn) => (...a) => { let last; for (let i = 0; i < n; i++) { try { return fn(...a); } catch (e) { last = e; } } throw last; }
```

**4.** Реалізуйте `timed(fn)`, що повертає також тривалість (фіксований годинник).

```js
const timed = (fn, now) => (...a) => { const s = now(); const r = fn(...a); return { r, ms: now() - s }; }
```

### Рівень 2. Деталі й поведінка

**5.** Реалізуйте декоратор `once(fn)`.

```js
const once = (fn) => { let d = false, r; return (...a) => d ? r : (d = true, r = fn(...a)); }
```

**6.** Оберніть клас: `Coffee` з декораторами `Milk`, `Sugar`.

```js
class Coffee { cost() { return 5; } desc() { return 'coffee'; } } class Milk { constructor(c) { this.c = c; } cost() { return this.c.cost() + 2; } desc() { return this.c.desc() + '+milk'; } } class Sugar { constructor(c) { this.c = c; } cost() { return this.c.cost() + 1; } desc() { return this.c.desc() + '+sugar'; } }
```

**7.** Складіть декоратори функцій (`compose`) із перевіркою порядку.

```js
const compose = (...d) => (f) => d.reduceRight((g, dec) => dec(g), f); const up = (f) => (...a) => String(f(...a)).toUpperCase(); const ex = (f) => (...a) => f(...a) + '!'
```

**8.** Створіть декоратор доступу `requireRole('admin')`.

```js
const requireRole = (r) => (fn) => (user, ...a) => user.roles.includes(r) ? fn(user, ...a) : 'forbidden'
```

### Рівень 3. Нюанси та пастки

**9.** Реалізуйте декоратор методу (стандарт TC39 для методів через функцію-обгортку).

```js
const logged = (m) => function (...a) { return 'log:' + m.apply(this, a); }; class A { v = 2; calc(x) { return x * this.v; } } A.prototype.calc = logged(A.prototype.calc)
```

**10.** Додайте кешування з TTL: `cache(fn, ttl, now)`.

```js
const cache = (fn, ttl, now) => { const m = new Map(); return (x) => { const e = m.get(x); if (e && now() - e.t < ttl) return e.v; const v = fn(x); m.set(x, { v, t: now() }); return v; }; }
```

**11.** Збережіть метадані функції при декоруванні (`name`, `length`).

```js
const wrap = (fn) => { const w = (...a) => fn(...a); Object.defineProperty(w, 'name', { value: fn.name }); Object.defineProperty(w, 'length', { value: fn.length }); return w; }
```

**12.** Чим Decorator відрізняється від наслідування?

### Рівень 4. Практика

**13.** Чим патерн Decorator відрізняється від синтаксису `@decorator`?

**14.** Чому порядок декораторів важливий?

### Відповіді

1. Виклик `(() => { logs.length = 0; const add = withLog(function add(a, b) { return a + b; }); add(1, 2); add(3, 4); return logs; })()` → `['add(1,2) -> 3', 'add(3,4) -> 7']`
2. Виклик `(() => { let n = 0; const sq = memoize(x => (n++, x * x)); sq(3); sq(3); sq(4); return n; })()` → `2`
3. Виклик `(() => { let c = 0; const f = retry(3)(() => { if (++c < 3) throw new Error('x'); return 'ok' + c; }); return [f(), c]; })()` → `['ok3', 3]`
4. Виклик `(() => { let t = 0; return timed(x => x * 2, () => (t += 5))(21); })()` → `{ r: 42, ms: 5 }`
5. Виклик `(() => { let n = 0; const f = once(() => ++n); return [f(), f(), n]; })()` → `[1, 1, 1]`
6. Виклик `(() => { const c = new Sugar(new Milk(new Sugar(new Coffee()))); return [c.cost(), c.desc()]; })()` → `[9, 'coffee+sugar+milk+sugar']`
7. Виклик `[compose(up, ex)((x) => x)('hi'), compose(ex, up)((x) => x)('hi')]` → `['HI!', 'HI!']`
8. Виклик `(() => { const del = requireRole('admin')((u, id) => 'deleted ' + id); return [del({ roles: ['admin'] }, 1), del({ roles: ['user'] }, 1)]; })()` → `['deleted 1', 'forbidden']`
9. Виклик `new A().calc(5)` → `'log:10'`
10. Виклик `(() => { let t = 0, calls = 0; const f = cache(x => (calls++, x), 10, () => t); f(1); t = 5; f(1); t = 20; f(1); return calls; })()` → `2`
11. Виклик `(() => { function add(a, b) { return a + b; } const w = wrap(add); return [w.name, w.length, w(1, 2)]; })()` → `['add', 2, 3]`
12. Додає поведінку об'єкту динамічно через обгортку з тим самим інтерфейсом, не змінюючи клас і дозволяючи комбінувати обгортки в довільному порядку
13. Патерн — структура обгорток; `@decorator` у TypeScript/JS — синтаксис метапрограмування, що застосовує функцію до класу/методу, і може реалізовувати цей патерн
14. Кожен обгортає результат попереднього, тому зміна порядку змінює результат (наприклад, логування до чи після кешування)
