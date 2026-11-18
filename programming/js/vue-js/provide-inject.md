# Vue 3: `provide` / `inject`

Виміряно на Vue 3.5.44.

## 1. Що це

Спосіб передати дані **глибоко вниз по дереву** без prop drilling. Предок **надає** значення (`provide`), будь-який нащадок на будь-якій глибині **вводить** його (`inject`). Аналог `Context` у React.

```js
// предок
provide("theme", ref("dark"));
// нащадок
const theme = inject("theme");           // ref → реактивно
```

## 2. API

| | |
|---|---|
| `provide(key, value)` | лише в `setup()`; ключ — рядок або `Symbol` |
| `inject(key)` | повертає значення найближчого предка; немає → `undefined` + попередження |
| `inject(key, default)` | значення за замовчуванням |
| `inject(key, () => value, true)` | **фабрика** за замовчуванням (третій аргумент `true`) — для дорогих/об'єктів |
| `app.provide(key, value)` | на рівні **застосунку** (для всіх компонентів) |
| `hasInjectionContext()` | чи можна викликати `inject` зараз |

Виміряно:
- без провайдера: `<i>["DEFAULT", "factory-default"]</i>` (значення за замовчуванням і фабрика);
- `provide(key, 5)` — працює із примітивом;
- `app.provide(key, ref("app-level"))` — доступне всім.

## 3. Реактивність

Передавай **ref/reactive/computed** — реактивність збережеться: `provide(key, count)`; зміна `count.value = 2` оновила нащадка (`[2, …]`). Якщо передати **число**, нащадок отримає знімок без реактивності.

## 4. Патерн: «значення + дії», захист від зміни

```js
// предок
const count = ref(0);
provide(key, { count: readonly(count), inc: () => count.value++ });
// нащадок
const { count, inc } = inject(key);
```
Виміряно: кнопка нащадка викликає `inc`, і `count` показує `1`. `readonly` не дозволяє нащадку записувати напряму — зміни йдуть через методи предка (один напрямок потоку даних).

## 5. `Symbol` як ключ + `InjectionKey`

Щоб уникнути збігів рядкових ключів, використовуй `Symbol` (у TypeScript — `InjectionKey<T>` для типізації):
```ts
export const themeKey = Symbol() as InjectionKey<Ref<string>>;
```

## 6. Області видимості

`inject` бачить **найближчого** предка з таким ключем (вкладений `provide` перекриває вищий). Нащадок **не може** надати значення вгору. `provide` у компоненті доступне його нащадкам, але не сусідам.

## 7. Коли використовувати / ні

- ✔ тема, мова, конфіг, сервіси, дані «складного» компонента (форма + поля, таблиця + колонки).
- ✗ дані, що йдуть лише на один рівень (пропси), глобальний стан застосунку (Pinia), часті зміни з великою кількістю споживачів (джерело стає неочевидним).
- Недолік: **неявна залежність** (важко відстежити, звідки значення) — документуй ключі й давай `readonly`.

## 8. Типові помилки

1. `inject` поза `setup` → `undefined` / попередження.
2. Передати **розгорнуте значення** (`count.value`) замість ref → без реактивності.
3. Дозволити нащадкам напряму змінювати `provide`-стан (розтікання логіки).
4. Рядкові ключі, що збігаються.
5. Забути значення за замовчуванням / перевірку на `undefined`.
6. `inject` об'єкта за замовчуванням без фабрики — спільний мутабельний об'єкт для всіх (треба `() => ({})`, `true`).
7. Використовувати для глобального стану замість стору.

## 9. Алгоритм

1. Ключ: `Symbol` (`InjectionKey`).
2. `provide(key, { реактивне значення (readonly), методи змін })`.
3. Нащадок: `inject(key, default)`.
4. Глобально для всього застосунку → `app.provide`.
5. Дуже динамічний глобальний стан → Pinia.

## Задачі для закріплення

13 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Кожен фрагмент — тіло асинхронної функції, відповідь — значення, яке воно повертає. У прикладах `mount(Component)` монтує компонент у тестове дерево без DOM, `html(r)` серіалізує його, `click(node)` викликає `onClick`, `tick()` — це `nextTick`, `sleep(ms)` — пауза; API Vue (`ref`, `watch`, `h` та інші) імпортуються з `vue`.

