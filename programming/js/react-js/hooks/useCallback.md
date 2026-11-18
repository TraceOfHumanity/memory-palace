# React: `useCallback`

Виміряно на React 18.3.1 (`react-test-renderer`).

## 1. Що це

`useCallback(fn, deps)` повертає **ту саму функцію** між рендерами, поки не змінились залежності. По суті: `useCallback(fn, deps)` ≡ `useMemo(() => fn, deps)`.

```jsx
const onSave = useCallback(() => save(id), [id]);
```

Навіщо: у JavaScript функція, створена всередині компонента, — **новий об'єкт при кожному рендері**. Для `React.memo`-компонента це нова пропса → він перерендерується, хоч «нічого не змінилось».

## 2. Як це виконується

1. Перший рендер: React зберігає `fn` і `deps`.
2. Наступний: порівняння залежностей (`Object.is`). Однакові → повертається **стара** функція; різні → нова.
3. Сама `useCallback` **не викликає** функцію — лише зберігає посилання.

## 3. Виміряний ефект

Батько оновлюється двічі, дитина `React.memo`:
- проп `onClick` — inline-функція: дитина перерендерилась **2 рази** (кожного разу нова функція);
- проп `onClick` — `useCallback(() => {}, [])`: дитина перерендерилась **0 разів**.
Без `React.memo` `useCallback` **нічого не дає** — дитина (звичайна) перерендерується завжди (виміряно: звичайний дочірній компонент — 1 рендер, `React.memo` без пропсів — 0).

## 4. Коли потрібен

1. Функція передається як пропс у `React.memo`-компонент (або у віртуалізований список).
2. Функція — залежність `useEffect`/`useMemo`/іншого `useCallback` (щоб ефект не перезапускався).
3. Функція передається в кастомний хук, який порівнює її за посиланням.
4. Не потрібен: обробники для звичайних DOM-елементів (`<button onClick=...>`) — вони дешеві.

## 5. Пастка: застаріле замикання

Функція «запам'ятовує» значення зі свого рендеру. Виміряно: `useCallback(() => n, [])` і після `setN(5)` повертає **`0`**, хоча стан — 5. Додавай усе використане в `deps` або використовуй функціональне оновлення (`setN(x => x + 1)`), або `useRef` з «найсвіжішим значенням», або `useEffectEvent` (React 19.2).

## 6. Пастка: нестабільні залежності

`useCallback(fn, [obj])` з об'єктом, що створюється щоразу, — марно, функція нова щоразу.

## 7. Пастка: «мемоізувати все»

