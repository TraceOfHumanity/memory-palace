# React: `useSyncExternalStore`

Виміряно на React 18.3.1 (`react-test-renderer`, `react-dom/server`).

## 1. Що це

Хук для підписки на **зовнішнє сховище**, що живе поза React: `window.matchMedia`, `navigator.onLine`, `localStorage`, власний store (Redux, Zustand усередині використовують його). Він гарантує, що UI **не «рветься» (tearing)** в concurrent-рендері — усі компоненти бачать **одну й ту саму версію** даних.

```jsx
const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot?);
```
- `subscribe(callback)` — підписатись на зміни; **повертає функцію відписки**;
- `getSnapshot()` — повертає **поточне значення** (синхронно, дешево);
- `getServerSnapshot()` — значення для SSR і гідрації.

## 2. Як це виконується

1. Рендер: React викликає `getSnapshot()` і використовує значення.
2. Після коміту React викликає `subscribe(handler)`.
3. Зовнішнє сховище змінилось → викликає `handler` → React викликає `getSnapshot()` ще раз; якщо значення **інше** (`Object.is`) — планує **синхронний** перерендер.
4. Розмонтування → React викликає функцію відписки.

Виміряно (простий store): після `store.set(1)` UI став `1`, **2 рендери** (початковий + оновлення), слухачів **1**; після `unmount` слухачів **0**.

## 3. Приклад: хук `useOnlineStatus`

```jsx
function subscribe(cb) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => { window.removeEventListener("online", cb); window.removeEventListener("offline", cb); };
}
const useOnline = () => useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
```

## 4. Головна пастка: `getSnapshot` має повертати **кешоване** значення

Якщо `getSnapshot` щоразу повертає **новий об'єкт** (`() => ({ x: 1 })`), React бачить «значення змінилось» → перерендер → знову новий → **нескінченний цикл**. Виміряно (React 18.3): попередження `Warning: The result of getSnapshot should be cached to avoid an infinite loop`, далі `Maximum update depth exceeded`, і при запуску під `act` — вичерпання пам'яті (heap out of memory).
Рішення: повертати **примітив** або **той самий об'єкт**, поки дані не змінились (кеш у сховищі):
```jsx
let snapshot = { x: 1 };
const getSnapshot = () => snapshot;           // змінюй snapshot лише при реальній зміні
```

## 5. Пастка: нестабільна `subscribe`

Якщо `subscribe` — **inline-функція** (створюється щоразу), React при кожному рендері відписується і підписується заново. Виміряно: `subscribe unsubscribe subscribe` за два рендери. Виносити `subscribe` за межі компонента або `useCallback`.

## 6. SSR

`getServerSnapshot` використовується на сервері й під час гідрації, щоб HTML збігся з клієнтом. Виміряно: `renderToString` з `getServerSnapshot = () => 'server'` → `<p>server</p>`. Без нього на сервері — помилка (`Missing getServerSnapshot`).

## 7. Навіщо, якщо є `useState` + `useEffect`

Ручна підписка через `useEffect` має проблеми: пропущена зміна між рендером і підпискою; **tearing** у concurrent-режимі; зайві рендери. `useSyncExternalStore` вирішує це за дизайном і є правильним способом для сторонніх сховищ. Для власного стану компонента він не потрібен.

## 8. Типові помилки

1. `getSnapshot` повертає новий об'єкт/масив щоразу → нескінченний цикл.
2. `subscribe` — inline-функція → перепідписка на кожен рендер.
3. `subscribe` не повертає відписку → витік.
4. Мутувати збережений snapshot на місці (React не побачить зміни, `Object.is`).
5. Забути `getServerSnapshot` у SSR.
6. Важкі обчислення у `getSnapshot` (викликається часто).
7. Використання замість звичайного стану компонента.

## 9. Алгоритм

1. Зовнішнє сховище з `subscribe`/`get`.
2. `getSnapshot` повертає кешований/примітивний результат.
3. `subscribe` — стабільна функція, що повертає відписку.
4. SSR → `getServerSnapshot`.
5. Для похідних значень — селектор, що повертає примітив/стабільне посилання.

## Задачі для закріплення

9 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Кожен фрагмент — тіло асинхронної функції, відповідь — значення, яке воно повертає. У прикладах `mount(el)` монтує елемент через `act`, `press(r)` викликає `onClick` кнопки, `text(r)` повертає текст результату; `create` і `act` беруться з `react-test-renderer`, `renderToString` — з `react-dom/server`, хуки — з `react`.

