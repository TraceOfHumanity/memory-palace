# React: правила хуків і кастомні хуки

Виміряно на React 18.3.1 (`react-test-renderer`).

## 1. Що таке хуки зсередини

Для кожного компонента React тримає **список слотів** (зв'язний список): `useState` №1, `useEffect` №2, `useRef` №3… Хук не має імені — React визначає, «який це слот», **лише за порядком виклику** в рендері. Перший `useState` у функції — слот 0, другий — слот 1.

Звідси два правила.

## 2. Правила хуків

1. Викликай хуки **тільки на верхньому рівні**: не в умовах, не в циклах, не у вкладених функціях, не після раннього `return`.
2. Викликай хуки **тільки з функціональних компонентів** або **кастомних хуків** (функцій з іменем `useXxx`).

Мета: **однаковий порядок і кількість викликів при кожному рендері.**

## 3. Що буде при порушенні (реальні помилки)

| Порушення | Помилка React 18.3 |
|---|---|
| Умовний хук: на 1-му рендері 2 хуки, на 2-му — 1 | `Rendered fewer hooks than expected. This may be caused by an accidental early return statement.` |
| Цикл із змінною кількістю хуків (2 → 3) | `Rendered more hooks than during the previous render.` |
| Виклик поза компонентом | `Invalid hook call. Hooks can only be called inside of the body of a function component.` |
| Ранній `return` перед хуком | на 1-му рендері може «працювати»; помилка, коли умова зміниться між рендерами |

Чому: після умови «зсуваються» слоти — другий `useState` отримує стан першого. Тому React перевіряє кількість хуків і кидає помилку.

Як правильно: умова **всередині** хука, а не навколо нього:
```jsx
useEffect(() => { if (enabled) doThing(); }, [enabled]);   // ✔
if (enabled) useEffect(...)                                // ✗
```
Ранній `return` — **після** усіх хуків.

> Виняток React 19: `use(...)` **можна** викликати умовно.

## 4. Кастомні хуки

Кастомний хук — звичайна функція з іменем **`useXxx`**, що викликає інші хуки. Це спосіб **повторно використати логіку зі станом** (не JSX).

```jsx
function useToggle(initial = false) {
  const [on, setOn] = useState(initial);
  const toggle = useCallback(() => setOn((v) => !v), []);
  return [on, toggle];
}
function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => {
    const raw = localStorage.getItem(key);
    return raw !== null ? JSON.parse(raw) : initial;
  });
  useEffect(() => { localStorage.setItem(key, JSON.stringify(value)); }, [key, value]);
  return [value, setValue];
}
function useDebounce(value, ms) {
  const [d, setD] = useState(value);
  useEffect(() => { const id = setTimeout(() => setD(value), ms); return () => clearTimeout(id); }, [value, ms]);
  return d;
}
```

### Властивості
- **Стан не спільний.** Кожен виклик кастомного хука — **незалежна копія** власних слотів: два компоненти з `useToggle()` мають різний стан. Щоб ділити стан — контекст чи зовнішній стор.
- Префікс `use` обов'язковий: лінтер за ним розпізнає хуки й перевіряє правила.
- Хук **не рендерить**: повертає значення/функції.
- Кастомні хуки можна компонувати.

## 5. Кастомний хук чи звичайна функція

Використовує `useState`/`useEffect`/інші хуки → кастомний хук (`useXxx`). Не використовує → звичайна функція, префікс `use` не потрібен.

## 6. Дублювання логіки: принцип

Повторюється пара `useState` + `useEffect` у кількох компонентах → винеси в хук. Не витягуй «на майбутнє»: абстракція має відповідати реальному повторенню.

## 7. Тестування

Хук тестують через тестовий компонент або `renderHook` (React Testing Library). Хук не можна викликати як звичайну функцію поза рендером (помилка `Invalid hook call`).

## 8. Типові помилки

1. Умовний виклик хука (`if`, `&&`, тернарний оператор).
2. Хуки в циклі або вкладених функціях/колбеках.
3. Ранній `return` до хуків.
4. Назвати хук без `use` — лінтер не перевірить правила.
5. Очікувати, що два компоненти діляться станом із кастомного хука.
6. Викликати хук у класовому компоненті (хуки лише для функціональних).
7. Хук, що повертає нестабільні об'єкти/функції → зайві рендери споживачів (мемоізуй).
8. Дублювання версій React (різні копії) → `Invalid hook call`.

## 9. Алгоритм

1. Усі хуки — на початку функції, у тому самому порядку при кожному рендері.
2. Умови — всередині хуків (`if` всередині `useEffect`), а не навколо.
3. Повторювана логіка зі станом → `useНазва`.
4. Повертай стабільні значення (`useCallback`/`useMemo`).
5. Увімкни `eslint-plugin-react-hooks` (rules-of-hooks, exhaustive-deps).

## Задачі для закріплення

13 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Кожен фрагмент — тіло асинхронної функції, відповідь — значення, яке воно повертає. У прикладах `mount(el)` монтує елемент через `act`, `press(r)` викликає `onClick` кнопки, `text(r)` повертає текст результату; `create` і `act` беруться з `react-test-renderer`, `renderToString` — з `react-dom/server`, хуки — з `react`.

### Рівень 1. Основи

**1.** Що станеться, якщо викликати хук умовно, і умова змінюється?

```jsx
function C({ on }) { if (on) { useState(0); } useState('b'); return <p>x</p>; }
const orig = console.error; console.error = () => {};
const t = await mount(<C on={false} />);
let err = 'none';
try { await act(async () => { t.update(<C on={true} />); }); } catch (e) { err = e.message.slice(0, 60); }
console.error = orig;
return err;
```

**2.** Порядок викликів хуків важливий: чи збережуться стани при стабільному порядку?

```jsx
function C() { const [a, setA] = useState('A'); const [b, setB] = useState('B'); return <button onClick={() => setA('A2')}>{a}{b}</button>; }
const t = await mount(<C />);
await press(t);
return text(t);
```

**3.** Власний хук `useCounter`: окремий стан для кожного виклику.

```jsx
function useCounter(init) { const [n, setN] = useState(init); return [n, () => setN(n + 1)]; }
function C() { const [a, incA] = useCounter(0); const [b] = useCounter(10); return <button onClick={incA}>{a}-{b}</button>; }
const t = await mount(<C />);
await press(t);
return text(t);
```

**4.** Два компоненти з тим самим хуком не діляться станом.

```jsx
function useCounter() { const [n, setN] = useState(0); return [n, () => setN(n + 1)]; }
function A() { const [n, inc] = useCounter(); return <button onClick={inc}>{n}</button>; }
function P() { return <div><A /><A /></div>; }
const t = await mount(<P />);
const btns = t.root.findAllByType('button');
await act(async () => { btns[0].props.onClick(); });
return t.root.findAllByType('button').map(b => b.children.join(''));
```

### Рівень 2. Деталі й поведінка

**5.** Хук у циклі зі змінною кількістю ітерацій.

```jsx
function C({ n }) { for (let i = 0; i < n; i++) useState(i); return <p>{n}</p>; }
const orig = console.error; console.error = () => {};
const t = await mount(<C n={1} />);
let err = 'none';
try { await act(async () => { t.update(<C n={2} />); }); } catch (e) { err = e.message.slice(0, 55); }
console.error = orig;
return err;
```

**6.** Хук після раннього `return` (спершу рендер без раннього виходу, потім із ним).

```jsx
function C({ skip }) { const [a] = useState(0); if (skip) return <p>skip</p>; const [n] = useState(1); return <p>{a}{n}</p>; }
const orig = console.error; console.error = () => {};
const t = await mount(<C skip={false} />);
let err = 'none';
try { await act(async () => { t.update(<C skip={true} />); }); } catch (e) { err = e.message.slice(0, 55); }
console.error = orig;
return err;
```

**7.** Кастомний хук `useToggle`.

```jsx
function useToggle(i = false) { const [v, set] = useState(i); return [v, () => set(x => !x)]; }
function C() { const [on, toggle] = useToggle(); return <button onClick={toggle}>{String(on)}</button>; }
const t = await mount(<C />);
await press(t); await press(t); await press(t);
return text(t);
```

**8.** Кастомний хук `usePrevious`.

```jsx
function usePrevious(v) { const r = useRef(); useEffect(() => { r.current = v; }); return r.current; }
function C({ v }) { const p = usePrevious(v); return <p>{String(p)}-{v}</p>; }
const t = await mount(<C v={1} />);
await act(async () => { t.update(<C v={2} />); });
return text(t);
```

### Рівень 3. Нюанси та пастки

**9.** Кастомний хук `useLocalStorage`-подібний із початковим значенням із «сховища».

```jsx
const store = { k: 'saved' };
function useStored(k, d) { const [v, set] = useState(() => store[k] ?? d); useEffect(() => { store[k] = v; }, [k, v]); return [v, set]; }
function C() { const [v, set] = useStored('k', 'def'); return <button onClick={() => set('new')}>{v}</button>; }
const t = await mount(<C />);
await press(t);
return [text(t), store.k];
```

**10.** Кастомний хук може викликати інші хуки; назва повинна починатися з `use` — чи перевіряє це React у рантаймі?

```jsx
function notAHook() { return useState(1)[0]; }
function C() { return <p>{notAHook()}</p>; }
return renderToString(<C />);
```

**11.** Основні правила хуків?

**12.** Чому порядок хуків має бути сталим?

### Рівень 4. Практика

**13.** Що таке кастомний хук?

### Відповіді

1. `'Rendered more hooks than during the previous render.'`
2. `'A2B'`
3. `'1-10'`
4. `['1', '0']`
5. `'Rendered more hooks than during the previous render.'`
6. `'Rendered fewer hooks than expected. This may be caused '`
7. `'true'`
8. `'1-2'`
9. `['new', 'new']`
10. `'<p>1</p>'`
11. 1) Викликати лише на верхньому рівні (не в умовах, циклах, вкладених функціях); 2) викликати лише з компонентів або кастомних хуків
12. React зіставляє стан із хуками за порядком виклику; зміна порядку призводить до плутанини станів або помилки «Rendered more hooks than during the previous render»
13. Функція з префіксом `use`, що викликає інші хуки та інкапсулює повторювану логіку стану й ефектів; кожен виклик має власний ізольований стан
