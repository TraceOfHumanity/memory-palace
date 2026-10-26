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
