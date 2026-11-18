# Vue 3: `setup`, `<script setup>`, async setup і `<Suspense>`

Виміряно на Vue 3.5.44 (`vue`, `jsdom`). `<Suspense>` у Vue 3 — **експериментальна** функція (у консолі: `<Suspense> is an experimental feature and its API will likely change.`).

## 1. `setup()`

Точка входу Composition API: виконується **один раз** при створенні екземпляра (після ініціалізації props, перед `beforeMount`). Повертає або **об'єкт** (стан для шаблону), або **render-функцію**.
```js
setup(props, { emit, expose, attrs, slots }) {
  const n = ref(0);
  return { n };                 // у шаблоні доступний як {{ n }}
}
```
Виміряно: `setup` повернув `{ x: 1 }`, а Options-API-метод `mounted()` бачить `this.x` (= `1`) і `this.y` з `data()`.
- `this` усередині `setup` **недоступний**.
- Ref верхнього рівня з об'єкта розгортаються в шаблоні автоматично.

## 2. `<script setup>`

Синтаксичний цукор (компілюється у `setup`): усе, оголошене на верхньому рівні, **автоматично доступне в шаблоні**, імпортовані компоненти використовуються без реєстрації. Макроси: `defineProps`, `defineEmits`, `defineExpose`, `defineModel`, `defineOptions`, `defineSlots`. Компонент за замовчуванням «закритий» (ref на нього бачить лише `defineExpose`).

## 3. async `setup` і `await`

`setup` може бути `async` — тоді компонент потребує `<Suspense>` вище:
```js
const AsyncChild = defineComponent({
  async setup() {
    const data = await fetchData();      // компонент «призупинено»
    return () => h("p", data);
  },
});
```
У `<script setup>` достатньо **top-level `await`** — Vue автоматично зробить `setup` async і підніме контекст.

## 4. `<Suspense>`: слоти `default` і `fallback`

```vue
<Suspense>
  <AsyncChild />
  <template #fallback><Spinner /></template>
</Suspense>
```
Виміряно: спершу `<i>loading</i>`, через 30 мс `<p>async</p>`. `Suspense` чекає **усі** асинхронні залежності в піддереві; події `@pending`, `@resolve`, `@fallback`.
Після першого розв'язання повторне оновлення не показує fallback (лише `timeout`-логіка/нове `Suspense`).

## 5. Пастка: хуки життєвого циклу після `await`

У **звичайному** async `setup()` активний екземпляр компонента втрачається після першого `await`. Виміряно: `onMounted` після `await` → `[Vue warn]: onMounted is called when there is no active component instance… If you are using async setup(), make sure to register lifecycle hooks before the first await statement.`
Правила:
- реєструй `onMounted`/`watch`/`provide`/`inject` **до першого `await`**;
- у `<script setup>` компілятор автоматично відновлює контекст після `await` (тому там це працює).

## 6. Обробка помилок у Suspense

Reject у async `setup` → помилка піде в `onErrorCaptured` батька (див. [lifecycle-extra.md](lifecycle-extra.md)). Обгортай `Suspense` у компонент-межу помилок, що показує запасний вигляд.

## 7. Альтернативи async setup

- Запит у `onMounted` + локальний стан `loading`/`error` (компонент рендериться одразу, дані — пізніше);
- `watchEffect`/композабл `useFetch` — без `Suspense`;
- Nuxt `useAsyncData`/`useFetch` — серверний рендер із даними.

## 8. Типові помилки

1. async `setup` без `<Suspense>` — компонент не відрендериться.
2. Хуки/`provide` після `await` (поза `<script setup>`).
3. Не передбачити fallback/помилку.
4. Покладатись на стабільність API `Suspense` у продакшені без тестів.
5. Очікувати, що `setup` виконується при кожному оновленні.
6. Робити тяжкий синхронний код у `setup` (блокує створення).
7. Забути `defineExpose` у `<script setup>`, коли батько користується ref.

## 9. Алгоритм

1. Стан і логіка — у `<script setup>`.
2. Асинхронна ініціалізація: top-level `await` + `<Suspense>` із `#fallback`.
3. У класичному async `setup` — хуки до першого `await`.
4. Помилки → `onErrorCaptured`.
5. Альтернатива без Suspense — `onMounted` + `loading`/`error`.

## Задачі для закріплення

10 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Кожен фрагмент — тіло асинхронної функції, відповідь — значення, яке воно повертає. У прикладах `mount(Component)` монтує компонент у тестове дерево без DOM, `html(r)` серіалізує його, `click(node)` викликає `onClick`, `tick()` — це `nextTick`, `sleep(ms)` — пауза; API Vue (`ref`, `watch`, `h` та інші) імпортуються з `vue`.

