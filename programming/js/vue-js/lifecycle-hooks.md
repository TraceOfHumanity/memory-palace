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
