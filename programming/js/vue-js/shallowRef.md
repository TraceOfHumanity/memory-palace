# Vue 3: `shallowRef`, `triggerRef`, `customRef`, `shallowReactive`

Виміряно на Vue 3.5.44. Продовження [ref.md](ref.md) і [reactive.md](reactive.md).

## 1. `shallowRef`

`shallowRef(value)` — ref, реактивний **лише на рівні `.value`**: реагує на **заміну** значення, а **не** на мутацію всередині. Вкладені об'єкти **не** обгортаються проксі.

```js
const state = shallowRef({ a: 1 });
state.value.a = 2;          // НЕ запускає ефекти
state.value = { a: 2 };     // запускає
```
Виміряно: `sr.value.a = 2` — ефект не спрацював (`shallowRef mutate no trigger: true`).

Навіщо:
- **продуктивність** для великих структур (списки з тисяч об'єктів, дані карт, результат запиту), що оновлюються **заміною**;
- **зовнішні об'єкти** (екземпляри класів, бібліотек: Leaflet map, Chart.js), які не повинні проксуватися;
- незмінні (immutable) патерни: `state.value = { ...state.value, a: 2 }`.

## 2. `triggerRef`

Примусово повідомляє підписників, що `shallowRef` «змінився», після **мутації** всередині:
```js
state.value.a = 2;
triggerRef(state);          // ручний trigger
```
Виміряно: після `triggerRef` ефект виконався (`a=1 | a=2`).

## 3. `shallowReactive`

Реактивний **лише перший рівень** властивостей: вкладений об'єкт — «сирий» (`isReactive(sr.nested)` → `false`). Для великих плоских стейтів із вкладеними незмінними даними.

## 4. `customRef`

Власний ref із повним контролем `get`/`set` і моментів `track`/`trigger`:
```js
function useDebouncedRef(value, delay = 200) {
  let t;
  return customRef((track, trigger) => ({
    get() { track(); return value; },
    set(v) { clearTimeout(t); t = setTimeout(() => { value = v; trigger(); }, delay); },
  }));
}
const text = useDebouncedRef("a");
```
Виміряно: `dr.value = 'b'; dr.value = 'c'` одразу → ефект бачив `a`, `(before delay)`, а після затримки → `c` (проміжне `b` пропущено). Застосування: debounce/throttle, валідація, синхронізація з `localStorage`.

## 5. Коли що

| Потреба | Інструмент |
|---|---|
| Звичайний реактивний стан | `ref` |
| Велика структура, заміна замість мутації | `shallowRef` |
| Мутація всередині + ручне оновлення | `shallowRef` + `triggerRef` |
| Плоский стейт зі «сирими» вкладеннями | `shallowReactive` |
| Debounce/особлива логіка читання-запису | `customRef` |
| Сторонній об'єкт без проксі | `markRaw` або `shallowRef` |

## 6. Пастки

1. Мутувати вкладене в `shallowRef` і дивуватись, що UI не оновився.
2. Забути `triggerRef` після ручної мутації.
3. У `customRef` забути `track()` у `get` або `trigger()` у `set` → реактивність не працює.
4. Таймери в `customRef` без очищення (при розмонтуванні).
5. Передчасна оптимізація: `shallowRef` усюди ускладнює код.
6. Змішувати `shallowRef` і `deep`-`watch`: `watch(shallowRef, cb, { deep: true })` обходить усі властивості (дорого).

## 7. Алгоритм

1. За замовчуванням `ref`.
2. Виміряно повільно через глибоку реактивність великих даних → `shallowRef` + заміна значення.
3. Мутуєш на місці → `triggerRef`.
4. Нестандартна поведінка читання/запису → `customRef`.

## Задачі для закріплення

11 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Кожен фрагмент — тіло асинхронної функції, відповідь — значення, яке воно повертає. У прикладах `mount(Component)` монтує компонент у тестове дерево без DOM, `html(r)` серіалізує його, `click(node)` викликає `onClick`, `tick()` — це `nextTick`, `sleep(ms)` — пауза; API Vue (`ref`, `watch`, `h` та інші) імпортуються з `vue`.

### Рівень 1. Основи

**1.** `shallowRef` не реагує на мутацію вкладеного.

```js
const o = shallowRef({ n: 1 }); let runs = 0; watchEffect(() => { o.value.n; runs++; }); o.value.n = 2; await tick(); return runs;
```

**2.** Реагує на заміну `.value`.

```js
const o = shallowRef({ n: 1 }); let runs = 0; watchEffect(() => { o.value.n; runs++; }); o.value = { n: 2 }; await tick(); return runs;
```

**3.** `triggerRef` примусово запускає ефекти.

```js
const o = shallowRef({ n: 1 }); let runs = 0; watchEffect(() => { o.value.n; runs++; }); o.value.n = 2; triggerRef(o); await tick(); return runs;
```

### Рівень 2. Деталі й поведінка

**4.** `isReactive(shallowRef.value)`.

```js
const o = shallowRef({ n: 1 }); return [isReactive(o.value), isRef(o)];
```

**5.** `shallowReactive` й вкладений об'єкт.

```js
const s = shallowReactive({ a: { n: 1 }, b: 1 }); let runs = 0; watchEffect(() => { s.a.n; s.b; runs++; }); s.a.n = 5; await tick(); const x = runs; s.b = 2; await tick(); return [x, runs];
```

**6.** `customRef`: debounce-подібна поведінка (через лічильник тригерів).

```js
let timer; const debounced = (v, ms) => customRef((track, trigger) => ({ get() { track(); return v; }, set(n) { clearTimeout(timer); timer = setTimeout(() => { v = n; trigger(); }, ms); } })); const t = debounced('a', 10); const log = []; watchEffect(() => log.push(t.value)); t.value = 'b'; t.value = 'c'; await sleep(30); return log;
```

### Рівень 3. Нюанси та пастки

**7.** `shallowRef` для великого масиву: заміна замість мутації.

```js
const list = shallowRef([1, 2, 3]); const log = []; watchEffect(() => log.push(list.value.length)); list.value = [...list.value, 4]; await tick(); return log;
```

**8.** `shallowRef` та `ref`: порівняння реакцій на `push`.

```js
const a = ref([1]); const b = shallowRef([1]); let ra = 0, rb = 0; watchEffect(() => { a.value.length; ra++; }); watchEffect(() => { b.value.length; rb++; }); a.value.push(2); b.value.push(2); await tick(); return [ra, rb];
```

**9.** `toRaw` для `shallowRef`.

```js
const o = { n: 1 }; const s = shallowRef(o); return [s.value === o, toRaw(s.value) === o];
```

### Рівень 4. Практика

**10.** Коли застосовувати `shallowRef`?

**11.** Для чого `customRef`?

### Відповіді

1. `1`
2. `2`
3. `2`
4. `[false, true]`
5. `[1, 2]`
6. `['a', 'c']`
7. `[3, 4]`
8. `[2, 1]`
9. `[true, true]`
10. Для великих структур або об'єктів зовнішніх бібліотек, де глибока реактивність дорога або небажана; оновлюють заміною `.value`
11. Дає повний контроль над `track`/`trigger`: debounce, throttle, валідація, синхронізація зі сховищем
