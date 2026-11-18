# React 19.2: `useEffectEvent`

Виміряно на React 19.3.1 (`react-dom` + `jsdom`; у `React` експортується як `useEffectEvent`).

## 1. Проблема

У `useEffect` **усе реактивне, що читається, має бути в залежностях**. Але іноді в ефекті є частина, яка має читати **найсвіжіші** значення **без перезапуску ефекту** при їх зміні:

```jsx
useEffect(() => {
  const conn = connect(url);
  conn.on("connected", () => showToast("Connected", theme));   // theme потрібна свіжа
  return () => conn.disconnect();
}, [url, theme]);   // ✗ зміна theme перепідключає з'єднання!
```
Додаєш `theme` у залежності → зайве перепідключення. Прибираєш → застаріла `theme` (stale closure) і порушення правила лінтера.

## 2. Рішення: `useEffectEvent`

```jsx
const onConnected = useEffectEvent(() => { showToast("Connected", theme); });
useEffect(() => {
  const conn = connect(url);
  conn.on("connected", () => onConnected());
  return () => conn.disconnect();
}, [url]);                     // тільки реальні залежності
```
`useEffectEvent(fn)` повертає **функцію-подію (Effect Event)**, яка:
- **завжди бачить найсвіжіші** пропси/стан (читає їх «в момент виклику»);
- **не реактивна** — її не треба (і **не можна**) додавати до масиву залежностей;
- може викликатись **лише з ефектів** (і з інших Effect Event'ів), не під час рендеру і не передаватись іншим компонентам.

## 3. Як це виконується (реальний вивід)

Три рендери: `url a/theme light` → `a/dark` → `b/dark`; ефект залежить лише від `[url]`.
```
effect for a | connected a theme=light | cleanup a | effect for b | connected b theme=dark
```
- Зміна `theme` (2-й рендер) **не перезапустила** ефект (немає `cleanup`/нового `effect`);
- зміна `url` перезапустила: cleanup `a`, новий ефект для `b`, а Effect Event побачив **актуальну** `theme=dark`.

## 4. Правила

1. Викликай Effect Event лише **всередині** `useEffect`/`useLayoutEffect`/`useInsertionEffect` (або іншого Effect Event).
2. **Не передавай** його як пропс/у залежності/в інші хуки.
3. Усе, що має **перезапускати** ефект (`url`, `roomId`) — лишається в залежностях; Effect Event — для **«що робити, коли щось сталось»**, а не «коли синхронізуватись».
4. Лінтер `react-hooks` (нова версія) розуміє `useEffectEvent` і не вимагає його в deps.

## 5. Що було раніше

До `useEffectEvent` використовували патерн «найсвіжіший ref»: `const latest = useRef(fn); latest.current = fn;` — те саме вручну. `useEffectEvent` робить це офіційно й безпечно.

## 6. Типові помилки

1. Викликати Effect Event під час рендеру або в обробнику подій (там не потрібен — обробники й так свіжі).
2. Передавати його дочірньому компоненту.
3. Прибирати з deps значення, яке **має** перезапускати ефект (щоб «виправити» лінтер) — це маскує помилку.
4. Додавати Effect Event у масив залежностей.
5. Використовувати для логіки, що має бути реактивною (синхронізація із зовнішньою системою).

## 7. Алгоритм

1. Ефект перезапускається занадто часто через значення, яке він лише «читає в момент події»?
2. Винеси цю частину в `const onSomething = useEffectEvent(() => { ... })`.
3. У ефекті викликай `onSomething()`.
4. Залиш у `deps` лише те, що реально має запускати ефект заново.

## Задачі для закріплення

7 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Кожен фрагмент — тіло асинхронної функції, відповідь — значення, яке воно повертає. У прикладах `mount(el)` монтує елемент через `act`, `press(r)` викликає `onClick` кнопки, `text(r)` повертає текст результату; `create` і `act` беруться з `react-test-renderer`, `renderToString` — з `react-dom/server`, хуки — з `react`.

### Рівень 1. Основи

**1.** Подія-ефект бачить актуальні значення без перезапуску ефекту.

```jsx
const log = [];
function C({ url, theme }) { const onConnected = useEffectEvent(() => log.push(url + ':' + theme)); useEffect(() => { onConnected(); }, [url]); return <p>{url}</p>; }
const t = await mount(<C url="a" theme="light" />);
await act(async () => { t.update(<C url="a" theme="dark" />); });
await act(async () => { t.update(<C url="b" theme="dark" />); });
return log;
```

**2.** Скільки разів запуститься ефект при зміні лише `theme`?

```jsx
let runs = 0;
function C({ url, theme }) { const e = useEffectEvent(() => theme); useEffect(() => { runs++; e(); }, [url]); return <p>{url}</p>; }
const t = await mount(<C url="a" theme="1" />);
await act(async () => { t.update(<C url="a" theme="2" />); });
await act(async () => { t.update(<C url="a" theme="3" />); });
return runs;
```

### Рівень 2. Деталі й поведінка

**3.** Звичайний колбек у залежностях: скільки запусків?

```jsx
let runs = 0;
function C({ url, theme }) { const f = () => theme; useEffect(() => { runs++; f(); }, [url, f]); return <p>{url}</p>; }
const t = await mount(<C url="a" theme="1" />);
await act(async () => { t.update(<C url="a" theme="2" />); });
await act(async () => { t.update(<C url="a" theme="3" />); });
return runs;
```

**4.** Чи стабільне посилання на функцію з `useEffectEvent` між рендерами?

```jsx
const seen = new Set();
function C({ n }) { const e = useEffectEvent(() => n); seen.add(e); return <p>{n}</p>; }
const t = await mount(<C n={1} />);
await act(async () => { t.update(<C n={2} />); });
return seen.size;
```

### Рівень 3. Нюанси та пастки

**5.** Чи можна викликати подію-ефект під час рендеру?

```jsx
function C() { const e = useEffectEvent(() => 1); let r = 'ok'; try { e(); } catch (x) { r = x.message.slice(0, 40); } return <p>{r}</p>; }
const orig = console.error; console.error = () => {};
let out; try { out = renderToString(<C />); } catch (x) { out = 'throw'; }
console.error = orig;
return out;
```

**6.** Яку проблему вирішує `useEffectEvent`?

### Рівень 4. Практика

**7.** Яке обмеження має така функція?

### Відповіді

1. `['a:light', 'b:dark']`
2. `1`
3. `3`
4. `2`
5. `'<p>A function wrapped in useEffectEvent can</p>'`
6. Дозволяє ефекту читати актуальні пропси/стан, не роблячи їх залежностями й не перезапускаючи ефект
7. Її можна викликати лише з ефектів (і інших подій-ефектів), не під час рендеру й не передавати іншим компонентам чи хукам
