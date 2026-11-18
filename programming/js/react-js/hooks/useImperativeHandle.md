# React: `useImperativeHandle` (і `forwardRef`)

Виміряно на React 18.3.1 (`react-dom` + `jsdom`) і React 19.

## 1. Що це

Зазвичай батько керує дитиною через **пропси** (декларативно). Іноді потрібні **імперативні команди**: `focus()`, `scrollTo()`, `play()`, `reset()`. `useImperativeHandle` дозволяє дочірньому компоненту **налаштувати, що саме побачить батько через `ref`**, замість повного доступу до DOM-вузла.

```jsx
const Fancy = forwardRef(function Fancy(props, ref) {
  const inner = useRef(null);
  useImperativeHandle(ref, () => ({
    focus() { inner.current.focus(); },
  }), []);
  return <input ref={inner} />;
});
// батько
const r = useRef(); <Fancy ref={r} />;  r.current.focus();
```

Сигнатура: `useImperativeHandle(ref, createHandle, deps?)`.

## 2. Як це виконується

1. Дитина рендериться; після **commit** (у фазі layout) React викликає `createHandle()` і присвоює результат у `ref.current` батька.
2. Виміряно: `ref.current` має лише ключі, які ти повернув (`['focus', 'tag']`) — **не** DOM-вузол (`instanceof HTMLElement` → `false`). Батько не може випадково торкнутись внутрішньої реалізації.
3. Якщо `deps` змінились (або `deps` не вказано) — `createHandle` викликається знову й `ref.current` замінюється новим об'єктом.
4. Розмонтування → `ref.current = null` (виміряно).

## 3. Залежності

- З `deps = [p.v]`: за три рендери (`v = 1, 1, 2`) handle створювався **2 рази**, `ref.current.v` = 2.
- **Без `deps`** handle перестворюється **при кожному рендері**; callback-ref батька викликався 3 рази за 3 рендери (виміряно) — зайва робота.
Правило: завжди вказуй `deps` (як у `useMemo`).

## 4. `ref` як пропс (React 19)

Починаючи з React 19 функціональний компонент **отримує `ref` як звичайний пропс**; `forwardRef` більше не потрібен:
```jsx
function Fancy({ ref }) { useImperativeHandle(ref, () => ({ ... }), []); ... }
```
У React 18 без `forwardRef` пропс `ref` до компонента не потрапляє.

## 5. Коли використовувати

Тільки для **справді імперативних** дій: фокус, прокрутка, відтворення медіа, відкриття/закриття модалки, `reset` форми (коли не можна виразити пропсами). Використовуй **мінімум**: розкривай вузький API, а не весь DOM.

## 6. Коли НЕ використовувати

- Якщо дію можна виразити пропсом (`isOpen`, `value`, `autoFocus`) — роби декларативно. Імперативний API робить код складнішим для розуміння і тестування.
- Для передачі даних вгору — використовуй колбеки (`onChange`).

## 7. Типові помилки

1. Розкривати занадто багато (по суті повний DOM) — втрачається інкапсуляція.
2. Забути `deps` → перестворення при кожному рендері.
3. Використовувати замість пропсів для звичайного керування станом.
4. Забути `forwardRef` у React 18 (ref не прийде).
5. Викликати методи handle під час рендеру (там `ref.current` ще `null`): викликай в обробниках/ефектах.
6. Залежати від порядку ініціалізації: handle встановлюється в фазі layout.

## 8. Алгоритм

1. Дитина: `forwardRef` (18) або `ref` як пропс (19).
2. Внутрішній `useRef` для реального DOM.
3. `useImperativeHandle(ref, () => ({ методи }), [deps])`.
4. Батько: `ref.current?.метод()` в обробнику/ефекті.
5. Розглянь декларативну альтернативу (пропси) перш ніж вводити імперативний API.

## Задачі для закріплення

9 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Кожен фрагмент — тіло асинхронної функції, відповідь — значення, яке воно повертає. У прикладах `mount(el)` монтує елемент через `act`, `press(r)` викликає `onClick` кнопки, `text(r)` повертає текст результату; `create` і `act` беруться з `react-test-renderer`, `renderToString` — з `react-dom/server`, хуки — з `react`.

