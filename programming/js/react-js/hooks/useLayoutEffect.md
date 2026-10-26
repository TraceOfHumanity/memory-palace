# React: `useLayoutEffect` і `useInsertionEffect`

Виміряно на React 18.3.1 (`react-test-renderer`, `react-dom` + `jsdom`, `react-dom/server`), а де сказано — React 19.

## 1. Що це

`useLayoutEffect` має той самий синтаксис, що й `useEffect`, але виконується **синхронно, після оновлення DOM і до того, як браузер намалює екран**. `useEffect` виконується **після малювання** (асинхронно).

```jsx
useLayoutEffect(() => { /* читати/міняти DOM */ return () => { /* cleanup */ }; }, [deps]);
```

Навіщо: коли потрібно **виміряти DOM** (розмір, позицію) і **одразу скоригувати** стиль/стан так, щоб користувач не побачив «мерехтіння» (flicker). Приклади: позиціонування tooltip/popover за розмірами елемента, автоматична висота textarea, збереження позиції прокрутки.

## 2. Порядок виконання (реальний вивід)

Компонент `Parent` містить `Child`, у обох по одному `useInsertionEffect`, `useLayoutEffect`, `useEffect`.

**Mount:**
```
render parent | render child
child insertion | parent insertion
child layout | parent layout
child effect | parent effect
```
**Unmount:**
```
parent insertion cleanup | parent layout cleanup | child insertion cleanup | child layout cleanup
parent effect cleanup | child effect cleanup
```
**Update (спостереження):** спершу render parent/child; далі — «фаза мутації» для кожного вузла: cleanup (insertion і layout) старого, потім setup нового insertion; після всіх мутацій — setup усіх layout (child → parent); пізніше (після малювання) passive: спочатку **усі** cleanups useEffect, потім **усі** setup.

Запам'ятай:
1. Спершу **render** (чисті обчислення), потім **commit** (запис у DOM).
2. `useInsertionEffect` → `useLayoutEffect` → `useEffect` (у такому порядку).
3. Ефекти **дітей виконуються раніше** ефектів батька (знизу вгору).
4. Layout-ефекти і їх cleanup — синхронні; `useEffect` — після малювання.

## 3. Приклад проблеми «мерехтіння»

Без layout-ефекту: компонент рендериться з неправильною позицією → браузер малює → `useEffect` вимірює → `setState` → другий рендер → браузер малює знову: користувач бачить стрибок. З `useLayoutEffect`: вимір і `setState` відбуваються **до** малювання; React синхронно повторює рендер, і користувач бачить лише фінальний вигляд.

```jsx
function Tooltip({ children }) {
  const ref = useRef(null);
  const [h, setH] = useState(0);
  useLayoutEffect(() => { setH(ref.current.getBoundingClientRect().height); }, []);
  return <div ref={ref} style={{ top: -h }}>{children}</div>;
}
```
Виміряно (DOM ref): під час рендеру `ref.current` — `null` (`render:null`), у `useLayoutEffect` уже `INPUT` — DOM-вузол доступний саме з цієї фази.

## 4. Ціна

`useLayoutEffect` **блокує малювання**: довга робота всередині = «замерзання» кадру. Використовуй лише для **вимірювання й синхронного виправлення** DOM. Усе інше (запити, підписки, логування) — `useEffect`.

## 5. Сервер (SSR)

На сервері немає DOM, ефекти не виконуються.
- **React 18.3.1:** `renderToString` з `useLayoutEffect` виводить попередження `Warning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format…` (виміряно). HTML при цьому правильний (`<p>x</p>`).
- **React 19:** попередження прибрано — `renderToString` мовчки повертає `<p>x</p>` (виміряно).
Загальна практика: ізоморфний хук `const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect`.

## 6. `useInsertionEffect`

Спрацьовує **перед усіма layout-ефектами**, коли DOM ще не змінений (але вже підготовлений до змін). Призначення: **бібліотеки CSS-in-JS** (styled-components, emotion) — вставити `<style>` до того, як layout-ефекти читатимуть розміри. У застосунках майже не потрібен.
Обмеження: усередині не можна викликати `setState`; `ref` ще не прикріплені; не планувати оновлення.

## 7. Типові помилки

1. Використовувати `useLayoutEffect` за замовчуванням — блокує малювання, гірша продуктивність.
2. Дорогі обчислення/запити в layout-ефекті.
3. SSR без заміни на `useEffect` — попередження (React 18).
4. Забути cleanup для підписок.
5. `setState` у layout-ефекті **без умови** → нескінченний цикл синхронних рендерів.
6. Плутати порядок: думати, що ефект батька спрацює раніше за ефект дитини.
7. Читати `ref.current` під час рендеру — там `null` на першому рендері.

## 8. Алгоритм вибору

1. Потрібно щось зробити після рендеру, але **не** вимірюючи/правлячи DOM до малювання → `useEffect`.
2. Потрібно **прочитати розмір/позицію** і **виправити** вигляд без мерехтіння → `useLayoutEffect`.
3. Пишеш бібліотеку CSS-in-JS, що вставляє `<style>` → `useInsertionEffect`.
4. SSR → ізоморфна заміна (React 18).
