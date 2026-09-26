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
  console.log(`  рендер: Greeting(${name})`);
  React.useEffect(() => {
    console.log(`  ефект: привітали ${name}`);
  });
  return React.createElement("div", null, `Привіт, ${name}`);
}

let renderer;
act(() => {
  renderer = TestRenderer.create(React.createElement(Greeting, { name: "Оля" }));
});

console.log(renderer.toJSON().children); // DOM уже оновлено до запуску ефекту
```

```text
  рендер: Greeting(Оля)
  ефект: привітали Оля
[ 'Привіт, Оля' ]
```

Порядок незмінний: спочатку рендер (обчислення JSX), потім ефект.

## 3. Масив залежностей: коли ефект перезапускається

Порівняння значень у масиві виконується через `Object.is`, тобто для об'єктів і функцій — за посиланням.

### 3.1. Без другого аргументу

Ефект виконується після **кожного** рендеру, навіть якщо значення не змінилося:

```js
function EveryRender({ value }) {
  React.useEffect(() => {
    console.log(`  [без deps] ефект, value=${value}`);
  });
  return React.createElement("div", null, value);
}
let r1;
act(() => { r1 = TestRenderer.create(React.createElement(EveryRender, { value: 1 })); });
act(() => { r1.update(React.createElement(EveryRender, { value: 1 })); }); // те саме значення
```

```text
  [без deps] ефект, value=1
  [без deps] ефект, value=1
```

Ефект повторився попри те, що значення не змінилося.

### 3.2. Порожній масив `[]`

Ефект виконується **лише один раз**, при монтуванні:

```js
function OnMountOnly() {
  React.useEffect(() => {
    console.log("  [deps: []] лише при монтуванні");
  }, []);
  return React.createElement("div", null, "mounted");
}
let r2;
act(() => { r2 = TestRenderer.create(React.createElement(OnMountOnly)); });
act(() => { r2.update(React.createElement(OnMountOnly)); }); // перерендер...
console.log("  (перерендер OnMountOnly без нового логу)"); // ...а логу немає
```

```text
  [deps: []] лише при монтуванні
  (перерендер OnMountOnly без нового логу)
```

### 3.3. Масив зі значеннями

Ефект перезапускається, лише коли змінилося **хоча б одне** зі значень:

```js
function DependsOnCount({ count, label }) {
  React.useEffect(() => {
    console.log(`  [deps: count] ефект для count=${count}`);
  }, [count]); // label не у списку: його зміна ефект не перезапустить
  return React.createElement("div", null, `${label}: ${count}`);
}
let r3;
act(() => { r3 = TestRenderer.create(React.createElement(DependsOnCount, { count: 0, label: "Рахунок" })); });
act(() => { r3.update(React.createElement(DependsOnCount, { count: 0, label: "Інший підпис" })); });
console.log("  (label змінився, count — ні: ефект НЕ повторився)");
act(() => { r3.update(React.createElement(DependsOnCount, { count: 1, label: "Інший підпис" })); });
```

```text
  [deps: count] ефект для count=0
  (label змінився, count — ні: ефект НЕ повторився)
  [deps: count] ефект для count=1
```

## 4. Функція очищення (cleanup)

Якщо `setup` повертає функцію, React викликає її:

1. **перед** повторним запуском ефекту, коли змінилися залежності;
2. при **розмонтуванні** компонента.

Це запобігає витокам: таймери, підписки й слухачі подій, які «пережили» б компонент, якщо їх не прибрати.

```js
function TimerLabel({ seconds }) {
  React.useEffect(() => {
    console.log(`  ефект: підписались на seconds=${seconds}`);
    return () => console.log(`  cleanup: відписались від seconds=${seconds}`);
  }, [seconds]);
  return React.createElement("div", null, `${seconds}с`);
}

