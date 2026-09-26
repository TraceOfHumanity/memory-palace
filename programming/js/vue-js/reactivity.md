# Vue.js: реактивність

## Загальна характеристика

**Реактивність** — це механізм, за якого зміна даних автоматично призводить до повторного виконання коду, що від цих даних залежить. Розробник не повідомляє системі, що саме потрібно оновити: система сама **відстежує залежності** під час виконання коду й сама запускає його знову.

У Vue 3 реактивність побудована на трьох ідеях:

1. **Відстеження (track).** Коли код читає реактивну властивість, система запам'ятовує, який саме ефект (функція) її прочитав.
2. **Запуск (trigger).** Коли властивість змінюється, система знаходить усі ефекти, що її читали, і запускає їх знову.
3. **Дрібнозернистість.** Залежність записується на рівні **окремої властивості**, а не всього об'єкта чи компонента. Ефект, який не читав `b`, не запускатиметься зміною `b`.

Технічно це реалізовано через вбудований у мову об'єкт `Proxy` (детально — `common/data-structures/Proxy/Proxy.js` у цій теці): пастка `get` викликає `track`, пастка `set` — `trigger`.

## Як запускати приклади

Приклади виконуються в звичайному Node.js через пакет `@vue/reactivity` — той самий рушій, що працює всередині Vue 3. Усі блоки ` ```js `, склеєні по порядку, утворюють один робочий скрипт.

```bash
npm install --save-dev @vue/reactivity
```

```js
const {
  reactive, ref, effect, toRefs, toRaw,
  shallowReactive, shallowRef, triggerRef, watch,
} = require("@vue/reactivity");
```

## 1. Механізм зсередини: мінімальна реалізація

Щоб зрозуміти реактивність, корисно написати її самостійно. Сховище залежностей має три рівні:

```text
WeakMap:  реактивний об'єкт → Map
Map:      назва властивості → Set
Set:      ефекти, які цю властивість читали
```

```js
const targetMap = new WeakMap();
let activeEffect = null; // ефект, який виконується просто зараз

function track(target, key) {
  if (!activeEffect) return; // читання поза ефектом ніхто не відстежує
  let depsMap = targetMap.get(target);
  if (!depsMap) targetMap.set(target, (depsMap = new Map()));
  let dep = depsMap.get(key);
  if (!dep) depsMap.set(key, (dep = new Set()));
  dep.add(activeEffect);
}

function trigger(target, key) {
  const dep = targetMap.get(target)?.get(key);
  if (dep) [...dep].forEach((run) => run()); // копія: ефект може змінити сам Set
}

function miniReactive(obj) {
  return new Proxy(obj, {
    get(target, key, receiver) {
      track(target, key); // хтось прочитав властивість: запам'ятовуємо хто
      return Reflect.get(target, key, receiver);
    },
    set(target, key, value, receiver) {
      const ok = Reflect.set(target, key, value, receiver);
      trigger(target, key); // властивість змінилась: будимо тих, хто її читав
      return ok;
    },
  });
}

function miniEffect(fn) {
  const run = () => {
    activeEffect = run;
    try {
      fn();
    } finally {
      activeEffect = null;
    }
  };
  run(); // перший запуск потрібен, щоб зібрати залежності
}

const miniState = miniReactive({ count: 0, other: 0 });
let miniRuns = 0;
miniEffect(() => {
  miniRuns++;
  miniState.count; // ефект читає лише count
});

miniState.count++;
miniState.other++; // цього ефект не читав
miniState.count++;
console.log(miniRuns);
```

```text
3
```

Ефект виконався тричі: перший запуск і дві зміни `count`. Зміна `other` його не зачепила — це і є дрібнозерниста залежність.

Ця реалізація навмисно спрощена. Справжній рушій додатково обробляє вкладені об'єкти, масиви, `Map` і `Set`, очищує застарілі залежності між запусками, підтримує планувальник і вкладені ефекти.

## 2. Справжній API: `reactive` та `effect`

```js
const state = reactive({ a: 1, b: 2 });

let stateRuns = 0;
effect(() => {
  stateRuns++;
  state.a; // читаємо лише a
});

