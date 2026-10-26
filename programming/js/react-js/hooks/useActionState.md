# React 19: `useActionState` і `useFormStatus`

Виміряно на React 19.3.1 (`react-dom` + `jsdom`, форма з `requestSubmit()`).

## 1. Що це

React 19 вводить **Actions**: функція, яку можна передати як `action` форми (`<form action={fn}>`). `useActionState` керує **станом такої дії**: зберігає результат останнього виконання й показує, чи дія виконується.

```jsx
const [state, formAction, isPending] = useActionState(action, initialState);
<form action={formAction}>…</form>
```
- `action(prevState, formData)` — асинхронна/синхронна функція; **повертає новий стан**;
- `state` — результат останнього виклику (спочатку `initialState`);
- `formAction` — передається у `<form action>` (або `<button formAction>`);
- `isPending` — чи виконується дія.

## 2. Як це виконується (реальний вивід)

```
render state={"ok":false} pending=false         ← початок
--- submit (requestSubmit)
render state={"ok":false} pending=true          ← 1. дія стартувала
action prev={"ok":false} name=Ann               ← 2. викликана action(prevState, formData)
render state={"ok":true,"name":"Ann"} pending=false   ← 3. новий стан
```
Кроки:
1. Користувач надсилає форму → React створює `FormData`, викликає `action(prevState, formData)` у transition, `isPending = true`.
2. Дія повертає значення (або проміс) → воно стає новим `state`.
3. `isPending = false`.
4. **Після успішної дії React автоматично скидає (reset) неконтрольовані поля форми** (`<input defaultValue>`).

Виконання дій для однієї форми **черзі**: наступна починається після завершення попередньої.

## 3. Приклад: валідація й помилки

```jsx
async function signup(prev, formData) {
  const email = formData.get("email");
  if (!email.includes("@")) return { error: "Невірний email" };
  await api.signup(email);
  return { ok: true };
}
function Form() {
  const [state, action, pending] = useActionState(signup, {});
  return (<form action={action}>
    <input name="email" />
    <button disabled={pending}>Надіслати</button>
    {state.error && <p>{state.error}</p>}
  </form>);
}
```
Працює й **без JS на клієнті** (прогресивне покращення) із серверними діями (`"use server"`): форма відправиться як звичайний POST.

## 4. `useFormStatus` (з `react-dom`)

```jsx
import { useFormStatus } from "react-dom";
function SubmitButton() {
  const { pending, data, method, action } = useFormStatus();
  return <button disabled={pending}>{pending ? "…" : "Надіслати"}</button>;
}
```
Читає статус **найближчої батьківської `<form>`**. Виміряно: `Btn pending=false → (submit) → Btn pending=true → Btn pending=false`.
Обмеження: хук має використовуватись у компоненті, що **вкладений у форму** (а не в тому, що її рендерить), інакше `pending` завжди `false`. Зручно для окремої кнопки «Надіслати», яка не знає про стан форми.

## 5. `useActionState` чи `useState` + обробник

| | `useState` + `onSubmit` | `useActionState` |
|---|---|---|
| `isPending` | вручну | **автоматично** |
| `FormData` | вручну (`e.preventDefault()`) | **автоматично** |
| Скидання полів | вручну | автоматично |
| SSR / без JS | ні | **так** (серверні дії) |
| Послідовність дій | вручну | черга |

## 6. Типові помилки

1. Повертати з `action` нічого (стан стане `undefined`).
2. Мутувати `prevState` замість повернення нового об'єкта.
3. Забути, що **неконтрольовані поля скидаються** після дії (передай значення назад у стані й використай `defaultValue={state.email}`).
4. `useFormStatus` в тому ж компоненті, що рендерить `<form>` — не побачить статус.
5. Не обробляти помилки мережі в `action` (кидання → error boundary).
6. Покладатись на паралельне виконання дій — вони йдуть чергою.
7. Забути `name` у полях — `FormData` буде порожнім.

## 7. Алгоритм

1. Напиши `action(prevState, formData)`, що **повертає** новий стан.
2. `const [state, formAction, pending] = useActionState(action, initial)`.
3. `<form action={formAction}>`, поля з `name`.
4. Кнопка: `disabled={pending}` або окремий компонент з `useFormStatus`.
5. Показуй `state.error`/`state.ok`.
