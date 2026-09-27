# React: реактивність

## Загальна характеристика

У Vue реактивність означає **автоматичне відстеження залежностей** (див. `vue-js/reactivity.md`). React будується на іншій моделі, і слово «реактивний» до нього застосовують умовно. Основна ідея React — **інтерфейс є функцією від стану**:

```text
UI = f(state)
```

Коли стан змінюється, React **знову викликає функцію компонента**, отримує новий опис інтерфейсу, порівнює його з попереднім і вносить у DOM лише відмінності. React не відстежує, які саме поля стану прочитав компонент: він просто виконує функцію заново.

Наслідки цієї моделі, які визначають усі особливості React:

1. **Стан — це знімок (snapshot).** Кожен рендер бачить власне незмінне значення стану.
2. **Оновлення — це запит.** `setState` не присвоює змінній значення, а просить React запланувати новий рендер.
3. **Стан незмінний (immutable).** React розпізнає зміну за посиланням (`Object.is`), а не за вмістом.
4. **Гранулярність — компонент.** Перерендер зачіпає компонент і все його піддерево, якщо не вжито заходів.

## Як запускати приклади

Приклади виконуються в Node.js через справжні `react` і `react-test-renderer` (версія 18) без браузера й без JSX. Усі блоки ` ```js `, склеєні по порядку, утворюють один робочий скрипт. Функція `act()` гарантує, що оновлення й ефекти виконано до наступного рядка.

```bash
npm install --save-dev react@18 react-test-renderer@18
```

```js
globalThis.IS_REACT_ACT_ENVIRONMENT = true; // прибирає службове попередження
const React = require("react");
const TestRenderer = require("react-test-renderer");
const { act } = TestRenderer;
const h = React.createElement; // скорочення замість JSX
```

## 1. Стан як знімок і пакетне оновлення

Змінна `count` усередині одного рендеру не змінюється, скільки б разів не викликали `setCount`. Три виклики `setCount(count + 1)` підряд читають те саме значення `count` зі знімка й дають у підсумку **лише +1**. Крім того, React **групує** такі виклики (batching): усі три запити приводять до одного рендеру.

Щоб залежати від актуального значення, а не від знімка, передають функцію-оновлювач: `setCount((c) => c + 1)`.

```js
let counterApi;
let counterRenders = 0;
function Counter() {
  const [count, setCount] = React.useState(0);
  counterRenders++;
  counterApi = { count, setCount }; // виносимо стан назовні, щоб керувати ним із «тесту»
  return h("div", null, count);
}
act(() => { TestRenderer.create(h(Counter)); });
console.log("initial:", counterApi.count, "renders:", counterRenders);

act(() => {
  counterApi.setCount(counterApi.count + 1);
  counterApi.setCount(counterApi.count + 1);
  counterApi.setCount(counterApi.count + 1);
});
console.log("three snapshot '+1's:", counterApi.count, "renders:", counterRenders);

act(() => {
  counterApi.setCount((c) => c + 1);
  counterApi.setCount((c) => c + 1);
  counterApi.setCount((c) => c + 1);
});
console.log("three functional:", counterApi.count, "renders:", counterRenders);
// initial: 0 renders: 1
// three snapshot '+1's: 1 renders: 2
// three functional: 4 renders: 3
```

Обидві серії з трьох викликів дали **по одному** рендеру (лічильник зріс на 1), проте перша додала 1, а друга — 3. У React 18 групування працює й поза обробниками подій (у проміс-колбеках, таймерах), якщо застосунок створено через `createRoot`. У цій нотатці це окремо не перевірялося.

## 2. Незмінність: мутація не викликає оновлення

`setState` порівнює нове значення з поточним через `Object.is`. Якщо посилання те саме, React вважає, що нічого не змінилося, і **не рендерить** компонент. Тому мутація існуючого масиву чи об'єкта — типова помилка:

```js
let listApi;
let listRenders = 0;
function ListView() {
  const [items, setItems] = React.useState(["a"]);
  listRenders++;
  listApi = { items, setItems };
  return h("div", null, items.join(","));
}
let listTree;
act(() => { listTree = TestRenderer.create(h(ListView)); });

act(() => {
  listApi.items.push("b"); // мутація існуючого масиву
  listApi.setItems(listApi.items); // те саме посилання
});
console.log("mutation + same reference:", listRenders, listTree.toJSON().children);