state.a = 2;
state.a = 3;
state.b = 9; // ефект b не читав
console.log(stateRuns);
```

```text
3
```

Зверніть увагу: `effect` запускається **синхронно** після кожної окремої зміни. Дві зміни `a` — два запуски. У застосунку Vue оновлення інтерфейсу групуються планувальником (розділ 9), а «голий» `effect` цього не робить.

## 3. `ref`: обгортка для примітивів

`Proxy` працює лише з об'єктами, тому реактивне число, рядок чи булеве значення не можна створити через `reactive`. Для цього існує `ref`: об'єкт із єдиною властивістю `.value`, читання й запис якої відстежуються.

```js
const counter = ref(0);
let counterRuns = 0;
effect(() => {
  counterRuns++;
  counter.value;
});

counter.value++;
counter.value = counter.value; // те саме значення
console.log(counterRuns);
```

```text
2
```

Запис того самого значення запуску не спричиняє: система порівнює нове значення зі старим.

## 4. Глибина реактивності та типи даних

### 4.1. Вкладені об'єкти

`reactive` **глибокий**: вкладені об'єкти стають реактивними теж (ліниво, при першому зверненні). `shallowReactive` реагує лише на зміну властивостей верхнього рівня.

```js
const deep = reactive({ o: { v: 1 } });
let deepRuns = 0;
effect(() => {
  deepRuns++;
  deep.o.v;
});
deep.o.v = 2;

const shallow = shallowReactive({ o: { v: 1 } });
let shallowRuns = 0;
effect(() => {
  shallowRuns++;
  shallow.o.v;
});
shallow.o.v = 2;

console.log("deep:", deepRuns, "shallow:", shallowRuns);
```

```text
deep: 2 shallow: 1
```

### 4.2. Додавання та видалення властивостей

У Vue 2 реактивність трималась на `Object.defineProperty`, тому нові властивості потрібно було додавати спеціальним методом `Vue.set`. `Proxy` перехоплює й додавання та видалення ключів, тож жодних винятків немає:

```js
const keyed = reactive({ x: 1 });
const keysSeen = [];
effect(() => {
  keysSeen.push(Object.keys(keyed).join(","));
});
keyed.y = 2; // додали ключ
delete keyed.x; // видалили ключ
console.log(keysSeen);
```

```text
[ 'x', 'x,y', 'y' ]
```

### 4.3. Масиви, `Map` та `Set`

Вони теж реактивні, з урахуванням особливостей їхніх методів:

```js
const reactiveMap = reactive(new Map());
let mapRuns = 0;
effect(() => {
  mapRuns++;
  reactiveMap.get("k");
});
reactiveMap.set("k", 1);

const reactiveArray = reactive([1, 2, 3]);
let arrayRuns = 0;
effect(() => {
  arrayRuns++;
  reactiveArray.length;
});
reactiveArray.push(4);

console.log("map:", mapRuns, "array:", arrayRuns);
```

```text
map: 2 array: 2
```

### 4.4. `shallowRef` і `triggerRef`

Для великих структур, де глибоке відстеження надто дороге, застосовують `shallowRef`: реактивною є лише заміна `.value`, а зміни всередині значення не відстежуються. Якщо змінити вміст усе-таки потрібно, оновлення запускають вручну через `triggerRef`:

```js
const big = shallowRef({ n: 1 });
let bigRuns = 0;
effect(() => {
  bigRuns++;
  big.value.n;
});

big.value.n = 2; // внутрішня зміна: ефект не запускається
console.log(bigRuns);
triggerRef(big); // ручний запуск
console.log(bigRuns);
```

```text
1
2
```

## 5. Пастки

### 5.1. Деструктуризація втрачає реактивність

Читання властивості в змінну **копіює значення**: змінна більше не пов'язана з проксі. Щоб зберегти зв'язок, використовують `toRefs`, який перетворює кожну властивість на `ref`:

```js
const person = reactive({ count: 0 });

let destructuredRuns = 0;
const { count } = person; // копія значення, зв'язок втрачено
effect(() => {
  destructuredRuns++;
  count;
});

let toRefsRuns = 0;
const { count: countRef } = toRefs(person); // зв'язок збережено
effect(() => {
  toRefsRuns++;
  countRef.value;
});

