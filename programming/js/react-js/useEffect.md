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