act(() => { listApi.setItems([...listApi.items]); }); // нова копія
console.log("new copy:", listRenders, listTree.toJSON().children);
// mutation + same reference: 1 [ 'a' ]
// new copy: 2 [ 'a,b' ]
```

Масив уже містив `"b"`, але екран показував `"a"`, поки не передали **нове посилання**. Тому в React стан оновлюють, створюючи копії: `[...items, x]`, `{ ...obj, field: v }`, `items.map(...)`, `items.filter(...)`. Це відрізняє React від Vue, де мутація стану — нормальний спосіб його змінювати.

## 3. Однакове значення: відмова від оновлення

Для примітивів діє те саме правило: запис поточного значення не змінює екрана.

```js
let primApi;
let primRenders = 0;
function Prim() {
  const [v, setV] = React.useState(5);
  primRenders++;
  primApi = { setV };
  return h("b", null, v);
}
act(() => { TestRenderer.create(h(Prim)); });
act(() => { primApi.setV(5); });
console.log("same value:", primRenders);

act(() => { primApi.setV(6); });
act(() => { primApi.setV(6); });
console.log("6, then 6 again:", primRenders);
// same value: 1
// 6, then 6 again: 3
```

Другий результат може здивувати: після зміни на `6` (2 рендери) повторне `setV(6)` збільшило лічильник до 3. Це задокументована особливість: React може **викликати функцію компонента ще раз**, перш ніж переконається, що стан не змінився, і лише тоді відмовляється оновлювати дочірні компоненти й DOM. Спиратися на кількість викликів функції компонента не можна: вона не є гарантією, а сам компонент має бути чистою функцією.

## 4. Каскад перерендерів і `React.memo`

Оскільки React не знає, що саме читав компонент, він перерендерює **все піддерево**, навіть якщо пропси дочірніх компонентів не змінилися. `React.memo` дозволяє пропустити компонент, якщо його пропси такі самі:

```js
let childRenders = 0;
let memoChildRenders = 0;
const Child = () => { childRenders++; return h("i", null, "c"); };
const MemoChild = React.memo(() => { memoChildRenders++; return h("i", null, "m"); });

let parentApi;
function Parent() {
  const [n, setN] = React.useState(0);
  parentApi = { setN };
  return h("div", null, n, h(Child), h(MemoChild));
}
act(() => { TestRenderer.create(h(Parent)); });
act(() => { parentApi.setN(1); });
act(() => { parentApi.setN(2); });
console.log("plain Child:", childRenders, "React.memo Child:", memoChildRenders);
// plain Child: 3 React.memo Child: 1
```

Батьківський стан змінився двічі; звичайний дочірній компонент відрендерився тричі (початок і два оновлення), тоді як мемоїзований — один раз. Це головна відмінність від Vue: там кожна залежність відстежується окремо, тому зайвих перерендерів не виникає автоматично, а в React їх усувають вручну (`memo`, `useMemo`, `useCallback`).

## 5. `useRef`: значення поза реактивністю

Зміна `ref.current` **не** запускає рендер. Це корисно для значень, які потрібні між рендерами, але не впливають на вигляд: ідентифікатор таймера, посилання на DOM-елемент, попереднє значення.

```js
let refRenders = 0;
let refHandle;
function RefView() {
  const ref = React.useRef(0);
  refRenders++;
  refHandle = ref;
  return h("b", null, ref.current);
}
let refTree;
act(() => { refTree = TestRenderer.create(h(RefView)); });
act(() => { refHandle.current = 42; });
console.log("renders:", refRenders, "in DOM:", refTree.toJSON().children, "in ref:", refHandle.current);
// renders: 1 in DOM: [ '0' ] in ref: 42
```

Значення в `ref` стало `42`, але екран показує `0`, бо рендеру не було. Якщо зміна має бути видимою, потрібен стан (`useState`).

## 6. Замикання: обробник бачить стан свого рендеру

Функція, створена під час рендеру, замикає значення стану **цього** рендеру (див. нотатку про closures). Старий обробник не побачить нових даних:

```js
let snapApi;
function Snap() {
  const [c, setC] = React.useState(0);
  snapApi = { setC, read: () => c };
  return h("b", null, c);
}
act(() => { TestRenderer.create(h(Snap)); });
const oldRead = snapApi.read;
act(() => { snapApi.setC(10); });
console.log("old handler sees:", oldRead(), "new handler sees:", snapApi.read());
// old handler sees: 0 new handler sees: 10
```

Звідси випливає проблема застарілих значень (stale closure) в асинхронному коді й ефектах, розглянута в нотатці `useEffect.md`. У Vue цієї проблеми немає, бо реактивний об'єкт один і той самий, а читання відбувається в момент виконання.

## 7. Похідні дані: звичайні вирази та `useMemo`

У Vue для похідних значень існує `computed` з автоматичним кешем. У React похідні дані зазвичай просто **обчислюють під час рендеру** звичайним виразом. Якщо обчислення дороге, застосовують `useMemo`, але масив залежностей задають **вручну**:

```js
let memoCalcs = 0;
let memoApi;
function Total({ items }) {
  const [tick, setTick] = React.useState(0);
  memoApi = { setTick };
  const total = React.useMemo(() => {
    memoCalcs++;
    return items.reduce((a, b) => a + b, 0);
  }, [items]);
  return h("b", null, `${total}/${tick}`);
}
const stableItems = [1, 2, 3];
let totalTree;
act(() => { totalTree = TestRenderer.create(h(Total, { items: stableItems })); });

