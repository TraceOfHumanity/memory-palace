# Observer — патерн «підписка на події»

## 1. Що таке Observer

Observer — поведінковий патерн: об'єкт (Subject, «видавець») зберігає список підписників (Observers) і повідомляє їх про зміни, нічого не знаючи про їхню конкретну реалізацію. Зв'язок «один-до-багатьох».

Коли це корисно: зміна одного об'єкта має спричиняти реакції в інших, а їх кількість і склад заздалегідь невідомі (UI, логування, кеш); потрібно розв'язати зв'язок: видавець не імпортує підписників; події в застосунку: «користувача створено», «замовлення оплачено».

У JS патерн уже «вбудований»: DOM `addEventListener`, Node `EventEmitter`, RxJS `Observable`, Nest `EventEmitter2` — це все різновиди Observer.

## 2. Проблема: жорстка залежність від тих, хто цікавиться

```js
// ❌ Видавець знає про всіх і мусить змінюватись при кожному новому
// споживачі:
const emailService = { send: (u) => console.log(`email for ${u}`) };
const analytics = { track: (u) => console.log(`analytics: ${u}`) };

function registerUserBad(name) {
  // ...створення користувача...
  emailService.send(name);
  analytics.track(name);
  // потрібно додати push-сповіщення? Правимо саме цю функцію.
}
registerUserBad("Olya");
// email for Olya
// analytics: Olya
```

## 3. Мінімальна реалізація: Subject + subscribe / unsubscribe / notify

```js
class Subject {
  #observers = new Set(); // Set: без дублікатів, швидке видалення

  subscribe(observer) {
    this.#observers.add(observer);
    // повертаємо функцію відписки — зручно й безпечно (розділ 6)
    return () => this.unsubscribe(observer);
  }

  unsubscribe(observer) {
    this.#observers.delete(observer);
  }

  notify(data) {
    for (const observer of this.#observers) observer(data);
  }
}

const userRegistered = new Subject();

const unsubscribeEmail = userRegistered.subscribe((u) => console.log(`email for ${u}`));
userRegistered.subscribe((u) => console.log(`analytics: ${u}`));

userRegistered.notify("Olya");
// email for Olya
// analytics: Olya

unsubscribeEmail();
userRegistered.notify("Ivan");
// analytics: Ivan   — email більше не отримує
// нову реакцію додаємо без зміни коду видавця
```

## 4. Практичний приклад: сховище стану (міні-store)

Так працюють Redux, Vuex, Zustand: підписники отримують новий стан після кожної зміни.

```js
class Store {
  #state;
  #listeners = new Set();

  constructor(initial) {
    this.#state = initial;
  }

  getState() {
    return this.#state;
  }

  setState(patch) {
    const prev = this.#state;
    this.#state = { ...prev, ...patch }; // новий об'єкт, а не мутація
    for (const listener of this.#listeners) listener(this.#state, prev);
  }

  subscribe(listener) {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }
}

const store = new Store({ count: 0 });
const stop = store.subscribe((next, prev) => console.log(`count: ${prev.count} → ${next.count}`));
store.setState({ count: 1 }); // count: 0 → 1
store.setState({ count: 2 }); // count: 1 → 2
stop();
store.setState({ count: 3 }); // (тиша — відписались)
console.log(store.getState()); // { count: 3 }
```

## 5. Вбудований Observer у Node: EventEmitter

```js
const { EventEmitter } = require("node:events");

class Order extends EventEmitter {
  pay() {
    this.emit("paid", { id: 1, sum: 500 });
  }
}

const order = new Order();
order.on("paid", (o) => console.log(`paid #${o.id}: $${o.sum}`));
order.once("paid", () => console.log("first payment (once — just one time)"));