### Рівень 1. Основи

**1.** Що отримує батько через `ref`, коли дитина використовує `useImperativeHandle`?

```jsx
const Kid = forwardRef(function Kid(props, ref) { useImperativeHandle(ref, () => ({ hello: () => 'hi', secret: undefined }), []); return <p>k</p>; });
let got; function P() { const r = useRef(null); useEffect(() => { got = Object.keys(r.current).sort(); }, []); return <Kid ref={r} />; }
await mount(<P />);
return got;
```

**2.** Виклик методу дитини з батька.

```jsx
const Kid = forwardRef(function Kid(props, ref) { const [n, setN] = useState(0); useImperativeHandle(ref, () => ({ inc: () => setN(x => x + 1) }), []); return <p>{n}</p>; });
let h; function P() { const r = useRef(null); h = r; return <Kid ref={r} />; }
const t = await mount(<P />);
await act(async () => { h.current.inc(); h.current.inc(); });
return text(t);
```

**3.** React 19: `ref` як звичайний prop (без forwardRef).

```jsx
function Kid({ ref }) { useImperativeHandle(ref, () => ({ id: 7 }), []); return <p>k</p>; }
let got; function P() { const r = useRef(null); useEffect(() => { got = r.current.id; }, []); return <Kid ref={r} />; }
await mount(<P />);
return got;
```

### Рівень 2. Деталі й поведінка

**4.** Чи оновлюється handle, якщо залежності змінилися?

```jsx
const Kid = forwardRef(function Kid({ v }, ref) { useImperativeHandle(ref, () => ({ get: () => v }), [v]); return <p>{v}</p>; });
let h; function P({ v }) { const r = useRef(null); h = r; return <Kid ref={r} v={v} />; }
const t = await mount(<P v={1} />);
const a = h.current.get();
await act(async () => { t.update(<P v={2} />); });
return [a, h.current.get()];
```

**5.** А без залежностей-масиву (застаріле значення при `[]`).

```jsx
const Kid = forwardRef(function Kid({ v }, ref) { useImperativeHandle(ref, () => ({ get: () => v }), []); return <p>{v}</p>; });
let h; function P({ v }) { const r = useRef(null); h = r; return <Kid ref={r} v={v} />; }
const t = await mount(<P v={1} />);
await act(async () => { t.update(<P v={2} />); });
return h.current.get();
```

**6.** Що буде з `ref.current` після розмонтування дитини?

```jsx
const Kid = forwardRef(function Kid(props, ref) { useImperativeHandle(ref, () => ({ a: 1 }), []); return <p>k</p>; });
let h; function P({ show }) { const r = useRef(null); h = r; return show ? <Kid ref={r} /> : null; }
const t = await mount(<P show={true} />);
const a = h.current !== null;
await act(async () => { t.update(<P show={false} />); });
return [a, h.current];
```

### Рівень 3. Нюанси та пастки

**7.** Обмежений API: чи видно DOM-вузол батькові?

```jsx
const Kid = forwardRef(function Kid(props, ref) { useImperativeHandle(ref, () => ({ focus() { return 'focused'; } }), []); return <input />; });
let h; function P() { const r = useRef(null); h = r; return <Kid ref={r} />; }
await mount(<P />);
return [Object.keys(h.current), typeof h.current.focus];
```

**8.** Для чого `useImperativeHandle`?

**9.** Коли слід уникати імперативного API?

### Відповіді

1. `['hello', 'secret']`
2. `'2'`
3. `7`
4. `[1, 2]`
5. `1`
6. `[true, null]`
7. `[['focus'], 'function']`
8. Дозволяє дитині відкрити батьківському компоненту через `ref` лише обмежений набір імперативних методів замість всього DOM-вузла
9. Коли ту саму задачу можна розв'язати декларативно через пропси й стан; імперативний API — виняток (фокус, прокрутка, медіа)