act(() => { memoApi.setTick(1); }); // перерендер, масив items той самий
console.log("calcs after rerender:", memoCalcs);

act(() => { totalTree.update(h(Total, { items: [1, 2, 3] })); }); // нове посилання
console.log("calcs with new array:", memoCalcs, totalTree.toJSON().children);
// calcs after rerender: 1
// calcs with new array: 2 [ '6/1' ]
```

Перерахунок пропущено, коли посилання на масив не змінилося, і виконано, коли з'явилося нове посилання з тим самим вмістом. Так само працює й `useEffect`: залежності порівнюються за посиланням. Не варто використовувати `useEffect` + `useState` для похідних даних: значення обчислюють прямо під час рендеру (розділ 9 нотатки `useEffect.md`).

## 8. Порівняння моделей React і Vue

| Аспект | Vue | React |
|---|---|---|
| Механізм | `Proxy` перехоплює читання й запис, відстежує залежності автоматично | повторний виклик функції компонента, порівняння результату |
| Стан | змінюваний: мутація дозволена | незмінний знімок; оновлення через `setState` із новим посиланням |
| Гранулярність | окрема властивість або `ref` | компонент і його піддерево |
| Запуск оновлення | автоматично при зміні даних | явно, викликом `setState` |
| Похідні дані | `computed`: кеш і залежності автоматично | вираз під час рендеру або `useMemo` з ручним масивом залежностей |
| Побічні ефекти | `watch`, `watchEffect`: залежності автоматично | `useEffect`: залежності перелічують вручну |
| Типові пастки | деструктуризація розриває зв'язок, `proxy !== raw` | мутація стану, застарілі замикання, зайві перерендери |
| Оптимізація | здебільшого автоматична | `memo`, `useMemo`, `useCallback` (або автоматична мемоізація компілятором) |
| Ціна | накладні витрати на проксі та відстеження | перерендери компонентів і порівняння |

Обидві моделі мають слабкі місця, що є дзеркальними. У Vue легко випадково втратити реактивність (деструктуризація) або змінити щось у обхід проксі. У React легко мутувати стан або отримати надто багато перерендерів. Причина в тому, що кожна модель перекладає на розробника різну дисципліну: у Vue — тримати значення реактивними, у React — не мутувати й керувати мемоізацією.

## 9. Сучасні напрямки

- **Сигнали (signals).** Бібліотеки Solid, Preact Signals та реактивність Vue (`ref`) використовують дрібнозернисту модель: оновлюється лише те, що залежить від змінного значення, без перерендеру компонентів. Існує й пропозиція стандартизувати сигнали в JavaScript.
- **Автоматична мемоізація.** React Compiler на етапі збірки автоматично вставляє мемоізацію там, де раніше розробник писав `memo`/`useMemo`/`useCallback`, зменшуючи ручну роботу, але не змінюючи модель «перерендер компонента».

## Підсумок

- React виходить з формули «UI = f(state)»: при зміні стану він знову викликає функцію компонента й порівнює новий результат зі старим; залежності від окремих полів він не відстежує.
- Стан у рендері — знімок: `setCount(count + 1)` тричі дає +1; для залежності від актуального значення використовують `setCount((c) => c + 1)`.
- `setState` — запит, а не присвоєння; оновлення групуються (batching), тому кілька викликів дають один рендер.
- Стан має бути незмінним: React порівнює `Object.is`, тому мутація з тим самим посиланням не викликає рендеру (екран лишається старим).
- Однакове значення не оновлює екран, проте React може викликати функцію компонента ще раз перед відмовою, тож на кількість викликів покладатися не можна.
- Перерендер зачіпає все піддерево; `React.memo` пропускає компонент, якщо пропси не змінилися.
- `useRef` — змінне значення поза реактивністю: його зміна не рендерить; обробники замикають стан свого рендеру.
- Похідні дані обчислюють під час рендеру або через `useMemo` з ручним масивом залежностей; `useEffect` для цього не призначений.
- Порівняно з Vue: React переносить дисципліну на розробника (незмінність, мемоізація, залежності), а Vue — автоматизує відстеження, але має власні пастки (втрата реактивності, ідентичність проксі).
