# SOLID: S — Single Responsibility Principle (принцип єдиної відповідальності)

## 0. Формулювання

> Клас повинен мати лише **одну причину для змін**.

«Одна відповідальність» — це не «один метод» і не «одна дія». Ідеться про те, що клас обслуговує **одного «замовника» вимог**: якщо зміну в класі можуть ініціювати різні люди з різних причин (редактор хоче змінити правила публікації, дизайнер — розмітку, DevOps — сховище), ці частини варто розділити.

## 1. Порушення: один клас — дані, збереження і відображення

```ts
class BlogPostGodClass {
  constructor(
    public title: string,
    public content: string,
  ) {}

  update(title: string, content: string): void {
    this.title = title;
    this.content = content;
  }

  saveToDatabase(): string {
    return `INSERT INTO posts VALUES ('${this.title}', '${this.content}')`; // причина змін №2: сховище
  }

  renderHTML(): string {
    return `<h1>${this.title}</h1><p>${this.content}</p>`; // причина змін №3: подання
  }
}

const godPost = new BlogPostGodClass("Hello", "First post");
console.log(godPost.renderHTML()); // <h1>Hello</h1><p>First post</p>
```

Проблеми:

- перехід з SQL на інше сховище змушує редагувати клас поста — і ризикувати зламати рендеринг;
- додати JSON-подання для API — знову той самий клас;
- тестувати рендеринг неможливо без коду, що знає про базу даних.

## 2. Виправлення: кожна причина змін — окремий клас

```ts
class BlogPost {
  constructor(
    private title: string,
    private content: string,
  ) {}

  update(title: string, content: string): void {
    if (title.trim() === "") throw new Error("Title cannot be empty"); // правила самого поста
    this.title = title;
    this.content = content;
  }

  getPost(): { title: string; content: string } {
    return { title: this.title, content: this.content };
  }
}

// відповідальність: подання поста в HTML
class BlogPostHtmlView {
  render(post: BlogPost): string {
    const { title, content } = post.getPost();
    return `<h1>${title}</h1><p>${content}</p>`;
  }
}

// відповідальність: подання поста для API
class BlogPostJsonView {
  render(post: BlogPost): string {
    return JSON.stringify(post.getPost());
  }
}

// відповідальність: збереження (тут — пам'ять замість справжньої БД)
class BlogPostRepository {
  private storage: Array<{ title: string; content: string }> = [];
  save(post: BlogPost): number {
    this.storage.push(post.getPost());
    return this.storage.length;
  }
}

const post = new BlogPost("Hello", "First post");
post.update("Hello, SOLID", "Updated post");

console.log(new BlogPostHtmlView().render(post)); // <h1>Hello, SOLID</h1><p>Updated post</p>
console.log(new BlogPostJsonView().render(post)); // {"title":"Hello, SOLID","content":"Updated post"}
console.log(new BlogPostRepository().save(post)); // 1
```

Тепер нове подання (RSS, Markdown) — це **новий** клас, а `BlogPost`, репозиторій і наявні подання не змінюються.

> [!note] Зміни відносно попередньої версії
> Раніше `BlogPost` мав метод `createPost()`, що друкував пост у консоль, — тобто сам клас даних усе ще займався поданням. А `BlogPostDisplay` тримав пост у полі з назвою `posts` (множина) і двічі викликав `getPost()`. Тут подання повністю винесено в окремі класи.

## 3. Як не перестаратися

SRP не означає «по одному методу на клас». Ознаки, що розділяти **варто**:

- у класі є методи, які використовують різні, не пов'язані між собою поля;
- зміни в класі регулярно приходять з різних причин;
- важко дати класу назву без «And»/«Manager»/«Utils».

Якщо дві речі змінюються **завжди разом** — розділення лише додасть непотрібних файлів.

## Підсумок

- SRP: клас має одну причину для змін — обслуговує одного «замовника» вимог.
- Типове порушення — клас, що одночасно тримає дані, зберігає їх і відображає.
- Розділення за причинами змін дає змогу додавати нове подання чи сховище, не чіпаючи решти, і тестувати частини окремо.
- Критерій — причини змін, а не кількість методів; те, що завжди змінюється разом, розділяти не треба.
- Пов'язані принципи: [open-closed.md](open-closed.md), [interface-segregation.md](interface-segregation.md); інкапсуляція правил усередині класу — [encapsulation.md](../OOP/encapsulation.md).
