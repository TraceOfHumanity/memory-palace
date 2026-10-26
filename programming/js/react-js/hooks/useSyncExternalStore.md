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