### Рівень 1. Основи

**1.** Що показує `Suspense`, поки async `setup` не завершився?

```js
const Kid = defineComponent({ async setup() { await sleep(10); return () => h('p', 'ready'); } }); const r = mount(defineComponent({ setup() { return () => h(Suspense, null, { default: () => h(Kid), fallback: () => h('i', 'loading') }); } })); const a = html(r); await sleep(40); return [a, html(r)];
```

**2.** `defineAsyncComponent` у `Suspense`.

```js
const A = defineAsyncComponent(() => sleep(5).then(() => defineComponent({ render: () => h('b', 'loaded') }))); const r = mount(defineComponent({ setup() { return () => h(Suspense, null, { default: () => h(A), fallback: () => h('i', 'wait') }); } })); const a = html(r); await sleep(30); return [a, html(r)];
```

**3.** Помилка в async `setup` та `onErrorCaptured`.

```js
const Bad = defineComponent({ async setup() { await sleep(2); throw new Error('fail'); } }); const log = []; const r = mount(defineComponent({ setup() { onErrorCaptured((e) => { log.push(e.message); return false; }); return () => h(Suspense, null, { default: () => h(Bad), fallback: () => h('i', 'w') }); } })); await sleep(20); return log;
```

### Рівень 2. Деталі й поведінка

**4.** Хуки життєвого циклу до та після `await` у `setup`.

```js
const log = []; const C = defineComponent({ async setup() { onMounted(() => log.push('before-await')); await sleep(2); onMounted(() => log.push('after-await')); return () => h('p'); } }); mount(defineComponent({ setup() { return () => h(Suspense, null, { default: () => h(C), fallback: () => h('i') }); } })); await sleep(30); return log;
```

**5.** Події `Suspense`: pending / fallback / resolve.

```js
const log = []; const Kid = defineComponent({ async setup() { await sleep(5); return () => h('p', 'k'); } }); mount(defineComponent({ setup() { return () => h(Suspense, { onPending: () => log.push('pending'), onResolve: () => log.push('resolve'), onFallback: () => log.push('fallback') }, { default: () => h(Kid), fallback: () => h('i') }); } })); await sleep(30); return log;
```

**6.** Кілька async-дітей: чи чекає `Suspense` на всіх?

```js
const mkKid = (ms, t) => defineComponent({ async setup() { await sleep(ms); return () => h('p', t); } }); const r = mount(defineComponent({ setup() { return () => h(Suspense, null, { default: () => h('div', [h(mkKid(5, 'a')), h(mkKid(25, 'b'))]), fallback: () => h('i', 'w') }); } })); await sleep(12); const mid = html(r); await sleep(40); return [mid, html(r)];
```

### Рівень 3. Нюанси та пастки

**7.** Чи виконується `setup` повторно при оновленні батька?

```js
let setups = 0; const n = ref(0); const Kid = defineComponent({ async setup() { setups++; await sleep(2); return () => h('p', 'k'); } }); mount(defineComponent({ setup() { return () => h('div', [h('span', n.value), h(Suspense, null, { default: () => h(Kid), fallback: () => h('i') })]); } })); await sleep(15); n.value = 1; await tick(); await sleep(10); return setups;
```

**8.** Стан, отриманий через `await` у `setup`.

```js
const Kid = defineComponent({ async setup() { const data = await Promise.resolve([1, 2, 3]); const total = computed(() => data.reduce((a, b) => a + b, 0)); return () => h('p', total.value); } }); const r = mount(defineComponent({ setup() { return () => h(Suspense, null, { default: () => h(Kid), fallback: () => h('i', 'w') }); } })); await sleep(20); return html(r);
```

**9.** Що таке `<Suspense>`?

### Рівень 4. Практика

**10.** Чому після `await` у `setup` не можна реєструвати хуки?

### Відповіді

1. `['<i>loading</i>', '<p>ready</p>']`
2. `['<i>wait</i>', '<b>loaded</b>']`
3. `['fail']`
4. `['before-await']`
5. `['pending', 'fallback', 'resolve']`
6. `['<i>w</i>', '<div><p>a</p><p>b</p></div>']`
7. `1`
8. `'<p>6</p>'`
9. Компонент, що координує очікування асинхронних залежностей (async `setup`, async-компоненти) та показує `fallback` до їх завершення
10. Після `await` Vue втрачає поточний активний екземпляр компонента; у `<script setup>` компілятор зберігає контекст, а в звичайному `setup` хуки потрібно викликати до першого `await`