### Рівень 1. Основи

**1.** Що показує компонент, підписаний на зовнішній стор, після `set`?

```jsx
const mkStore = (v) => { let s = v; const l = new Set(); return { get: () => s, set: (x) => { s = x; l.forEach(f => f()); }, sub: (f) => (l.add(f), () => l.delete(f)), get n() { return l.size; } }; };
const st = mkStore(1);
function C() { const v = useSyncExternalStore(st.sub, st.get); return <p>{v}</p>; }
const t = await mount(<C />);
await act(async () => { st.set(2); });
return text(t);
```

**2.** Кількість підписників після монтування та після розмонтування.

```jsx
const mkStore = (v) => { let s = v; const l = new Set(); return { get: () => s, set: (x) => { s = x; l.forEach(f => f()); }, sub: (f) => (l.add(f), () => l.delete(f)), get n() { return l.size; } }; };
const st = mkStore(1);
function C() { const v = useSyncExternalStore(st.sub, st.get); return <p>{v}</p>; }
const t = await mount(<C />);
const a = st.n;
await act(async () => { t.unmount(); });
return [a, st.n];
```

**3.** Скільки рендерів, якщо значення не змінилось (те саме примітивне)?

```jsx
const mkStore = (v) => { let s = v; const l = new Set(); return { get: () => s, set: (x) => { s = x; l.forEach(f => f()); }, sub: (f) => (l.add(f), () => l.delete(f)), get n() { return l.size; } }; };
const st = mkStore(1);
let renders = 0;
function C() { renders++; const v = useSyncExternalStore(st.sub, st.get); return <p>{v}</p>; }
const t = await mount(<C />);
const a = renders;
await act(async () => { st.set(1); });
return [a, renders];
```

### Рівень 2. Деталі й поведінка

**4.** Що буде, якщо `getSnapshot` повертає новий об'єкт щоразу?

```jsx
let n = 0;
const sub = () => () => {};
function C() { const v = useSyncExternalStore(sub, () => ({ a: 1 })); return <p>{typeof v}</p>; }
const errs = [];
const orig = console.error; console.error = (...a) => errs.push(String(a[0]).slice(0, 60));
try { await mount(<C />); } catch (e) { errs.push('throw ' + e.name); } finally { console.error = orig; }
return errs.length > 0;
```

**5.** Селектор: підписка лише на потрібну частину.

```jsx
const mkStore = (v) => { let s = v; const l = new Set(); return { get: () => s, set: (x) => { s = x; l.forEach(f => f()); }, sub: (f) => (l.add(f), () => l.delete(f)), get n() { return l.size; } }; };
const st = mkStore({ a: 1, b: 1 });
let renders = 0;
function C() { renders++; const a = useSyncExternalStore(st.sub, () => st.get().a); return <p>{a}</p>; }
const t = await mount(<C />);
await act(async () => { st.set({ a: 1, b: 2 }); });
await act(async () => { st.set({ a: 5, b: 2 }); });
return [text(t), renders];
```

**6.** SSR: третій аргумент `getServerSnapshot`.

```jsx
function C() { const v = useSyncExternalStore(() => () => {}, () => 'client', () => 'server'); return <p>{v}</p>; }
return renderToString(<C />);
```

### Рівень 3. Нюанси та пастки

**7.** Підписка на `online`-подібну зовнішню подію (EventTarget).

```jsx
const et = new EventTarget(); let on = true;
const sub = (f) => { et.addEventListener('chg', f); return () => et.removeEventListener('chg', f); };
function C() { const v = useSyncExternalStore(sub, () => on); return <p>{String(v)}</p>; }
const t = await mount(<C />);
await act(async () => { on = false; et.dispatchEvent(new Event('chg')); });
return text(t);
```

**8.** Для чого `useSyncExternalStore`?

**9.** Які вимоги до `getSnapshot`?

### Відповіді

1. `'2'`
2. `[1, 0]`
3. `[1, 1]`
4. `true`
5. `['5', 2]`
6. `'<p>server</p>'`
7. `'false'`
8. Безпечно підписує компонент на зовнішнє джерело даних (стор, браузерне API) без «розривів» між частинами інтерфейсу при конкурентному рендері
9. Повертати те саме значення (за `Object.is`), якщо дані не змінилися; інакше можливий нескінченний цикл рендерів