let r4;
act(() => { r4 = TestRenderer.create(React.createElement(TimerLabel, { seconds: 0 })); });
act(() => { r4.update(React.createElement(TimerLabel, { seconds: 1 })); });
act(() => { r4.unmount(); });
```

```text
  ефект: підписались на seconds=0
  cleanup: відписались від seconds=0
  ефект: підписались на seconds=1
  cleanup: відписались від seconds=1
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
    console.log("  useWindowResizeCount: підписались на 'resize'");
    return () => {
      bus.off("resize", handleResize);
      console.log("  useWindowResizeCount: відписались від 'resize'");
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
console.log(strictCalls);
```

```text
2
```

У Strict Mode ефект монтування спрацював двічі (setup → cleanup → setup). Без `StrictMode`, як у прикладах вище, було б `1`.

## 6. Пастка: застарілі значення в замиканні (stale closure)

Ефект — це замикання (див. нотатку про closures): він «запам'ятовує» пропси й стан **на момент свого створення**. Якщо значення, яке використовується всередині, відсутнє в масиві залежностей, ефект бачитиме застаріле значення, доки не перезапуститься сам.

```js
function StaleLogger({ value }) {
  React.useEffect(() => {
    console.log(`  [stale-приклад] бачу value=${value}`); // value відсутній у deps
  }, []); // ефект створюється один раз і «застигає» на першому value
  return null;
}
let r5;
act(() => { r5 = TestRenderer.create(React.createElement(StaleLogger, { value: "перше" })); });
act(() => { r5.update(React.createElement(StaleLogger, { value: "друге" })); });
console.log("  (жодного нового логу — ефект не перезапустився і не бачить 'друге')");
```

```text
  [stale-приклад] бачу value=перше
  (жодного нового логу — ефект не перезапустився і не бачить 'друге')
```

Виправлення — чесно вказати залежність:

```js
function FreshLogger({ value }) {
  React.useEffect(() => {
    console.log(`  [fresh-приклад] бачу value=${value}`);
  }, [value]); // тепер ефект перезапускається й бачить актуальне value
  return null;
}
let r6;
act(() => { r6 = TestRenderer.create(React.createElement(FreshLogger, { value: "перше" })); });
act(() => { r6.update(React.createElement(FreshLogger, { value: "друге" })); });
```

```text
  [fresh-приклад] бачу value=перше
  [fresh-приклад] бачу value=друге
```

Лінтер `eslint-plugin-react-hooks` (правило `exhaustive-deps`) саме для цього й існує: він попереджає про значення, які використано всередині ефекту, але не вказано в масиві залежностей. Ігнорувати це попередження, щоб «не перезапускалося», — типова причина багів через stale closure.

## 7. Пастка: нестабільні залежності (об'єкти та функції)

Масив, об'єкт чи функція, створені прямо в тілі компонента, — це **нове посилання на кожен рендер**, навіть якщо вміст той самий. Оскільки порівняння в `deps` іде за `Object.is`, ефект перезапускатиметься щоразу.

```js
function UnstableDeps({ id }) {
  const options = { id }; // нове посилання при кожному рендері
  React.useEffect(() => {
    console.log(`  [нестабільний obj] ефект для id=${options.id}`);
  }, [options]); // options завжди «змінився» — ефект спрацює щоразу
  return null;
}
let r7;
act(() => { r7 = TestRenderer.create(React.createElement(UnstableDeps, { id: 1 })); });
act(() => { r7.update(React.createElement(UnstableDeps, { id: 1 })); }); // те саме id
```

```text
  [нестабільний obj] ефект для id=1
  [нестабільний obj] ефект для id=1
```

Ефект повторився попри однакове `id`. Виправлення — залежати від **примітивного значення**, а не від обгортки:

```js
function StableDeps({ id }) {
  React.useEffect(() => {
    console.log(`  [стабільний примітив] ефект для id=${id}`);
  }, [id]); // число id порівнюється за значенням
  return null;
}
let r8;
act(() => { r8 = TestRenderer.create(React.createElement(StableDeps, { id: 1 })); });
act(() => { r8.update(React.createElement(StableDeps, { id: 1 })); });
console.log("  (id не змінився — ефект коректно НЕ повторився)");
```

```text
  [стабільний примітив] ефект для id=1
  (id не змінився — ефект коректно НЕ повторився)
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
console.log(r9.toJSON().children);
```

```text
[ '3' ]
```

Якщо стан потрібно оновити один раз при монтуванні, використовують `[]`. Якщо значення залежить від пропса, його обчислюють прямо під час рендеру (розділ 9), а не через ефект.

## 9. Коли `useEffect` не потрібен

Найчастіша помилка початківців — синхронізувати один стан з іншим через ефект. Це створює зайвий рендер і затримку на кадр:

```jsx
const [firstName, setFirstName] = useState("Оля");
const [fullName, setFullName] = useState("");
useEffect(() => { setFullName(firstName + " Коваль"); }, [firstName]);
```

Якщо значення можна обчислити прямо під час рендеру, його обчислюють там — без `useEffect` і без окремого стану:

```js
function DerivedName({ firstName }) {
  const fullName = `${firstName} Коваль`; // звичайна змінна, не useState
  return React.createElement("div", null, fullName);
}
let r10;
act(() => { r10 = TestRenderer.create(React.createElement(DerivedName, { firstName: "Марія" })); });
console.log(r10.toJSON().children);
```

```text
[ 'Марія Коваль' ]
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