order.pay();
// paid #1: $500
// first payment (once — just one time)
order.pay();
// paid #1: $500
```

Відмінності від нашого `Subject`: іменовані події (`emit("paid")`, а не один канал); `once()`, `off()`, `listenerCount()`, `prependListener()`; спеціальна подія `"error"`: `emit("error")` без слухача кидає виняток. (Streams — теж `EventEmitter`: `node/core-concepts/streams/`.)

```js
try {
  new EventEmitter().emit("error", new Error("nothing to handle it"));
} catch (err) {
  console.log("emit('error') without a listener:", err.message); // nothing to handle it
}
```

## 6. Пастки Observer

Витік пам'яті (lapsed listener): підписник, якого забули відписати, утримується видавцем і не збирається GC, навіть коли більше не потрібен. Довгоживучий Subject + короткоживучі підписники = витік. Завжди відписуйтесь (`unsubscribe` у cleanup/dispose). Детально про GC і посилання — `common/data-structures/WeakMap/WeakMap.md`.

```js
const leaky = new EventEmitter();
for (let i = 0; i < 12; i++) leaky.on("tick", () => {});
console.log(leaky.listenerCount("tick")); // 12 — Node навіть попередить (MaxListenersExceededWarning понад 10)
leaky.removeAllListeners("tick");
```

Зміна списку під час розсилки: якщо підписник відписується (або підписує когось) у момент `notify` — ітерація по живому `Set` поводиться неочевидно: новододані підписники будуть викликані в цьому ж циклі.

```js
const tricky = new Subject();
tricky.subscribe(() => {
  console.log("A");
  tricky.subscribe(() => console.log("B (added during dispatch)"));
});
tricky.notify();
// A
// B (added during dispatch)
```

Безпечніше ітерувати по копії: `for (const o of [...this.#observers])`.

Помилка в одному підписнику ламає всіх:

```js
const fragile = new Subject();
fragile.subscribe(() => {
  throw new Error("subscriber failure");
});
fragile.subscribe(() => console.log("second subscriber"));
try {
  fragile.notify();
} catch (err) {
  console.log("dispatch interrupted:", err.message);
}
// dispatch interrupted: subscriber failure — "second subscriber" не викликався!
```

Рішення: `try`/`catch` навколо кожного виклику всередині `notify`.

Порядок і синхронність: `notify` синхронний: підписники виконуються один за одним і блокують видавця. Важкі реакції варто виносити в чергу/асинхронність (`common/asynchronous/asynchronous.md`). Не покладайтесь на порядок підписників.

Приховані зв'язки: надмірні події роблять потік виконання нечитабельним («хто саме відреагує на це?»). Для простої залежності прямий виклик кращий.

## 7. Observer vs Pub/Sub

Observer: підписники підписуються напряму на конкретний Subject, видавець знає список (хоч і абстрактний). Pub/Sub: між ними стоїть брокер (event bus / Redis / Kafka) — видавець і підписники взагалі не знають один про одного.

```js
class EventBus {
  #topics = new Map();

  on(topic, handler) {
    if (!this.#topics.has(topic)) this.#topics.set(topic, new Set());
    this.#topics.get(topic).add(handler);
    return () => this.#topics.get(topic)?.delete(handler);
  }

  emit(topic, payload) {
    for (const handler of this.#topics.get(topic) ?? []) handler(payload);
  }
}

const bus = new EventBus();
bus.on("user.created", (u) => console.log("welcome email for", u));
bus.on("user.created", (u) => console.log("audit log entry for", u));
bus.emit("user.created", "Olya");
// welcome email for Olya
// audit log entry for Olya
bus.emit("order.paid", 1); // тема без підписників — нічого не станеться
```

## 8. Async-варіанти та зв'язок з іншими темами

- `EventTarget`/`addEventListener` у браузері (і в Node) — стандартний Observer; `AbortController` зупиняє підписку (`common/asynchronous/asynchronous.md`).
- RxJS `Observable` — Observer + потоки даних: `map`/`filter`/`debounce` над подіями, ліниві, з відписками.
- Async iterators: `events.on(emitter, "x")` дозволяє `for await (const [v] of on(emitter, "x"))`.
- Proxy (`common/data-structures/Proxy/Proxy.md`) дозволяє «спостерігати» за змінами властивостей — реактивність Vue 3 побудована саме так:

```js
function observable(target, onChange) {
  return new Proxy(target, {
    set(obj, key, value) {
      const old = obj[key];
      obj[key] = value;
      onChange(key, old, value);
      return true;
    },
  });
}

const person = observable({ name: "Olya", age: 20 }, (k, o, n) => console.log(`${k}: ${o} → ${n}`));
person.age = 21; // age: 20 → 21
person.name = "Maria"; // name: Olya → Maria
```

У Nest: `@nestjs/event-emitter` (`EventEmitter2`, декоратор `@OnEvent`) — Observer як модуль, зручний, щоб розчепити сервіси (`node/nest/providers-and-dependency-injection.md`). Зв'язок з іншими патернами: Singleton нерідко виступає глобальним EventBus ([singleton.md](singleton.md)) — з усіма його мінусами прихованої глобальності.

## Підсумок

- Observer: Subject зберігає підписників і повідомляє їх про зміни, не знаючи їхньої реалізації — зв'язок «один-до-багатьох», слабка залежність.
- Мінімум: `subscribe`/`unsubscribe`/`notify`; зручно, щоб `subscribe` повертав функцію відписки, а підписники жили в `Set`.
- У JS патерн вбудований: `EventEmitter` (Node), `EventTarget` (DOM), RxJS, Redux-подібні store, реактивність на Proxy (Vue 3).
- Пастки: витік пам'яті (забута відписка), зміна списку під час розсилки (ітеруйте по копії), виняток в одного підписника зриває решту (try/catch навколо кожного), синхронність блокує видавця, приховані зв'язки ускладнюють читання коду.
- `EventEmitter`: `emit("error")` без слухача кидає виняток; `once()` для одноразових реакцій; понад 10 слухачів — попередження.
- Observer знає про підписників напряму, Pub/Sub — через брокера (event bus, черга повідомлень), тому видавець і підписники повністю розчеплені.
- Не зловживайте: для простої залежності прямий виклик читабельніший за подію.