### Рівень 1. Основи

**1.** Базовий `provide` / `inject`.

```js
const Kid = defineComponent({ setup() { const v = inject('k'); return () => h('i', v); } }); const P = defineComponent({ setup() { provide('k', 'from-parent'); return () => h(Kid); } }); return html(mount(P));
```

**2.** Значення за замовчуванням, якщо провайдера немає.

```js
const Kid = defineComponent({ setup() { const v = inject('missing', 'fallback'); return () => h('i', v); } }); return html(mount(Kid));
```

**3.** Реактивність: передача `ref`.

```js
const n = ref(1); const Kid = defineComponent({ setup() { const v = inject('n'); return () => h('i', v.value); } }); const P = defineComponent({ setup() { provide('n', n); return () => h(Kid); } }); const r = mount(P); n.value = 5; await tick(); return html(r);
```

**4.** Передача примітиву (не реактивно).

```js
const n = ref(1); const Kid = defineComponent({ setup() { const v = inject('n'); return () => h('i', v); } }); const P = defineComponent({ setup() { provide('n', n.value); return () => h(Kid); } }); const r = mount(P); n.value = 5; await tick(); return html(r);
```

### Рівень 2. Деталі й поведінка

**5.** Найближчий провайдер перемагає.

```js
const Kid = defineComponent({ setup() { const v = inject('k'); return () => h('i', v); } }); const Mid = defineComponent({ setup() { provide('k', 'mid'); return () => h(Kid); } }); const Top = defineComponent({ setup() { provide('k', 'top'); return () => h('div', [h(Kid), h(Mid)]); } }); return html(mount(Top));
```

**6.** Символ як ключ.

```js
const K = Symbol('k'); const Kid = defineComponent({ setup() { const v = inject(K); return () => h('i', v); } }); const P = defineComponent({ setup() { provide(K, 'sym'); return () => h(Kid); } }); return html(mount(P));
```

**7.** Патерн «значення + дія».

```js
const Kid = defineComponent({ setup() { const { count, inc } = inject('store'); return () => h('button', { onClick: inc }, count.value); } }); const P = defineComponent({ setup() { const count = ref(0); provide('store', { count, inc: () => count.value++ }); return () => h(Kid); } }); const r = mount(P); click(find(r, 'button')); await tick(); return html(r);
```

**8.** Фабрика за замовчуванням (`inject(key, () => value, true)`).

```js
let created = 0; const Kid = defineComponent({ setup() { const v = inject('m', () => { created++; return 'made'; }, true); return () => h('i', v); } }); return [html(mount(Kid)), created];
```

### Рівень 3. Нюанси та пастки

**9.** `inject` без провайдера й без значення за замовчуванням.

```js
const Kid = defineComponent({ setup() { const v = inject('nothing'); return () => h('i', String(v)); } }); return html(mount(Kid));
```

**10.** Провайдер читає власне надане значення?

```js
const P = defineComponent({ setup() { provide('self', 1); const v = inject('self', 'no'); return () => h('i', v); } }); return html(mount(P));
```

**11.** `readonly` для захисту наданого стану.

```js
const state = reactive({ n: 1 }); const Kid = defineComponent({ setup() { const s = inject('s'); s.n = 99; return () => h('i', s.n); } }); const P = defineComponent({ setup() { provide('s', readonly(state)); return () => h(Kid); } }); return [html(mount(P)), state.n];
```

**12.** Яку проблему вирішує `provide/inject`?

### Рівень 4. Практика

**13.** Коли краще не використовувати `provide/inject`?

### Відповіді

1. `'<i>from-parent</i>'`
2. `'<i>fallback</i>'`
3. `'<i>5</i>'`
4. `'<i>1</i>'`
5. `'<div><i>top</i><i>mid</i></div>'`
6. `'<i>sym</i>'`
7. `'<button>1</button>'`
8. `['<i>made</i>', 1]`
9. `'<i>undefined</i>'`
10. `'<i>no</i>'`
11. `['<i>1</i>', 1]`
12. Передає дані вглиб дерева без prop drilling через проміжні компоненти
13. Для простих зв'язків «батько—дитина» (props/emit) і глобального стану, який зручніше тримати в окремому сторі
