# Vue 3: `onActivated`, `onDeactivated`, `onErrorCaptured`, `onRenderTracked/Triggered`, `onServerPrefetch`

Виміряно на Vue 3.5.44 (`vue`, `jsdom`). Основні хуки: [lifecycle-hooks.md](lifecycle-hooks.md).

## 1. `<KeepAlive>`: `onActivated` / `onDeactivated`

`<KeepAlive>` **кешує** екземпляри компонентів при перемиканні замість знищення. Тому `onMounted`/`onUnmounted` спрацьовують лише раз, а «показано/сховано» ловлять інші хуки.

```js
onActivated(() => { /* компонент знову показано (і при першому показі) */ });
onDeactivated(() => { /* сховано, але стан збережено */ });
```
Виміряно (A → B → A): `A mounted | A activated | A deactivated | A activated` — `mounted` один раз, `activated` двічі, `unmounted` не викликався (компонент у кеші).
Застосування: оновити дані при поверненні на вкладку, призупинити таймер/відео при `deactivated`.

Пропси `<KeepAlive>`: `include`, `exclude`, `max` (LRU-кеш).
Увага: у компонента, що перемикається, **стан зберігається** (форми не скидаються).

## 2. `onErrorCaptured`

Ловить помилки **нащадків** (render, хуки, watcher'и, обробники подій):
```js
onErrorCaptured((err, instance, info) => {
  log(err, info);
  return false;        // false — зупинити подальше «спливання» помилки
});
```
Виміряно: помилка, кинута в `onMounted` дитини → `captured "boom" info=mounted hook`. `info` описує, де сталось (`mounted hook`, `render function`, `watcher callback` …). Без `return false` помилка піде в батьківський `onErrorCaptured`, потім у `app.config.errorHandler`.
Це **не** try/catch для власного коду компонента — лише для нащадків; для UI-помилки використовують стан `error` і показують запасний вигляд.

## 3. `onRenderTracked` / `onRenderTriggered` (лише dev)

Налагодження **чому компонент рендериться**:
```js
onRenderTracked((e) => console.log("tracked", e));     // яку залежність рендер прочитав
onRenderTriggered((e) => console.log("triggered", e)); // яка зміна запустила перерендер
```
Виміряно (шаблон `{{ a }} {{ b }}`): `onRenderTracked → get:value, get:value`. Подія містить `target`, `key`, `type` (`get`/`set`/`add`/`delete`). У production не працюють.

## 4. `onServerPrefetch`

Лише SSR: **асинхронна** підготовка даних **перед серверним рендером** компонента (сервер дочекається проміса). На клієнті не викликається.

## 5. `onBeforeMount` у SSR

На сервері викликаються лише `setup` (і `onServerPrefetch`); `onMounted`, `onUpdated`, `onUnmounted` — **тільки на клієнті**. Тому DOM/`window`-код — в `onMounted`.

## 6. Інші корисні API життєвого циклу

- `onScopeDispose(fn)` — виклик при знищенні поточного effect scope (в компоненті — при розмонтуванні; виміряно: `scope disposed`). Дозволяє композаблу прибирати за собою без прив'язки до компонентних хуків.
- `getCurrentInstance()` — поточний екземпляр (для бібліотек; уникай у прикладному коді).
- `app.config.errorHandler`, `app.config.warnHandler` — глобальні обробники.

## 7. Типові помилки

1. Чекати `onMounted` при кожному показі в `<KeepAlive>` (він один раз) — використай `onActivated`.
2. Не призупинити таймер у `onDeactivated` (працює в фоні).
3. Не повернути `false` в `onErrorCaptured` і дивуватись дублям у логах.
4. Думати, що `onErrorCaptured` ловить помилки того ж компонента.
5. Лишити `onRenderTriggered` у production-коді.
6. DOM/`window` в `setup` на SSR.
7. Забути, що `include`/`exclude` працюють за **назвою** компонента.

## 8. Алгоритм

1. Кешуєш компоненти → `<KeepAlive>` + `onActivated`/`onDeactivated`.
2. Резервна обробка помилок нащадків → `onErrorCaptured` (+ глобальний `errorHandler`).
3. Надмірні перерендери → `onRenderTracked`/`onRenderTriggered` у dev.
4. SSR із даними → `onServerPrefetch`.
5. Прибирання в композаблі → `onScopeDispose`.

## Задачі для закріплення

11 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Кожен фрагмент — тіло асинхронної функції, відповідь — значення, яке воно повертає. У прикладах `mount(Component)` монтує компонент у тестове дерево без DOM, `html(r)` серіалізує його, `click(node)` викликає `onClick`, `tick()` — це `nextTick`, `sleep(ms)` — пауза; API Vue (`ref`, `watch`, `h` та інші) імпортуються з `vue`.

### Рівень 1. Основи

**1.** `KeepAlive`: `onActivated` / `onDeactivated`.

```js
const log = []; const A = defineComponent({ setup() { onMounted(() => log.push('A mounted')); onActivated(() => log.push('A activated')); onDeactivated(() => log.push('A deactivated')); onUnmounted(() => log.push('A unmounted')); return () => h('i', 'A'); } }); const B = defineComponent({ setup() { return () => h('b', 'B'); } }); const cur = shallowRef(A); mount(defineComponent({ setup() { return () => h(KeepAlive, null, { default: () => h(cur.value) }); } })); await tick(); cur.value = B; await tick(); cur.value = A; await tick(); return log;
```

**2.** Без `KeepAlive` компонент розмонтовується.

```js
const log = []; const A = defineComponent({ setup() { onMounted(() => log.push('A mounted')); onUnmounted(() => log.push('A unmounted')); return () => h('i', 'A'); } }); const B = defineComponent({ setup() { return () => h('b'); } }); const cur = shallowRef(A); mount(defineComponent({ setup() { return () => h(cur.value); } })); await tick(); cur.value = B; await tick(); cur.value = A; await tick(); return log;
```

**3.** Стан зберігається в `KeepAlive`.

```js
const A = defineComponent({ setup() { const n = ref(0); return () => h('button', { onClick: () => n.value++ }, n.value); } }); const B = defineComponent({ setup() { return () => h('b'); } }); const cur = shallowRef(A); const r = mount(defineComponent({ setup() { return () => h(KeepAlive, null, { default: () => h(cur.value) }); } })); await tick(); click(find(r, 'button')); await tick(); cur.value = B; await tick(); cur.value = A; await tick(); return html(r);
```

### Рівень 2. Деталі й поведінка

**4.** `onErrorCaptured` перехоплює помилку дочірнього компонента.

```js
const log = []; const Bad = defineComponent({ setup() { return () => { throw new Error('boom'); }; } }); const P = defineComponent({ setup() { onErrorCaptured((e) => { log.push(e.message); return false; }); return () => h('div', [h(Bad)]); } }); mount(P); return log;
```

**5.** `onErrorCaptured` повертає `false` — помилка не йде вгору.

```js
const log = []; const Bad = defineComponent({ setup() { return () => { throw new Error('x'); }; } }); const Mid = defineComponent({ setup() { onErrorCaptured(() => { log.push('mid'); return false; }); return () => h(Bad); } }); const Top = defineComponent({ setup() { onErrorCaptured(() => { log.push('top'); }); return () => h(Mid); } }); mount(Top); return log;
```

**6.** Без `return false` помилка піднімається до батьків.

```js
const log = []; const Bad = defineComponent({ setup() { return () => { throw new Error('x'); }; } }); const Mid = defineComponent({ setup() { onErrorCaptured(() => { log.push('mid'); }); return () => h(Bad); } }); const Top = defineComponent({ setup() { onErrorCaptured(() => { log.push('top'); return false; }); return () => h(Mid); } }); mount(Top); return log;
```

### Рівень 3. Нюанси та пастки

**7.** `onServerPrefetch` у клієнтському монтуванні.

```js
const log = []; const C = defineComponent({ setup() { onServerPrefetch(() => { log.push('prefetch'); }); onMounted(() => log.push('mounted')); return () => h('p', 'x'); } }); mount(C); await tick(); return log;
```

**8.** Хуки при SSR-рендері рядка: чи виконуються `onBeforeMount` та `onMounted`?

```js
const log = []; const C = defineComponent({ setup() { onBeforeMount(() => log.push('beforeMount')); onMounted(() => log.push('mounted')); return () => h('p', 'x'); } }); const out = await renderToString(createSSRApp(C)); return [out, log];
```

**9.** `onMounted(async)` кидає помилку: чи її ловить `onErrorCaptured`?

```js
const log = []; const C = defineComponent({ setup() { onMounted(async () => { throw new Error('async'); }); return () => h('p'); } }); const P = defineComponent({ setup() { onErrorCaptured((e) => { log.push('parent ' + e.message); return false; }); return () => h(C); } }); mount(P); await sleep(5); return log;
```

### Рівень 4. Практика

**10.** Які хуки доступні лише у `KeepAlive`?

**11.** Для чого `onErrorCaptured`?

### Відповіді

1. `['A mounted', 'A activated', 'A deactivated', 'A activated']`
2. `['A mounted', 'A unmounted', 'A mounted']`
3. `'<button>1</button>'`
4. `['boom']`
5. `['mid']`
6. `['mid', 'top']`
7. `['mounted']`
8. `['<p>x</p>', []]`
9. `['parent async']`
10. `onActivated` (компонент вставлено/відновлено з кешу) та `onDeactivated` (поміщено в кеш)
11. Перехоплює помилки нащадків; повернення `false` зупиняє подальше поширення помилки
