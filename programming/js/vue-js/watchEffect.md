# Vue 3: `watchEffect`, `watchPostEffect`, `watchSyncEffect`

Виміряно на Vue 3.5.44.

## 1. Що це

`watchEffect(fn)` **одразу виконує** функцію й **автоматично відстежує** все реактивне, що вона прочитала; при зміні будь-якої залежності функція виконується знову. Не потрібно вказувати джерела — Vue збирає їх сам.

```js
watchEffect(() => {
  console.log(`user ${userId.value}, page ${page.value}`);
});
```

## 2. Як виконується (виміряно)

1. **Синхронний перший запуск** при створенні: `run a=1` одразу.
2. Під час запуску Vue записує, які реактивні значення були прочитані.
3. Зміна залежності → запуск **планується** (`flush: 'pre'`, групується).
4. Зміна значення, яке **не читалось** (`b`), запуску не спричиняє: `run a=1 | run a=2` після `b.value = 9`.

## 3. Умовні залежності

Залежності **перебудовуються при кожному запуску**. Ефект `c.value ? d.value : 'off'`: поки `c = true`, залежить від `c` і `d`; після `c = false` — **лише від `c`**, і зміна `d` ефект не запускає (виміряно: `d=1 | off`, після `d.value = 2` нового запуску немає).

## 4. Пастка: читання після `await` НЕ відстежується

Відстеження працює лише в **синхронній** частині функції (до першого `await`). Виміряно: `async` ефект, що читає `t.value` **після** `await Promise.resolve()` — зміна `t` його не перезапускає (лише `after await t=0`). Читай усі залежності **до** `await` (зберігай у локальні змінні) або використовуй `watch`.

## 5. Cleanup

Перший аргумент — `onCleanup`: викликається **перед наступним запуском** і при зупинці:
```js
watchEffect((onCleanup) => {
  const id = setInterval(…, ms.value);
  onCleanup(() => clearInterval(id));
});
```
Виміряно: `effect 0 | clean 0 | effect 1`.

## 6. Зупинка

```js
const stop = watchEffect(…);
stop();
```
Ефект, створений синхронно в `setup()`, зупиняється разом із компонентом (виміряно: після `unmount` нових запусків немає). Створений асинхронно — **не** автозупиняється.

## 7. Варіанти flush

- `watchEffect` — `flush: 'pre'` (перед рендером).
- `watchPostEffect(fn)` ≡ `watchEffect(fn, { flush: 'post' })` — **після** оновлення DOM (можна читати оновлений DOM).
- `watchSyncEffect(fn)` ≡ `flush: 'sync'` — синхронно на кожну зміну.
Виміряно (одна зміна): `syncEff 0 | syncEff 1 | --after set | post 1` — sync-версія виконалась **до** повернення з присвоєння, post — після тіку.

## 8. `watchEffect` чи `watch`

| | `watchEffect` | `watch` |
|---|---|---|
| Джерела | **автоматично** | явно |
| Перший запуск | одразу | лише з `immediate` |
| old/new значення | немає | є |
| Контроль, що саме запускає | ні | так |
| Коли | залежностей багато, потрібна «повна» синхронізація | потрібна реакція на конкретну зміну |

## 9. Пастки

1. Читання після `await` — не відстежується.
2. Випадково прочитати зайве реактивне значення → зайві запуски (використай `watch`).
3. Нескінченний цикл: ефект пише у те, що читає.
4. Асинхронне створення → витік.
5. Дорогі обчислення в ефекті — для них `computed`.
6. Очікувати старе значення — його немає.

## 10. Алгоритм

1. Потрібна автоматична синхронізація із зовнішнім світом (DOM API, запит, localStorage).
2. `watchEffect(() => { … })`; усі залежності читай **синхронно**, до `await`.
3. Ресурси → `onCleanup`.
4. Читаєш DOM після зміни → `watchPostEffect`.
5. Створюй у `setup()` (автозупинка) або зупиняй вручну.

