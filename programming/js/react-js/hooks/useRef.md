# React: `useRef`

Виміряно на React 18.3.1 (`react-test-renderer`, `react-dom` + `jsdom`) і React 19 (де сказано).

## 1. Що це

`useRef(initialValue)` повертає **змінний об'єкт `{ current: initialValue }`**, який **той самий** між рендерами (React зберігає його у слоті). Зміна `ref.current` **не викликає рендер**.

Два головні застосування:
1. **Посилання на DOM-елемент** (чи екземпляр компонента): `<input ref={ref} />`.
2. **«Коробка» для змінного значення**, що має пережити рендери, але не впливає на вигляд: id таймера, попереднє значення, прапорці, лічильники, WebSocket.

## 2. Як це виконується

1. Перший рендер: `useRef(0)` створює `{ current: 0 }` і повертає його.
2. Наступні рендери: повертається **той самий об'єкт** (виміряно: `ref` однаковий між рендерами → `true`).
3. Запис `ref.current = ...` — звичайна мутація об'єкта; React про неї **не знає**.

Виміряно: після `ref.current++` — **0 рендерів**, UI показує старе `ref=0`; після примусового рендеру (через `setState`) UI показало `ref=1` (оновлене значення читається у наступному рендері).

## 3. `ref` для DOM

```jsx
const inputRef = useRef(null);
useEffect(() => { inputRef.current.focus(); }, []);
return <input ref={inputRef} />;
```
Порядок (виміряно): під час рендеру `ref.current` = **`null`**; React присвоює DOM-вузол у фазі **commit** (до `useLayoutEffect`: `layout:INPUT`). Тому читати `ref.current` треба в ефектах і обробниках, а **не під час рендеру**.
Коли елемент видаляється (`v-if`-подібне умовне відображення), `ref.current` знову стає `null`.

## 4. Callback ref

`ref={(node) => { ... }}` — функція викликається з вузлом при монтуванні й з `null` при розмонтуванні. Виміряно: `attach → detach`.
Пастка: **inline-функція** створюється заново щоразу, тому React при кожному рендері викликає старий ref з `null`, а новий з вузлом: `attach → detach → attach`. Стабілізуй через `useCallback`.
**React 19:** callback ref може **повертати cleanup-функцію** (виміряно: `attach → cleanup`), а `ref` можна передавати як **звичайний пропс** функціональним компонентам (виміряно: `ref as prop (no forwardRef): INPUT`), `forwardRef` більше не потрібен.

## 5. Початкове значення обчислюється щоразу

`useRef(init())` викликає `init()` **при кожному рендері** (виміряно: 3 виклики за 3 рендери; результат ігнорується). Для дорогої ініціалізації — лінивий патерн:
```jsx
const ref = useRef(null);
if (ref.current === null) ref.current = createExpensive();
```

## 6. Патерни

```jsx
// попереднє значення
function usePrevious(value) {
  const ref = useRef();
  useEffect(() => { ref.current = value; });
  return ref.current;            // значення з минулого рендеру
}
// таймер
const timer = useRef(null);
const start = () => { timer.current = setInterval(tick, 1000); };
const stop = () => clearInterval(timer.current);
// «свіже» значення в застарілому замиканні
const latest = useRef(value); latest.current = value;   // (або в ефекті)
```

## 7. `useRef` чи `useState`

| | `useState` | `useRef` |
|---|---|---|
| Зміна викликає рендер | так | **ні** |
| Можна читати під час рендеру | так | не рекомендовано |
| Оновлення | асинхронно (черга) | **синхронно** (мутація) |
| Для чого | дані для UI | дані «за лаштунками» |

Правило: якщо значення впливає на те, що бачить користувач — `useState`; якщо ні — `useRef`.

## 8. Типові помилки

1. **Читати/писати `ref.current` під час рендеру** (крім лінивої ініціалізації) — робить компонент нечистим.
2. Очікувати, що зміна `ref.current` оновить екран.
3. Чекати, що `ref.current` не `null` у рендері на першому проході.
4. `useRef(expensive())` — обчислюється щоразу.
5. Inline callback ref → зайві attach/detach.
6. Передати `ref` власному компоненту у React 18 без `forwardRef` (пропс `ref` не передається; попередження). У React 19 — можна.
7. Використати ref замість стану для даних UI → «замерзлий» інтерфейс.
8. Забути очистити таймер/підписку, збережені в ref, у cleanup ефекту.

## 9. Алгоритм

1. Потрібен доступ до DOM-вузла → `useRef(null)` + `ref={...}` → читай у ефекті/обробнику.
2. Потрібно зберегти значення між рендерами без перерендеру → `useRef(init)`.
3. Мутуй `ref.current` лише в ефектах і обробниках.
4. Дорога ініціалізація → лінива перевірка `if (ref.current === null)`.
5. Значення впливає на UI → переходь на `useState`.

