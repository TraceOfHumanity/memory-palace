# React: `useEffect`

## Загальна характеристика

`useEffect` — хук React для **побічних ефектів**: усього, що виходить за межі чистого обчислення JSX. Це запити до сервера, підписки, таймери, ручна робота з DOM, синхронізація із зовнішньою системою. Тіло компонента має залишатися чистою функцією від пропсів і стану, а все «нечисте» виносять в ефект.

Сигнатура:

```jsx
useEffect(setup, dependencies?)
```

- `setup` — функція, що виконується **після** рендеру; може повернути функцію очищення (cleanup);
- `dependencies` — масив значень, що визначає, **коли** ефект перезапускається (розділ 3).

Головне правило: ефект виконується після того, як React оновив DOM (у браузері — асинхронно, після малювання екрана), а не під час самого рендеру. Тому в ефекті вже можна читати актуальний DOM.

## Як запускати приклади

Приклади виконуються в звичайному Node.js без браузера й без JSX (замість нього `React.createElement`). Для цього використано справжній React та `react-test-renderer`: це дозволяє перевірити реальну поведінку ефектів. Для розділу про Strict Mode додатково потрібні `react-dom` та `jsdom`, бо подвійний виклик ефектів відтворюється лише в `react-dom/client`.

```bash
npm install --save-dev react@18 react-dom@18 react-test-renderer@18 jsdom
```

Використано версію 18, оскільки в React 19 пакет `react-test-renderer` позначено застарілим. Функція `act()` гарантує, що всі ефекти встигли відпрацювати перед наступним рядком. Усі блоки коду нижче, склеєні по порядку, утворюють один робочий скрипт.

```js
globalThis.IS_REACT_ACT_ENVIRONMENT = true; // прибирає службове попередження test-renderer'а
const React = require("react");
const TestRenderer = require("react-test-renderer");
const { act } = TestRenderer;
```

Відповідність операцій тестового рендерера подіям на справжній сторінці:

| Виклик | Що відбувається у застосунку |
|---|---|
| `TestRenderer.create(...)` | перше монтування компонента |
| `renderer.update(...)` | перерендер (зміна пропсів чи стану) |
| `renderer.unmount()` | розмонтування |

## 1. Проблема: побічний ефект прямо в тілі компонента

Не варто викликати «нечистий» код під час рендеру:

```jsx
function BadClock() {
  document.title = new Date().toString(); // побічний ефект під час рендеру
  return React.createElement("div", null, "...");
}
```

Проблеми:

- React може рендерити компонент кілька разів до фактичного відображення (конкурентний режим, Strict Mode), тож «нечистий» код виконається зайві рази;
- такий код неможливо прибрати (cleanup) або відкласти до моменту, коли DOM справді готовий.

## 2. Базовий приклад: ефект виконується після рендеру

```js
function Greeting({ name }) {
  console.log(`  render: Greeting(${name})`);
  React.useEffect(() => {
    console.log(`  effect: greeted ${name}`);
  });
  return React.createElement("div", null, `Hello, ${name}`);
}

let renderer;
act(() => {
  renderer = TestRenderer.create(React.createElement(Greeting, { name: "Alice" }));
});
// render: Greeting(Alice)
// effect: greeted Alice

console.log(renderer.toJSON().children); // [ 'Hello, Alice' ] — DOM уже оновлено до запуску ефекту
```

Порядок незмінний: спочатку рендер (обчислення JSX), потім ефект.

## 3. Масив залежностей: коли ефект перезапускається

Порівняння значень у масиві виконується через `Object.is`, тобто для об'єктів і функцій — за посиланням.

### 3.1. Без другого аргументу

Ефект виконується після **кожного** рендеру, навіть якщо значення не змінилося:

```js
function EveryRender({ value }) {
  React.useEffect(() => {
    console.log(`  [no deps] effect, value=${value}`);
  });
  return React.createElement("div", null, value);
}
let r1;
act(() => { r1 = TestRenderer.create(React.createElement(EveryRender, { value: 1 })); }); // [no deps] effect, value=1
act(() => { r1.update(React.createElement(EveryRender, { value: 1 })); }); // те саме значення — [no deps] effect, value=1
```