person.count++;
console.log(destructuredRuns, toRefsRuns);
```

```text
1 2
```

### 5.2. Ідентичність: проксі не дорівнює оригіналу

`reactive(obj)` повертає **новий об'єкт-обгортку**, а не сам `obj`. Порівняння за посиланням дає `false`. Оригінал повертає `toRaw`; повторний виклик `reactive` для того самого об'єкта дає той самий проксі:

```js
const raw = { z: 1 };
const proxy = reactive(raw);
console.log(proxy === raw, toRaw(proxy) === raw, reactive(raw) === proxy, reactive(proxy) === proxy);
```

```text
false true true true
```

Практичний наслідок: якщо оригінальний об'єкт мутувати напряму, у обхід проксі, реактивність про це не дізнається.

### 5.3. Заміна всього об'єкта

Реактивний об'єкт відстежується через посилання на проксі. Якщо змінну, що містить `reactive`-об'єкт, присвоїти новим значенням, старі підписники залишаться на старому проксі. Тому в компонентах для значень, які замінюють цілком, зручніше `ref` (заміна `.value` відстежується).

## 6. `watch`

`watch` — це інструмент для побічних ефектів у відповідь на зміну конкретного джерела. На відміну від `effect`, він дає **старе й нове значення** й запускається лише при зміні джерела.

```js
const watched = reactive({ q: 1 });
const watchLog = [];
const stopWatch = watch(
  () => watched.q,
  (newValue, oldValue) => watchLog.push(`${oldValue}->${newValue}`),
);

watched.q = 2;
console.log(watchLog);

stopWatch(); // припинити спостереження
watched.q = 3;
console.log(watchLog);
```

```text
[ '1->2' ]
[ '1->2' ]
```

Зауваження: у цьому «голому» пакеті колбек викликається синхронно. У застосунку Vue за замовчуванням оновлення групуються планувальником компонентів, тож колбек виконується перед наступним оновленням інтерфейсу.

## 7. Планувальник: групування оновлень

У розділі 2 було видно, що `effect` запускається після кожної зміни. Для інтерфейсу це розточительно: три зміни підряд мають призвести до **одного** оновлення. Vue вирішує це планувальником: ефект отримує опцію `scheduler`, яка замість негайного запуску ставить його в чергу й запускає **один раз** у мікрозавданні (після завершення синхронного коду). Саме так працює оновлення компонентів і функція `nextTick`.

```js
const batch = reactive({ n: 0 });
let batchRuns = 0;
let queued = false;

const runner = effect(
  () => {
    batchRuns++;
    batch.n;
  },
  {
    scheduler: () => {
      if (queued) return; // вже стоїть у черзі
      queued = true;
      queueMicrotask(() => {
        queued = false;
        runner();
      });
    },
  },
);

batch.n = 1;
batch.n = 2;
batch.n = 3;
console.log(batchRuns); // синхронно: ефект ще не запускався повторно

Promise.resolve().then(() => console.log(batchRuns)); // після мікрозавдання
```

```text
1
2
```

Три зміни привели до одного повторного запуску. Друге число з'являється після завершення синхронної частини скрипта. Наслідок для компонентів Vue: після зміни стану DOM оновлюється **не одразу**, а в наступному мікрозавданні; щоб прочитати оновлений DOM, використовують `await nextTick()`.

## Підсумок

- Реактивність у Vue 3 — це автоматичне відстеження залежностей через `Proxy`: `get` записує, хто прочитав властивість (`track`), `set` запускає тих, хто її читав (`trigger`).
- Залежності дрібнозернисті: ефект реагує лише на ті властивості, які він справді прочитав.
- `reactive` працює з об'єктами (глибоко, включно з масивами, `Map`, `Set`, додаванням і видаленням ключів); `ref` обгортає значення в `.value`, що дозволяє мати реактивні примітиви; `shallowReactive`/`shallowRef` вимикають глибину, `triggerRef` запускає оновлення вручну.
- Пастки: деструктуризація копіює значення й розриває зв'язок (рішення — `toRefs`); проксі не дорівнює оригіналу (`toRaw`); заміна цілого `reactive`-об'єкта не відстежується.
- «Голий» `effect` виконується синхронно після кожної зміни; у застосунку Vue оновлення групуються планувальником і виконуються в мікрозавданні (`nextTick`).
- `watch` — для побічних ефектів у відповідь на зміну конкретного джерела; він дає старе й нове значення.
- Порівняння цієї моделі з моделлю React, де стан незмінний, а компонент перерендерюється цілком, — у нотатці `programming/js/react-js/reactivity.md`.
