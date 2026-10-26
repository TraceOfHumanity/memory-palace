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
