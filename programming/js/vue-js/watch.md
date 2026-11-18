# Vue 3: `watch`

Виміряно на Vue 3.5.44. Порівняння з `computed` і `watchEffect` — [computed.md](computed.md) §11 і [watchEffect.md](watchEffect.md).

## 1. Що це

`watch(source, callback, options?)` — **побічний ефект у відповідь на зміну конкретного джерела**. На відміну від `watchEffect`, ти **явно** вказуєш джерело і отримуєш **нове й старе** значення.

```js
watch(count, (newVal, oldVal, onCleanup) => { … });
```

Джерела: ref; reactive-об'єкт; **геттер** `() => state.x`; **масив** джерел `[a, b]`.

## 2. Як це виконується (виміряно)

1. `watch` **не запускає** callback одразу (лише зі `{ immediate: true }`) — запам'ятовує початкове значення.
2. Зміна джерела → callback **планується**, а не викликається синхронно: `n.value = 1; n.value = 2` → до `nextTick` callback ще **не викликався** (`before flush: (empty)`).
3. Після тіку callback викликається **один раз** з **останнім** значенням: `watch 0→2` (проміжне `1` пропущено — оновлення групуються).
4. Якщо значення змінилось і повернулось у тому ж тіку (`1` → `0`) — callback **не** викликається (`fires? false`).

## 3. Опції

| Опція | Дія | Виміряно |
|---|---|---|
| `immediate: true` | виклик одразу при створенні, `oldVal = undefined` | `imm undefined→2` |
| `deep: true` | глибоке відстеження вкладених змін | з `deep` масив-ref реагує на `push` |
| `flush: 'pre'` (за замовч.) | перед оновленням DOM | `pre watcher → beforeUpdate → render → post watcher` |
| `flush: 'post'` | **після** оновлення DOM (можна читати оновлений DOM) | — |
| `flush: 'sync'` | **синхронно** при зміні | `n.value = 5` → `sync 5` одразу |
| `once: true` (3.4+) | один раз, потім автозупинка | `once: 1` виклик на 2 зміни |

Порядок в одному оновленні (виміряно): `pre watcher (before render) → beforeUpdate → render → post watcher (after render)`.

## 4. Що можна спостерігати