Ефект повторився попри те, що значення не змінилося.

### 3.2. Порожній масив `[]`

Ефект виконується **лише один раз**, при монтуванні:

```js
function OnMountOnly() {
  React.useEffect(() => {
    console.log("  [deps: []] mount only");
  }, []);
  return React.createElement("div", null, "mounted");
}
let r2;
act(() => { r2 = TestRenderer.create(React.createElement(OnMountOnly)); }); // [deps: []] mount only
act(() => { r2.update(React.createElement(OnMountOnly)); }); // перерендер...
console.log("  (OnMountOnly re-rendered, no new log)"); // ...а логу немає
```

### 3.3. Масив зі значеннями

Ефект перезапускається, лише коли змінилося **хоча б одне** зі значень:

```js
function DependsOnCount({ count, label }) {
  React.useEffect(() => {
    console.log(`  [deps: count] effect for count=${count}`);
  }, [count]); // label не у списку: його зміна ефект не перезапустить
  return React.createElement("div", null, `${label}: ${count}`);
}
let r3;
act(() => { r3 = TestRenderer.create(React.createElement(DependsOnCount, { count: 0, label: "Counter" })); }); // [deps: count] effect for count=0
act(() => { r3.update(React.createElement(DependsOnCount, { count: 0, label: "Other label" })); });
console.log("  (label changed, count did not: effect did NOT rerun)");
act(() => { r3.update(React.createElement(DependsOnCount, { count: 1, label: "Other label" })); }); // [deps: count] effect for count=1
```

## 4. Функція очищення (cleanup)

Якщо `setup` повертає функцію, React викликає її:

1. **перед** повторним запуском ефекту, коли змінилися залежності;
2. при **розмонтуванні** компонента.

Це запобігає витокам: таймери, підписки й слухачі подій, які «пережили» б компонент, якщо їх не прибрати.

```js
function TimerLabel({ seconds }) {
  React.useEffect(() => {
    console.log(`  effect: subscribed to seconds=${seconds}`);
    return () => console.log(`  cleanup: unsubscribed from seconds=${seconds}`);
  }, [seconds]);
  return React.createElement("div", null, `${seconds}s`);
}

let r4;
act(() => { r4 = TestRenderer.create(React.createElement(TimerLabel, { seconds: 0 })); }); // effect: subscribed to seconds=0
act(() => { r4.update(React.createElement(TimerLabel, { seconds: 1 })); });
// cleanup: unsubscribed from seconds=0
// effect: subscribed to seconds=1
act(() => { r4.unmount(); }); // cleanup: unsubscribed from seconds=1
```

При оновленні спочатку виконується очищення **старого** ефекту, потім запускається новий; при розмонтуванні очищується останній.

Типовий практичний випадок — підписка на зовнішнє джерело (`window.addEventListener`, WebSocket, `EventEmitter`). Тут замість `window` використано `EventEmitter` з Node.js, оскільки браузера немає:

```js
function useWindowResizeCount() {
  const bus = React.useRef(new (require("node:events").EventEmitter)()).current;
  const [size, setSize] = React.useState(0);
  React.useEffect(() => {
    const handleResize = (w) => setSize(w);
    bus.on("resize", handleResize);
    console.log("  useWindowResizeCount: subscribed to 'resize'");
    return () => {
      bus.off("resize", handleResize);
      console.log("  useWindowResizeCount: unsubscribed from 'resize'");
    };
  }, [bus]);
  return { size, bus };
}
```

Цей хук лише оголошено, тому він нічого не виводить: у нотатці він потрібен як шаблон «підписка + відписка в cleanup».

## 5. Strict Mode: ефект може виконатися двічі в режимі розробки

У режимі розробки (не в production-збірці) `React.StrictMode` навмисно монтує компонент, одразу розмонтовує й монтує знову. Мета — виявити ефекти без коректного cleanup. Якщо ефект написаний правильно (cleanup повністю «відкочує» setup), подвійний виклик користувач не помітить. Якщо ні, помилка проявиться ще під час розробки.

