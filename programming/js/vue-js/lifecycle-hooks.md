# Vue 3: хуки життєвого циклу

Виміряно на Vue 3.5.44 (`vue`, `jsdom`, `createApp().mount()`).

## 1. Етапи життя компонента

```
setup → beforeMount → (render) → mounted → [beforeUpdate → (render) → updated]* → beforeUnmount → unmounted
```
У Composition API хуки — функції `onXxx`, що **викликаються синхронно всередині `setup()`** (або `<script setup>`) і реєструють колбек.

| Composition API | Options API | Коли |
|---|---|---|
| (код у `setup`) | `beforeCreate`/`created` | створення реактивного стану; **один раз** |
| `onBeforeMount` | `beforeMount` | перед першим рендером до DOM |
| `onMounted` | `mounted` | після першого рендеру; DOM доступний |
| `onBeforeUpdate` | `beforeUpdate` | після зміни стану, **перед** оновленням DOM |
| `onUpdated` | `updated` | **після** оновлення DOM |
| `onBeforeUnmount` | `beforeUnmount` | перед розмонтуванням (все ще працює) |
| `onUnmounted` | `unmounted` | після розмонтування |
| `onActivated`/`onDeactivated` | те саме | `<KeepAlive>` ([lifecycle-extra.md](lifecycle-extra.md)) |
| `onErrorCaptured` | `errorCaptured` | помилка нащадка |
| `onRenderTracked`/`onRenderTriggered` | те саме | лише dev, налагодження |
| `onServerPrefetch` | `serverPrefetch` | SSR |

## 2. Порядок (реальний вивід)

`Parent` з однією `Child`, у кожного всі хуки.

**Mount:**
```
parent setup | parent beforeMount | parent render
child setup  | child beforeMount  | child render | child mounted
parent mounted
```
**Update (змінилась пропса дитини):**
```
parent beforeUpdate | parent render
child beforeUpdate  | child render | child updated
parent updated
```
**Unmount:**
```
parent beforeUnmount | child beforeUnmount | child unmounted | parent unmounted
```
Запам'ятай: **`mounted` дитини — до `mounted` батька** (діти змонтовані, коли батько вважає себе змонтованим); `beforeUnmount` — згори вниз, `unmounted` — знизу вгору.

## 3. `setup()` виконується ОДИН раз

Не при кожному оновленні (як тіло функції в React), а лише при створенні. Реактивність сама перерахує те, що потрібно. Саме тому `onMounted` викликається один раз.

## 4. `onMounted`

DOM вже існує, ref прикріплені: `el.value.tagName` → `INPUT`. Тут: прочитати розміри, ініціалізувати сторонню бібліотеку, запит даних, підписки на `window`.
**Не гарантує**, що **дочірні асинхронні** компоненти змонтовані (`Suspense`).

## 5. `onBeforeUpdate` / `onUpdated`

Спрацьовують на **кожну зміну** стану, що впливає на рендер компонента. Усередині `onUpdated` DOM уже новий. **Не змінюй стан у `onUpdated`** — нескінченний цикл. Для читання оновленого DOM після конкретної зміни зручніше `await nextTick()` або `watch(…, { flush: 'post' })`.

## 6. `onBeforeUnmount` / `onUnmounted` — прибирання

Тут чистимо **усе, що створили вручну**: `removeEventListener`, `clearInterval`, `socket.close()`, `observer.disconnect()`.
Виміряно: `setInterval` у `setup`, `clearInterval` в `onBeforeUnmount` → `interval cleared`.
**Автоматично** зупиняються watcher'и/computed, створені синхронно в `setup` (виміряно: після `unmount` `watchEffect` не запускається, спрацьовує `onScopeDispose`).

## 7. Кілька хуків одного типу

Можна реєструвати скільки завгодно (і в композаблах): `two onMounted … → mounted #1, mounted #2`. Це дозволяє композаблам мати власний життєвий цикл.

## 8. Хуки поза `setup`

`onMounted()` поза активним компонентом → `[Vue warn]: onMounted is called when there is no active component instance… Lifecycle injection APIs can only be used during execution of setup().` Так само після `await` в **async `setup()`** (без `<script setup>`-компілятора): реєструй хуки **до першого `await`**.

## 9. Options API разом із `setup`

Обидва стилі можуть співіснувати; виміряно: `setup` повертає `{ x: 1 }`, `data()` — `{ y: 2 }`, а в `mounted()` `this.x` = `1`, `this.y` = `2`.

## 10. Асинхронність у хуках

`onMounted(async () => { … await nextTick(); … })` працює: `mounted → after nextTick in mounted`.

## 11. Типові помилки

1. Не прибрати слухачі/таймери в `onBeforeUnmount`.
2. Змінювати стан в `onUpdated` → цикл.
3. Викликати `onMounted` після `await` у `setup` або поза `setup`.
4. Читати DOM у `setup` (його ще немає) — використовуй `onMounted`.
5. Покладатись, що `mounted` батька раніше за дитину — навпаки.
6. Чекати, що `setup` виконується при кожному оновленні.
7. Робити запит у `onUpdated` (повторюється при кожній зміні).
8. Створювати `watch` асинхронно (поза `setup`) без зупинки.

## 12. Алгоритм

1. Логіка стану — у `setup`.
2. Потрібен DOM → `onMounted`.
3. Створив таймер/підписку → `onBeforeUnmount`/`onUnmounted` прибирає.
4. Після зміни дочекатись DOM → `await nextTick()`.
5. Повторювана логіка життєвого циклу → композабл із власними `onMounted`/`onUnmounted`.

## Задачі для закріплення