## Задачі для закріплення

12 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Кожен фрагмент — тіло асинхронної функції, відповідь — значення, яке воно повертає. У прикладах `mount(Component)` монтує компонент у тестове дерево без DOM, `html(r)` серіалізує його, `click(node)` викликає `onClick`, `tick()` — це `nextTick`, `sleep(ms)` — пауза; API Vue (`ref`, `watch`, `h` та інші) імпортуються з `vue`.

### Рівень 1. Основи

**1.** `watchEffect` виконується одразу.

```js
const n = ref(1); const log = []; watchEffect(() => log.push(n.value)); return log;
```

**2.** Повторний запуск при зміні залежності.

```js
const n = ref(1); const log = []; watchEffect(() => log.push(n.value)); n.value = 2; await tick(); return log;
```

**3.** Умовні залежності: що відстежується?

```js
const on = ref(true), a = ref(1), b = ref(2); let runs = 0; watchEffect(() => { runs++; if (on.value) a.value; else b.value; }); b.value = 5; await tick(); const x = runs; on.value = false; await tick(); b.value = 6; await tick(); return [x, runs];
```

### Рівень 2. Деталі й поведінка

**4.** Пастка: читання після `await` не відстежується.

```js
const a = ref(1), b = ref(1); let runs = 0; watchEffect(async () => { a.value; await Promise.resolve(); b.value; runs++; }); await tick(); await sleep(5); b.value = 2; await tick(); await sleep(5); return runs;
```

**5.** `onCleanup` у `watchEffect`.

```js
const n = ref(0); const log = []; watchEffect((onCleanup) => { const v = n.value; log.push('run ' + v); onCleanup(() => log.push('clean ' + v)); }); n.value = 1; await tick(); return log;
```

**6.** Зупинка ефекту.

```js
const n = ref(0); let runs = 0; const stopFn = watchEffect(() => { n.value; runs++; }); stopFn(); n.value = 1; await tick(); return runs;
```

### Рівень 3. Нюанси та пастки

**7.** `flush: 'post'` та `watchPostEffect`.

```js
const log = []; const n = ref(0); watchPostEffect(() => log.push('post ' + n.value)); watchEffect(() => log.push('pre ' + n.value)); n.value = 1; await tick(); return log;
```

**8.** `flush: 'sync'`.

```js
const n = ref(0); const log = []; watchEffect(() => log.push(n.value), { flush: 'sync' }); n.value = 1; n.value = 2; return log;
```

**9.** Ефект із кількома залежностями та батчинг.

```js
const a = ref(1), b = ref(1); let runs = 0; watchEffect(() => { a.value + b.value; runs++; }); a.value = 2; b.value = 2; await tick(); return runs;
```

### Рівень 4. Практика

**10.** Скасування застарілої асинхронної дії через `onCleanup`.

```js
const id = ref(1); const out = []; watchEffect((onCleanup) => { let stale = false; onCleanup(() => (stale = true)); const cur = id.value; sleep(cur === 1 ? 20 : 5).then(() => { if (!stale) out.push('data' + cur); }); }); id.value = 2; await sleep(40); return out;
```

**11.** Коли `watchEffect` зручніший за `watch`?

**12.** Чому читання після `await` не відстежується?

### Відповіді

1. `[1]`
2. `[1, 2]`
3. `[1, 3]`
4. `1`
5. `['run 0', 'clean 0', 'run 1']`
6. `1`
7. `['pre 0', 'pre 1', 'post 1']`
8. `[0, 1, 2]`
9. `2`
10. `['data2']`
11. Коли ефект читає кілька реактивних значень і має виконатися одразу; не потрібно вручну перелічувати залежності
12. Залежності збираються лише синхронно під час виконання функції; після `await` активний ефект уже невідомий, тому потрібні значення читають до `await`