`react-test-renderer` цієї поведінки **не відтворює**: подвійний виклик реалізовано лише в `react-dom/client`. Тому для цього прикладу піднімаємо справжній DOM через `jsdom`:

```js
const { JSDOM } = require("jsdom");
const dom = new JSDOM('<div id="root"></div>');
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
const { createRoot } = require("react-dom/client");

let strictCalls = 0;
function StrictChild() {
  React.useEffect(() => {
    strictCalls++;
    return () => {}; // коректний cleanup — порожній, бо нічого не підписували
  }, []);
  return null;
}
const strictRoot = createRoot(document.getElementById("root"));
act(() => {
  strictRoot.render(
    React.createElement(React.StrictMode, null, React.createElement(StrictChild)),
  );
});
console.log(strictCalls); // 2
```

У Strict Mode ефект монтування спрацював двічі (setup → cleanup → setup). Без `StrictMode`, як у прикладах вище, було б `1`.

## 6. Пастка: застарілі значення в замиканні (stale closure)

Ефект — це замикання (див. нотатку про closures): він «запам'ятовує» пропси й стан **на момент свого створення**. Якщо значення, яке використовується всередині, відсутнє в масиві залежностей, ефект бачитиме застаріле значення, доки не перезапуститься сам.

```js
function StaleLogger({ value }) {
  React.useEffect(() => {
    console.log(`  [stale example] sees value=${value}`); // value відсутній у deps
  }, []); // ефект створюється один раз і «застигає» на першому value
  return null;
}
let r5;
act(() => { r5 = TestRenderer.create(React.createElement(StaleLogger, { value: "first" })); }); // [stale example] sees value=first
act(() => { r5.update(React.createElement(StaleLogger, { value: "second" })); });
console.log("  (no new log — effect did not rerun and does not see 'second')");
```

Виправлення — чесно вказати залежність:

```js
function FreshLogger({ value }) {
  React.useEffect(() => {
    console.log(`  [fresh example] sees value=${value}`);
  }, [value]); // тепер ефект перезапускається й бачить актуальне value
  return null;
}
let r6;
act(() => { r6 = TestRenderer.create(React.createElement(FreshLogger, { value: "first" })); }); // [fresh example] sees value=first
act(() => { r6.update(React.createElement(FreshLogger, { value: "second" })); }); // [fresh example] sees value=second
```

Лінтер `eslint-plugin-react-hooks` (правило `exhaustive-deps`) саме для цього й існує: він попереджає про значення, які використано всередині ефекту, але не вказано в масиві залежностей. Ігнорувати це попередження, щоб «не перезапускалося», — типова причина багів через stale closure.

## 7. Пастка: нестабільні залежності (об'єкти та функції)

Масив, об'єкт чи функція, створені прямо в тілі компонента, — це **нове посилання на кожен рендер**, навіть якщо вміст той самий. Оскільки порівняння в `deps` іде за `Object.is`, ефект перезапускатиметься щоразу.

```js
function UnstableDeps({ id }) {
  const options = { id }; // нове посилання при кожному рендері
  React.useEffect(() => {
    console.log(`  [unstable obj] effect for id=${options.id}`);
  }, [options]); // options завжди «змінився» — ефект спрацює щоразу
  return null;
}
let r7;
act(() => { r7 = TestRenderer.create(React.createElement(UnstableDeps, { id: 1 })); }); // [unstable obj] effect for id=1
act(() => { r7.update(React.createElement(UnstableDeps, { id: 1 })); }); // те саме id — [unstable obj] effect for id=1
```

Ефект повторився попри однакове `id`. Виправлення — залежати від **примітивного значення**, а не від обгортки:

```js
function StableDeps({ id }) {
  React.useEffect(() => {
    console.log(`  [stable primitive] effect for id=${id}`);
  }, [id]); // число id порівнюється за значенням
  return null;
}
let r8;
act(() => { r8 = TestRenderer.create(React.createElement(StableDeps, { id: 1 })); }); // [stable primitive] effect for id=1
act(() => { r8.update(React.createElement(StableDeps, { id: 1 })); });
console.log("  (id unchanged — effect correctly did NOT rerun)");
```