## Задачі для закріплення

12 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Кожен фрагмент — тіло асинхронної функції, відповідь — значення, яке воно повертає. У прикладах `mount(el)` монтує елемент через `act`, `press(r)` викликає `onClick` кнопки, `text(r)` повертає текст результату; `create` і `act` беруться з `react-test-renderer`, `renderToString` — з `react-dom/server`, хуки — з `react`.

### Рівень 1. Основи

**1.** Чи викликає зміна `ref.current` повторний рендер?

```jsx
let renders = 0;
function C() { renders++; const r = useRef(0); return <button onClick={() => { r.current++; }}>{r.current}</button>; }
const t = await mount(<C />);
await press(t); await press(t);
return [renders, text(t)];
```

**2.** А що покаже наступний рендер?

```jsx
function C() { const r = useRef(0); const [, force] = useState(0); return <button onClick={() => { r.current++; force(x => x + 1); }}>{r.current}</button>; }
const t = await mount(<C />);
await press(t); await press(t);
return text(t);
```

**3.** Яке початкове значення `useRef(5)` та чи зберігається між рендерами?

```jsx
const seen = [];
function C() { const r = useRef(5); seen.push(r.current); r.current += 1; const [, f] = useState(0); return <button onClick={() => f(x => x + 1)}>x</button>; }
const t = await mount(<C />);
await press(t); await press(t);
return seen;
```

### Рівень 2. Деталі й поведінка

**4.** Чи один і той самий об'єкт ref повертається на кожному рендері?

```jsx
const refs = new Set();
function C() { const r = useRef(null); refs.add(r); const [, f] = useState(0); return <button onClick={() => f(x => x + 1)}>x</button>; }
const t = await mount(<C />);
await press(t); await press(t);
return refs.size;
```

**5.** Ref на DOM-елемент (через createNodeMock).

```jsx
function C() { const r = useRef(null); const [s, set] = useState('no'); useEffect(() => { set(r.current ? r.current.tag : 'none'); }, []); return <p ref={r}>{s}</p>; }
let t; await act(async () => { t = TR.create(<C />, { createNodeMock: () => ({ tag: 'P' }) }); });
return text(t);
```

**6.** Збереження попереднього значення через ref.

```jsx
function C({ v }) { const prev = useRef(); useEffect(() => { prev.current = v; }); return <p>{v}-{String(prev.current)}</p>; }
const t = await mount(<C v={1} />);
await act(async () => { t.update(<C v={2} />); });
await act(async () => { t.update(<C v={3} />); });
return text(t);
```

### Рівень 3. Нюанси та пастки

**7.** Лічильник рендерів через ref.

```jsx
function C() { const n = useRef(0); n.current++; const [, f] = useState(0); return <button onClick={() => f(x => x + 1)}>{n.current}</button>; }
const t = await mount(<C />);
await press(t); await press(t);
return text(t);
```

**8.** Збереження id таймера в ref.

```jsx
function C() { const id = useRef(null); useEffect(() => { id.current = setTimeout(() => {}, 1000); return () => clearTimeout(id.current); }, []); return <p>{typeof id.current}</p>; }
const t = await mount(<C />);
const r = text(t);
await act(async () => { t.unmount(); });
return r;
```

**9.** Callback ref: що викликається при монтуванні та розмонтуванні?

```jsx
const log = [];
function C() { return <p ref={(el) => { log.push(el ? 'set' : 'null'); }}>x</p>; }
let t; await act(async () => { t = TR.create(<C />, { createNodeMock: () => ({}) }); });
await act(async () => { t.unmount(); });
return log;
```

### Рівень 4. Практика

**10.** `useRef` для імперативного значення «ліниве» ініціалізування.

```jsx
let inits = 0;
function C() { const r = useRef(null); if (r.current === null) { inits++; r.current = { id: 1 }; } const [, f] = useState(0); return <button onClick={() => f(x => x + 1)}>{r.current.id}</button>; }
const t = await mount(<C />);
await press(t); await press(t);
return inits;
```

**11.** Коли використовувати `useRef` замість `useState`?

**12.** Чому не можна читати/писати `ref.current` під час рендеру?

### Відповіді

1. `[1, '0']`
2. `'2'`
3. `[5, 6, 7]`
4. `1`
5. `'P'`
6. `'3-2'`
7. `'3'`
8. `'object'`
9. `['set', 'null']`
10. `1`
11. Коли значення потрібно зберігати між рендерами, але його зміна не повинна викликати перерендер (таймери, DOM-вузли, попередні значення)
12. Це робить рендер залежним від мутабельного стану та порушує чистоту компонента; записи варто робити в обробниках або ефектах