`useCallback` має власну ціну (порівняння залежностей, пам'ять), і без `React.memo` на дочірньому компоненті — чистий мінус. Мемоізація оплачується лише там, де її вимірювано ефект.

## 8. Альтернативи

- Перенести функцію **за межі компонента**, якщо вона не залежить від пропсів/стану: стабільна без хуків.
- Передавати `dispatch` з `useReducer` — він **завжди стабільний**.
- React Compiler (19) мемоізує автоматично.

## 9. Типові помилки

1. `useCallback` без `React.memo`/залежностей-споживачів — немає користі.
2. Порожній масив `[]` при використанні стану всередині → застаріле значення.
3. Нестабільні залежності.
4. `useCallback(fn())` замість `useCallback(fn, deps)` (виклик замість передачі).
5. Очікувати, що `useCallback` «кешує результат» — кешується **функція**, а не її результат (результат — `useMemo`).
6. Мемоізувати все підряд.

## 10. Алгоритм

1. Функція йде в пропс `React.memo`-компонента або в deps ефекту? Ні → не потрібен `useCallback`.
2. Так → `useCallback(fn, [усі значення з замикання])`.
3. Не хочеш залежності від стану → функціональне оновлення (`setX(prev => ...)`) або ref.
4. Перевір Profiler'ом, що зайві рендери зникли.

## Задачі для закріплення

10 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Кожен фрагмент — тіло асинхронної функції, відповідь — значення, яке воно повертає. У прикладах `mount(el)` монтує елемент через `act`, `press(r)` викликає `onClick` кнопки, `text(r)` повертає текст результату; `create` і `act` беруться з `react-test-renderer`, `renderToString` — з `react-dom/server`, хуки — з `react`.

### Рівень 1. Основи

**1.** Чи зберігається посилання на функцію між рендерами з `useCallback`?

```jsx
const seen = new Set();
function C({ n }) { const f = useCallback(() => 1, []); seen.add(f); return <p>{n}</p>; }
const t = await mount(<C n={1} />);
await act(async () => { t.update(<C n={2} />); });
return seen.size;
```

**2.** А без `useCallback`?

```jsx
const seen = new Set();
function C({ n }) { const f = () => 1; seen.add(f); return <p>{n}</p>; }
const t = await mount(<C n={1} />);
await act(async () => { t.update(<C n={2} />); });
return seen.size;
```

**3.** Скільки разів рендериться `React.memo`-дитина зі стабільним колбеком?

```jsx
let kid = 0;
const Kid = React.memo(function Kid({ onX }) { kid++; return <i>k</i>; });
function P({ n }) { const onX = useCallback(() => {}, []); return <div><Kid onX={onX} />{n}</div>; }
const t = await mount(<P n={1} />);
await act(async () => { t.update(<P n={2} />); });
await act(async () => { t.update(<P n={3} />); });
return kid;
```

### Рівень 2. Деталі й поведінка

**4.** А з нестабільним колбеком?

```jsx
let kid = 0;
const Kid = React.memo(function Kid({ onX }) { kid++; return <i>k</i>; });
function P({ n }) { const onX = () => {}; return <div><Kid onX={onX} />{n}</div>; }
const t = await mount(<P n={1} />);
await act(async () => { t.update(<P n={2} />); });
await act(async () => { t.update(<P n={3} />); });
return kid;
```

**5.** Застаріле замикання: `useCallback` з порожніми залежностями.

```jsx
let out;
function C({ v }) { const f = useCallback(() => v, []); out = f; return <p>{v}</p>; }
const t = await mount(<C v={1} />);
await act(async () => { t.update(<C v={2} />); });
return out();
```

**6.** Правильні залежності: актуальне значення.

```jsx
let out;
function C({ v }) { const f = useCallback(() => v, [v]); out = f; return <p>{v}</p>; }
const t = await mount(<C v={1} />);
await act(async () => { t.update(<C v={2} />); });
return out();
```

### Рівень 3. Нюанси та пастки

**7.** `useCallback(fn, deps)` еквівалентний `useMemo(() => fn, deps)`?

```jsx
const seen = [];
function C() { const a = useCallback(() => 1, []); const b = useMemo(() => () => 1, []); seen.push(typeof a, typeof b); return <p>x</p>; }
await mount(<C />);
return seen;
```

**8.** Функціональне оновлення стану дозволяє стабілізувати колбек без залежності від стану.

```jsx
const seen = new Set();
function C() { const [n, setN] = useState(0); const inc = useCallback(() => setN(p => p + 1), []); seen.add(inc); return <button onClick={inc}>{n}</button>; }
const t = await mount(<C />);
await press(t); await press(t);
return [text(t), seen.size];
```

**9.** Навіщо `useCallback`?

### Рівень 4. Практика

**10.** Коли `useCallback` марний?

### Відповіді

1. `1`
2. `2`
3. `1`
4. `3`
5. `1`
6. `2`
7. `['function', 'function']`
8. `['2', 1]`
9. Зберігає посилання на функцію між рендерами, щоб не ламати `React.memo` дітей і не запускати зайві ефекти, що залежать від цієї функції
10. Коли функція передається звичайним DOM-елементам або дітям без `memo`, або коли залежності змінюються щоразу