Функції-колбеки й об'єкти, які справді потрібно стабілізувати (наприклад, як пропс для дочірнього компонента), стабілізують хуками `useCallback` та `useMemo` — це окрема тема.

## 8. Пастка: `setState` в ефекті без умови

Якщо ефект оновлює стан, від якого сам залежить, без жодної умови, кожен `setState` спричиняє новий рендер, той — новий запуск ефекту, і так по колу. Нижче цикл зупиняється умовою `count < 3`; без неї рендер завис би:

```js
function InfiniteLoopRisk() {
  const [count, setCount] = React.useState(0);
  React.useEffect(() => {
    if (count < 3) setCount((c) => c + 1); // без умови це був би нескінченний цикл
  }); // без масиву залежностей — після кожного рендеру
  return React.createElement("div", null, count);
}
let r9;
act(() => { r9 = TestRenderer.create(React.createElement(InfiniteLoopRisk)); });
console.log(r9.toJSON().children); // [ '3' ]
```

Якщо стан потрібно оновити один раз при монтуванні, використовують `[]`. Якщо значення залежить від пропса, його обчислюють прямо під час рендеру (розділ 9), а не через ефект.

## 9. Коли `useEffect` не потрібен

Найчастіша помилка початківців — синхронізувати один стан з іншим через ефект. Це створює зайвий рендер і затримку на кадр:

```jsx
const [firstName, setFirstName] = useState("Jane");
const [fullName, setFullName] = useState("");
useEffect(() => { setFullName(firstName + " Doe"); }, [firstName]);
```

Якщо значення можна обчислити прямо під час рендеру, його обчислюють там — без `useEffect` і без окремого стану:

```js
function DerivedName({ firstName }) {
  const fullName = `${firstName} Doe`; // звичайна змінна, не useState
  return React.createElement("div", null, fullName);
}
let r10;
act(() => { r10 = TestRenderer.create(React.createElement(DerivedName, { firstName: "Alice" })); });
console.log(r10.toJSON().children); // [ 'Alice Doe' ]
```

`useEffect` потрібен для **синхронізації із зовнішніми системами**: DOM API, мережеві запити, таймери, підписки, сторонні бібліотеки — усе, чого React сам не контролює. Дані, похідні від пропсів і стану, обчислюють у тілі функції або через `useMemo`, якщо обчислення дороге.

## Підсумок