14 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Кожен фрагмент — тіло асинхронної функції, відповідь — значення, яке воно повертає. У прикладах `mount(Component)` монтує компонент у тестове дерево без DOM, `html(r)` серіалізує його, `click(node)` викликає `onClick`, `tick()` — це `nextTick`, `sleep(ms)` — пауза; API Vue (`ref`, `watch`, `h` та інші) імпортуються з `vue`.

### Рівень 1. Основи

**1.** Порядок хуків при монтуванні та розмонтуванні.

```js
const log = []; const C = defineComponent({ setup() { log.push('setup'); onBeforeMount(() => log.push('beforeMount')); onMounted(() => log.push('mounted')); onBeforeUnmount(() => log.push('beforeUnmount')); onUnmounted(() => log.push('unmounted')); return () => { log.push('render'); return h('p', 'x'); }; } }); const r = mount(C); await tick(); unmount(r); return log;
```

**2.** Порядок при оновленні.

```js
const log = []; const n = ref(0); const C = defineComponent({ setup() { onBeforeUpdate(() => log.push('beforeUpdate')); onUpdated(() => log.push('updated')); return () => { log.push('render'); return h('p', n.value); }; } }); mount(C); log.length = 0; n.value = 1; await tick(); return log;
```

**3.** Скільки разів виконується `setup` при кількох оновленнях?

```js
let setups = 0; const n = ref(0); const C = defineComponent({ setup() { setups++; return () => h('p', n.value); } }); mount(C); n.value = 1; await tick(); n.value = 2; await tick(); return setups;
```

**4.** Порядок батько/дитина при монтуванні.

```js
const log = []; const Kid = defineComponent({ setup() { onBeforeMount(() => log.push('kid beforeMount')); onMounted(() => log.push('kid mounted')); return () => h('i'); } }); const P = defineComponent({ setup() { onBeforeMount(() => log.push('parent beforeMount')); onMounted(() => log.push('parent mounted')); return () => h('div', [h(Kid)]); } }); mount(P); return log;
```

### Рівень 2. Деталі й поведінка

**5.** Порядок батько/дитина при розмонтуванні.

```js
const log = []; const Kid = defineComponent({ setup() { onBeforeUnmount(() => log.push('kid beforeUnmount')); onUnmounted(() => log.push('kid unmounted')); return () => h('i'); } }); const P = defineComponent({ setup() { onBeforeUnmount(() => log.push('parent beforeUnmount')); onUnmounted(() => log.push('parent unmounted')); return () => h('div', [h(Kid)]); } }); const r = mount(P); unmount(r); return log;
```

**6.** Чи доступний DOM-елемент у `onMounted` (через ref)?

```js
const el = ref(null); let seen; const C = defineComponent({ setup() { onMounted(() => { seen = el.value && el.value.tag; }); return () => h('p', { ref: el }, 'x'); } }); mount(C); return seen;
```

**7.** А в `onBeforeMount`?

```js
const el = ref(null); let seen = 'unset'; const C = defineComponent({ setup() { onBeforeMount(() => { seen = el.value; }); return () => h('p', { ref: el }, 'x'); } }); mount(C); return seen;
```

**8.** `onBeforeUpdate` бачить старий DOM, `onUpdated` — новий.

```js
const n = ref('a'); let r; const seen = []; const C = defineComponent({ setup() { onBeforeUpdate(() => seen.push(html(r))); onUpdated(() => seen.push(html(r))); return () => h('p', n.value); } }); r = mount(C); n.value = 'b'; await tick(); return seen;
```

### Рівень 3. Нюанси та пастки

**9.** Очищення в `onUnmounted`: таймер зупиняється.

```js
let ticks = 0; const C = defineComponent({ setup() { const id = setInterval(() => ticks++, 5); onUnmounted(() => clearInterval(id)); return () => h('p'); } }); const r = mount(C); await sleep(18); unmount(r); const t = ticks; await sleep(20); return [t > 0, ticks === t];
```

**10.** Хук, викликаний поза `setup`: чи спрацює?

```js
let ran = false; onMounted(() => { ran = true; }); await tick(); return ran;
```

**11.** Множинні реєстрації одного хука.

```js
const log = []; const C = defineComponent({ setup() { onMounted(() => log.push(1)); onMounted(() => log.push(2)); return () => h('p'); } }); mount(C); return log;
```

**12.** Умовне розмонтування й повторне монтування дитини.

```js
const show = ref(true); const log = []; const Kid = defineComponent({ setup() { onMounted(() => log.push('mounted')); onUnmounted(() => log.push('unmounted')); return () => h('i'); } }); mount(defineComponent({ setup() { return () => h('div', show.value ? [h(Kid)] : []); } })); show.value = false; await tick(); show.value = true; await tick(); return log;
```

### Рівень 4. Практика

**13.** Які основні етапи життя компонента?

**14.** Де виконується `setup()` і скільки разів?

### Відповіді

1. `['setup', 'beforeMount', 'render', 'mounted', 'beforeUnmount', 'unmounted']`
2. `['beforeUpdate', 'render', 'updated']`
3. `1`
4. `['parent beforeMount', 'kid beforeMount', 'kid mounted', 'parent mounted']`
5. `['parent beforeUnmount', 'kid beforeUnmount', 'kid unmounted', 'parent unmounted']`
6. `'p'`
7. `null`
8. `['<p>a</p>', '<p>b</p>']`
9. `[true, true]`
10. `false`
11. `[1, 2]`
12. `['mounted', 'unmounted', 'mounted']`
13. Створення (`setup`), монтування (`onBeforeMount` → рендер → `onMounted`), оновлення (`onBeforeUpdate` → `onUpdated`), розмонтування (`onBeforeUnmount` → `onUnmounted`)
14. Один раз при створенні екземпляра компонента; повторні рендери викликають лише render-функцію/шаблон