```js
watch(count, cb)                      // ref
watch(() => state.n, cb)              // геттер (примітив або властивість)
watch([a, b], ([na, nb], [oa, ob]) => …)   // кілька джерел — один callback
watch(state, cb)                      // reactive-об'єкт — deep ЗА ЗАМОВЧУВАННЯМ
```
Виміряно:
- `watch(reactive)` глибокий за замовчуванням (`o.a.b = 2` → спрацювало); але `newVal === oldVal` (**той самий об'єкт**) — старе значення для об'єктів не зберігається;
- `watch(() => o.a, cb)` (геттер, що повертає об'єкт) на `o.a.b = 3` **не** спрацьовує; з `{ deep: true }` — спрацьовує;
- `watch(() => o.a.b, cb)` на примітив: `4→10`;
- `watch(() => o.list, cb)` на `o.list.push(2)` — **не** спрацьовує; `watch(() => [...o.list], cb)` — спрацьовує (новий масив щоразу);
- `watch(ref(obj))`: заміна `obj.value = {}` на новий об'єкт спрацьовує (`1`), мутація всередині — лише з `deep`.

## 5. Cleanup: `onCleanup`

Третій аргумент — реєстрація функції очищення, що викликається **перед наступним запуском** і при зупинці. Класична задача — скасувати застарілий запит:
```js
watch(id, async (newId, _, onCleanup) => {
  const ctrl = new AbortController();
  onCleanup(() => ctrl.abort());
  data.value = await (await fetch(url(newId), { signal: ctrl.signal })).json();
});
```
Виміряно: `start 1 | cleanup 1 | start 2`. У Vue 3.5 також є `onWatcherCleanup(fn)` — можна викликати де завгодно в синхронній частині callback.

## 6. Зупинка

`watch` повертає **функцію-зупинку**: `const stop = watch(…); stop();` — після неї callback не викликається (виміряно: `stopped: 0`). Watcher, створений **синхронно в `setup()`**, зупиняється автоматично при розмонтуванні. Створений **асинхронно** (після `await`/в `setTimeout`) — **не** прив'язаний до компонента, зупиняй вручну (витік).
Ще: `watch` повертає handle з `pause()`/`resume()` (3.5).

## 7. Пастки

1. `watch(state.n, …)` / `watch(count.value, …)` — не реактивне джерело (`Invalid watch source`).
2. Очікувати `oldVal` для об'єктів (reactive/мутація) — він дорівнює `newVal`.
3. Шукати зміни вкладених даних без `deep` / без геттера, що створює новий масив.
4. Асинхронне створення watcher'а → витік.
5. Читати DOM у `flush: 'pre'` → ще старий DOM (потрібен `post` або `nextTick`).
6. `deep: true` на великих структурах — дорого.
7. `flush: 'sync'` — для рідкісних випадків: може запускатись багато разів.
8. Мутувати джерело у callback → цикл.
9. Використовувати `watch` замість `computed` для похідних даних.

## 8. `watch` чи `computed` / `watchEffect`

- похідне значення → `computed`;
- побічний ефект при зміні **конкретного** джерела, потрібні `old/new` або контроль запуску → `watch`;
- побічний ефект, що має **автоматично** відстежити все, що читає → `watchEffect`.

## 9. Алгоритм

1. Потрібен **побічний ефект** (запит, запис, лог) на зміну даних.
2. Джерело: ref / геттер / масив — **не** значення.
3. `immediate`, якщо треба запустити зразу.
4. Об'єкт-джерело: `deep` або геттер, що повертає нову копію.
5. Асинхронність → `onCleanup`.
6. DOM після зміни → `flush: 'post'`.

## Задачі для закріплення

15 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Кожен фрагмент — тіло асинхронної функції, відповідь — значення, яке воно повертає. У прикладах `mount(Component)` монтує компонент у тестове дерево без DOM, `html(r)` серіалізує його, `click(node)` викликає `onClick`, `tick()` — це `nextTick`, `sleep(ms)` — пауза; API Vue (`ref`, `watch`, `h` та інші) імпортуються з `vue`.

### Рівень 1. Основи

**1.** Що отримує колбек `watch` (нове, старе)?

```js
const n = ref(1); const log = []; watch(n, (v, o) => log.push([v, o])); n.value = 2; n.value = 3; await tick(); return log;
```

**2.** `immediate: true`.

```js
const n = ref(1); const log = []; watch(n, (v, o) => log.push([v, o]), { immediate: true }); n.value = 2; await tick(); return log;
```

**3.** Спостереження за геттером.

```js
const s = reactive({ a: 1, b: 2 }); const log = []; watch(() => s.a + s.b, (v) => log.push(v)); s.a = 10; s.b = 20; await tick(); return log;
```

**4.** Глибоке спостереження `deep: true`.

```js
const s = reactive({ a: { b: 1 } }); let shallow = 0, deep = 0; watch(() => s.a, () => shallow++); watch(() => s.a, () => deep++, { deep: true }); s.a.b = 2; await tick(); return [shallow, deep];
```

### Рівень 2. Деталі й поведінка

**5.** Спостереження за `reactive` об'єктом напряму (deep за замовчуванням).

```js
const s = reactive({ a: { b: 1 } }); let runs = 0; watch(s, () => runs++); s.a.b = 2; await tick(); return runs;
```

**6.** Спостереження за кількома джерелами.

```js
const a = ref(1), b = ref(1); const log = []; watch([a, b], ([na, nb], [oa, ob]) => log.push([na, nb, oa, ob])); a.value = 2; await tick(); b.value = 3; await tick(); return log;
```

**7.** `once: true` (3.4+).

```js
const n = ref(0); let runs = 0; watch(n, () => runs++, { once: true }); n.value = 1; await tick(); n.value = 2; await tick(); return runs;
```

**8.** `flush: 'sync'` виконує колбек одразу.

```js
const n = ref(0); const log = []; watch(n, (v) => log.push(v), { flush: 'sync' }); n.value = 1; n.value = 2; return log;
```

### Рівень 3. Нюанси та пастки

**9.** За замовчуванням (`pre`) колбеки групуються.

```js
const n = ref(0); const log = []; watch(n, (v) => log.push(v)); n.value = 1; n.value = 2; n.value = 3; await tick(); return log;
```

**10.** `onCleanup`: очищення перед наступним запуском.

```js
const n = ref(0); const log = []; watch(n, (v, o, onCleanup) => { log.push('run ' + v); onCleanup(() => log.push('clean ' + v)); }); n.value = 1; await tick(); n.value = 2; await tick(); return log;
```

**11.** Зупинка `watch` через функцію, що повертається.

```js
const n = ref(0); let runs = 0; const stopFn = watch(n, () => runs++); n.value = 1; await tick(); stopFn(); n.value = 2; await tick(); return runs;
```

**12.** Мутація об'єкта без `deep` для `ref` не спрацьовує.

```js
const o = ref({ n: 1 }); let a = 0, b = 0; watch(o, () => a++); watch(o, () => b++, { deep: true }); o.value.n = 2; await tick(); return [a, b];
```

### Рівень 4. Практика

**13.** Пастка: спостереження за властивістю без геттера.

```js
const s = reactive({ n: 1 }); let runs = 0; try { watch(s.n, () => runs++); } catch (e) { return 'err'; } s.n = 2; await tick(); return runs;
```

**14.** Чим `watch` відрізняється від `watchEffect`?

**15.** Коли `watch` — не найкращий вибір?

### Відповіді

1. `[[3, 1]]`
2. `[[1, undefined], [2, 1]]`
3. `[30]`
4. `[0, 1]`
5. `1`
6. `[[2, 1, 1, 1], [2, 3, 2, 1]]`
7. `1`
8. `[1, 2]`
9. `[3]`
10. `['run 1', 'clean 1', 'run 2']`
11. `1`
12. `[0, 1]`
13. `0`
14. `watch` явно вказує джерело, ліниво (без `immediate`) і дає нове та старе значення; `watchEffect` одразу виконується й автоматично відстежує все прочитане
15. Якщо потрібно лише похідне значення — краще `computed`; для синхронізації стану з іншим станом уникайте каскадів `watch`