- `useEffect(setup, deps?)` — хук для побічних ефектів; виконується після рендеру, а не під час нього.
- Масив залежностей визначає частоту запуску: без нього — після кожного рендеру; `[]` — лише при монтуванні; `[a, b]` — коли змінилося `a` або `b` (порівняння через `Object.is`, тобто об'єкти й функції — за посиланням).
- `setup` може повернути cleanup: він виконується перед наступним запуском ефекту й при розмонтуванні; саме там відписуються від подій і скасовують таймери й запити.
- `React.StrictMode` у режимі розробки навмисно монтує, розмонтовує й монтує компонент удруге, щоб виявити ефекти без коректного cleanup.
- Пастка stale closure: забуте в `deps` значення лишається застарілим; лінтер `exhaustive-deps` це виявляє.
- Пастка нестабільних залежностей: об'єкт, масив чи функція, створені в тілі компонента, — нове посилання щорендера, тому залежіть від примітивів.
- Пастка нескінченного циклу: `setState` в ефекті без умови й правильних `deps` перезапускає сам себе.
- Не використовуйте `useEffect` + `useState` для значення, яке можна обчислити прямо під час рендеру; ефект призначений для синхронізації із зовнішнім світом.


## 10. Додатково (перевірено на React 18.3.1): порядок, залежності, пастки

### 10.1. Порядок усіх ефектів (реальний вивід)
Mount `Parent > Child`: `render parent | render child` → `child insertion | parent insertion` → `child layout | parent layout` → `child effect | parent effect`.
Unmount: `parent insertion cleanup | parent layout cleanup | child insertion cleanup | child layout cleanup` → `parent effect cleanup | child effect cleanup`.
Update: спершу cleanups, потім setup (усі passive-cleanups попереду всіх passive-setup). Дитина — раніше за батька. Детально: [hooks/useLayoutEffect.md](hooks/useLayoutEffect.md).

### 10.2. Три форми залежностей
Три `useEffect` у компоненті: без масиву, `[]`, `[a]`.
- mount → `effect none | effect [] | effect [a]`;
- змінився лише `b` → `effect none` (тільки той, що без масиву);
- змінився `a` → `effect none | effect [a]`.

### 10.3. Strict Mode
`render | render | effect setup | effect cleanup | effect setup` — компонент рендериться двічі, ефект: setup → cleanup → setup (імітація розмонтування для перевірки cleanup).

### 10.4. Застарілі значення з `[]`
`setInterval(() => setN(n + 1), 10)` з `[]`: 4 тіки поспіль — усі бачать `n = 0`. Рішення: `setN(x => x + 1)` або `n` у залежностях (з перезапуском таймера).

### 10.5. Гонка запитів і cleanup
Запит `a` (30 мс) змінили на `b` (5 мс). З прапорцем у cleanup: `resolved data-b applied=true | resolved data-a applied=false` — застарілу відповідь відкинуто. Без нього відповідь `a` перезаписала б `b`. Сучасніше — `AbortController` (`fetch(url, { signal })` + `controller.abort()` у cleanup).

### 10.6. `async` функція як ефект
`useEffect(async () => {}, [])` → попередження `must not return anything besides a function, which is used for clean-up` (async повертає проміс). Рішення: оголосити `async` функцію всередині й викликати її.

### 10.7. Нескінченний цикл
`useEffect(() => { setN(n + 1); })` без залежностей → `Warning: Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either doesn't have a dependency array, or one of the dependencies changes on every render.` Під `act` у тесті процес вичерпує пам'ять.

### 10.8. Об'єкт у залежностях
`const o = { a: 1 }; useEffect(..., [o])` — ефект виконався **3 рази за 3 рендери** (новий об'єкт щоразу). Виносити об'єкт за межі компонента, `useMemo` або залежати від примітивів.

### 10.9. Ефект і `setState` у ньому
`setN(n + 1)` в ефекті з `[n]` і умовою `n < 1`: `render 0 | effect 0 | render 1 | effect 1` — оновлення з ефекту породжує другий рендер.

## Задачі для закріплення

14 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Кожен фрагмент — тіло асинхронної функції, відповідь — значення, яке воно повертає. У прикладах `mount(el)` монтує елемент через `act`, `press(r)` викликає `onClick` кнопки, `text(r)` повертає текст результату; `create` і `act` беруться з `react-test-renderer`, `renderToString` — з `react-dom/server`, хуки — з `react`.

### Рівень 1. Основи

**1.** У якому порядку виконуються рендер та ефект?

```jsx
const log = [];
function C() { log.push('render'); useEffect(() => { log.push('effect'); return () => log.push('cleanup'); }); return <p>x</p>; }
const t = await mount(<C />);
await act(async () => { t.update(<C />); });
await act(async () => { t.unmount(); });
return log;
```

**2.** Порожній масив залежностей: скільки разів ефект?

```jsx
let n = 0;
function C({ v }) { useEffect(() => { n++; }, []); return <p>{v}</p>; }
const t = await mount(<C v={1} />);
await act(async () => { t.update(<C v={2} />); });
await act(async () => { t.update(<C v={3} />); });
return n;
```

**3.** Залежність від пропса: ефект запускається при зміні?

```jsx
const log = [];
function C({ v, other }) { useEffect(() => { log.push(v); }, [v]); return <p>{v}{other}</p>; }
const t = await mount(<C v={1} other={0} />);
await act(async () => { t.update(<C v={1} other={1} />); });
await act(async () => { t.update(<C v={2} other={1} />); });
return log;
```

**4.** Cleanup перед наступним ефектом.

```jsx
const log = [];
function C({ v }) { useEffect(() => { log.push('run ' + v); return () => log.push('clean ' + v); }, [v]); return <p>{v}</p>; }
const t = await mount(<C v={1} />);
await act(async () => { t.update(<C v={2} />); });
return log;
```

### Рівень 2. Деталі й поведінка

**5.** StrictMode: подвійний запуск ефекту у розробці.

```jsx
const log = [];
function C() { useEffect(() => { log.push('mount'); return () => log.push('cleanup'); }, []); return <p>x</p>; }
await mount(<React.StrictMode><C /></React.StrictMode>);
return log;
```

**6.** Об'єкт у залежностях створюється заново: скільки запусків?

```jsx
let n = 0;
function C() { const o = { a: 1 }; useEffect(() => { n++; }, [o]); return <p>x</p>; }
const t = await mount(<C />);
await act(async () => { t.update(<C />); });
await act(async () => { t.update(<C />); });
return n;
```

**7.** Замикання в ефекті бачить застарілий стан (stale closure).

```jsx
const seen = [];
function C() { const [n, setN] = useState(0); useEffect(() => { const id = setInterval(() => seen.push(n), 5); return () => clearInterval(id); }, []); return <button onClick={() => setN(n + 1)}>{n}</button>; }
const t = await mount(<C />);
await press(t); await press(t);
await act(async () => { await new Promise(r => setTimeout(r, 30)); });
await act(async () => { t.unmount(); });
return [...new Set(seen)];
```

**8.** Виправлення через функціональне оновлення без залежності від стану.

```jsx
function C() { const [n, setN] = useState(0); useEffect(() => { const id = setInterval(() => setN(p => p + 1), 5); return () => clearInterval(id); }, []); return <p>{n > 2 ? 'grew' : 'init'}</p>; }
const t = await mount(<C />);
await act(async () => { await new Promise(r => setTimeout(r, 60)); });
const r = text(t);
await act(async () => { t.unmount(); });
return r;
```

### Рівень 3. Нюанси та пастки

**9.** Ефект не виконується при серверному рендері.

```jsx
let ran = false;
function C() { useEffect(() => { ran = true; }, []); return <p>ssr</p>; }
const html = renderToString(<C />);
return [html, ran];
```

**10.** Завантаження даних: стан loading → data та скасування застарілої відповіді.

```jsx
const delays = { a: 20, b: 5 };
function C({ id }) {
  const [d, setD] = useState('...');
  useEffect(() => { let off = false; new Promise(r => setTimeout(() => r('data-' + id), delays[id])).then(v => { if (!off) setD(v); }); return () => { off = true; }; }, [id]);
  return <p>{d}</p>;
}
const t = await mount(<C id="a" />);
await act(async () => { t.update(<C id="b" />); });
await act(async () => { await new Promise(r => setTimeout(r, 50)); });
return text(t);
```

**11.** `useEffect` без масиву залежностей: скільки разів при 3 рендерах?

```jsx
let n = 0;
function C({ v }) { useEffect(() => { n++; }); return <p>{v}</p>; }
const t = await mount(<C v={1} />);
await act(async () => { t.update(<C v={2} />); });
await act(async () => { t.update(<C v={3} />); });
return n;
```

**12.** Нескінченний цикл: чому `setState` в ефекті без залежностей небезпечний? (скільки рендерів до обмеження)

```jsx
let renders = 0;
function C() { renders++; const [n, setN] = useState(0); useEffect(() => { if (n < 5) setN(n + 1); }); return <p>{n}</p>; }
const t = await mount(<C />);
return [text(t), renders];
```

### Рівень 4. Практика

**13.** Чим ефект відрізняється від обробника подій?

**14.** Навіщо cleanup-функція?

### Відповіді

1. `['render', 'effect', 'render', 'cleanup', 'effect', 'cleanup']`
2. `1`
3. `[1, 2]`
4. `['run 1', 'clean 1', 'run 2']`
5. `['mount', 'cleanup', 'mount']`
6. `3`
7. `[0]`
8. `'grew'`
9. `['<p>ssr</p>', false]`
10. `'data-b'`
11. `3`
12. `['5', 6]`
13. Ефект синхронізує компонент із зовнішньою системою після рендеру і виконується, коли змінюються залежності; обробник виконується у відповідь на конкретну дію користувача
14. Скасовує підписки, таймери та запити від попереднього ефекту перед повторним запуском і при розмонтуванні, щоб уникнути витоків і застарілих оновлень
