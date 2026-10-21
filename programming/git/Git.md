# Git — система контролю версій: що це, як працює, команди

> Усі виводи команд нижче отримано справжнім запуском (Git 2.54, macOS) у тестовому репозиторії. Хеші комітів у вашому репозиторії будуть іншими: вони залежать від автора, часу й вмісту. Де в прикладі `#` — це коментар, а не частина команди.

## 1. Що таке Git і навіщо він потрібен

**Git** — розподілена система контролю версій (Distributed Version Control System, DVCS). Вона зберігає історію змін файлів проєкту, дозволяє повернутись до будь-якого моменту, працювати над різними ідеями паралельно (гілки) і синхронізуватись з іншими людьми.

Створив Лінус Торвальдс у 2005 році для розробки ядра Linux, коли попередня система (BitKeeper) перестала бути безкоштовною. Цілі: швидкість, проста модель даних, підтримка тисяч паралельних гілок, повна цілісність історії.

**Проблеми, які розв'язує Git:**

- «final_v2_new_FINAL.zip» — копії папок замість історії;
- кілька людей редагують одні файли й перетирають зміни одне одного;
- «що змінилось, коли й чому?» — кожен коміт має автора, час і повідомлення;
- «ми зламали, поверни як було вчора» — повернення до будь-якого коміту;
- «спробуємо ризикову ідею» — гілка коштує 41 байт, не копію проєкту;
- «в кого остання версія?» — кожен клон має всю історію.

**Централізовані й розподілені системи.**

| | централізована (SVN, CVS) | розподілена (Git, Mercurial) |
|---|---|---|
| історія | на сервері | у кожного повна копія |
| без мережі | майже нічого | коміти, гілки, історія, diff працюють офлайн |
| гілки | важкі | легкі (вказівник) |
| якщо сервер зник | втрата історії | будь-який клон відновлює все |

**Знімки, а не різниці.** Багато систем зберігають «файл + список змін». Git при коміті зберігає **знімок усього проєкту** (посилання на вміст кожного файлу); незмінені файли — це посилання на вже збережений вміст. Різниці (`git diff`) обчислюються на льоту.

**Git ≠ GitHub.** Git — програма на вашому комп'ютері, що працює без мережі й без акаунтів. GitHub, GitLab, Bitbucket, Gitea — сервіси, які хостять Git-репозиторії й додають pull request-и, issue, CI, права доступу.

## 2. Встановлення й налаштування

```bash
git --version
# git version 2.54.0
```

macOS: `brew install git` (або Xcode Command Line Tools); Windows: Git for Windows; Linux: `apt install git` / `dnf install git`.

### 2.1. Три рівні конфігурації

| рівень | прапорець | файл | дія |
|---|---|---|---|
| system | `--system` | `/etc/gitconfig` | для всіх користувачів машини |
| global | `--global` | `~/.gitconfig` | для вашого користувача |
| local | (за замовчуванням) | `.git/config` у репозиторії | лише цей репозиторій |

Пріоритет: **local > global > system** (конкретніше перемагає).

```bash
git config --global user.name  "Alex"
git config --global user.email "alex@example.com"
git config --global init.defaultBranch main
git config --global alias.st "status -sb"
git config --list --show-origin     # усі налаштування і звідки вони
git config user.name                # одне значення
```

Файл `~/.gitconfig`, що вийшов:

```ini
[user]
	name = Alex
	email = alex@example.com
[init]
	defaultBranch = main
[alias]
	st = status -sb
```

Ім'я й пошта **вшиваються в кожен коміт** (це не логін на GitHub). Корисні налаштування:

```bash
git config --global core.editor "code --wait"   # редактор для повідомлень коміту
git config --global pull.rebase true            # git pull = fetch + rebase
git config --global core.autocrlf input         # macOS/Linux; true на Windows — перенос рядків
git config --global push.autoSetupRemote true   # git push сам задасть upstream
git config --global rerere.enabled true         # пам'ятати розв'язання конфліктів
```

## 3. Три області й стани файлів

Це найважливіша ментальна модель Git.

```
Робоча директорія  --git add-->  Індекс (staging area)  --git commit-->  Репозиторій (.git)
  (Working tree)                                                          (історія комітів)
        <------------------ git restore / git switch / git checkout --------------------
```

- **Робоча директорія (working tree)** — файли, з якими ви працюєте в редакторі.
- **Індекс / область підготовки (staging area, index)** — «чернетка наступного коміту»: ви вибираєте, які саме зміни підуть у коміт.
- **Репозиторій (`.git`)** — база з усіма комітами.

**Стани файлу:**

| стан | значення |
|---|---|
| untracked | Git про файл не знає |
| unmodified | збігається з останнім комітом |
| modified | змінений, але не доданий в індекс |
| staged | доданий в індекс, потрапить у наступний коміт |
| committed | збережений у репозиторії |

Індекс потрібен, щоб робити **атомарні коміти**: змінили п'ять файлів, а в коміт беремо лише два, що стосуються одного завдання.

## 4. Перший репозиторій

```bash
git init -b main
# Initialized empty Git repository in .../.git/
```

### 4.1. Що всередині `.git`

```bash
ls -a .git
# HEAD  config  description  hooks  info  objects  refs
cat .git/HEAD
# ref: refs/heads/main
cat .git/config
# [core]
#     repositoryformatversion = 0
#     filemode = true
#     bare = false
#     logallrefupdates = true
```

| елемент | призначення |
|---|---|
| `HEAD` | вказівник на поточну гілку (або на коміт) |
| `config` | локальні налаштування |
| `objects/` | усі дані: файли, дерева, коміти, теги |
| `refs/` | вказівники: `refs/heads/*` (гілки), `refs/tags/*`, `refs/remotes/*` |
| `index` | файл індексу (з'являється після `git add`) |
| `hooks/` | скрипти, що запускаються подіями (pre-commit…) |

Видалили `.git` — залишилась звичайна папка без історії. Тому `.git` не можна випадково видаляти чи комітити вкладений `.git`.

### 4.2. status → add → commit

```bash
echo "# My app" > README.md
git status
# On branch main
#
# No commits yet
#
# Untracked files:
#   (use "git add <file>..." to include in what will be committed)
#         README.md
#
# nothing added to commit but untracked files present (use "git add" to track)

git status -s        # коротко
# ?? README.md       # ?? = untracked

git add README.md
git status -s
# A  README.md       # A у лівій колонці = staged (новий файл)

git commit -m "Add README"
# [main (root-commit) e490459] Add README
#  1 file changed, 1 insertion(+)
#  create mode 100644 README.md
```

Коротка форма `git status -s` має **дві колонки**: ліва — індекс проти HEAD (staged), права — робоча директорія проти індексу.

| код | значення |
|---|---|
| `??` | untracked |
| `A ` | staged, новий файл |
| `M ` | staged, змінений |
| ` M` | змінений, не staged |
| `MM` | staged + ще зміни після додавання |
| `D ` / ` D` | видалений (staged / ні) |
| `R ` | перейменований |
| `UU` | конфлікт (обидві сторони змінили) |

### 4.3. git add — усі форми

```bash
git add file.txt        # один файл
git add src/            # папка
git add .               # все в поточній папці (нові, змінені, видалені)
git add -A              # увесь репозиторій, включно з видаленнями
git add -u              # лише вже відстежувані файли (без нових)
git add -p file.txt     # інтерактивно, по шматках (hunk)
git add -N file.txt     # "intent to add": показати новий файл у git diff
```

`git add -p` показує кожну зміну окремо й питає `Stage this hunk [y,n,q,a,d,s,e,?]?`: `y` — додати, `n` — пропустити, `s` — розбити на менші, `e` — редагувати вручну, `q` — вийти. Так з одного файлу в один коміт беруть лише потрібне.

### 4.4. git commit

```bash
git commit -m "Add README"          # повідомлення в команді
git commit                          # відкрити редактор
git commit -a -m "Fix bug"          # додати всі змінені відстежувані файли й закомітити (нові файли НЕ додає)
git commit --amend -m "New text"    # переписати останній коміт
git commit --amend --no-edit        # додати зміни з індексу в останній коміт без зміни повідомлення
git commit --allow-empty -m "Trigger CI"
```

Коміт — це знімок + метадані (автор, дата, повідомлення, батьківський коміт) + ідентифікатор (хеш). `--amend` **створює новий коміт** з новим хешем: старий лишається в `reflog`. Не робіть amend для комітів, які вже відправлені іншим.

## 5. Модель об'єктів: як Git зберігає дані

Усередині Git — **файлова система, адресована вмістом** (content-addressable). Є чотири типи об'єктів. Ім'я кожного — **SHA-1 хеш** його вмісту (40 hex-символів; новіші репозиторії можуть використовувати SHA-256).

| об'єкт | що зберігає |
|---|---|
| **blob** | вміст одного файлу (без імені!) |
| **tree** | список: режим, тип, хеш, ім'я — це папка |
| **commit** | хеш кореневого tree, батьків, автора, комітера, повідомлення |
| **tag** (annotated) | хеш об'єкта, ім'я, повідомлення, автор |

```bash
git cat-file -t HEAD          # тип об'єкта
# commit
git cat-file -p HEAD          # вміст
# tree d91f84a0a3da973de32e5f36de1307104a7c8482
# author Alex <alex@example.com> 1768032000 +0200
# committer Alex <alex@example.com> 1768032000 +0200
#
# Add README
git cat-file -p 'HEAD^{tree}'
# 100644 blob cc22473b12078ebc933a84d75f60fe4953841ee4	README.md
git cat-file -p HEAD:README.md
# # My app
```

Бачимо ланцюг: **commit → tree → blob**. Якщо два файли мають однаковий вміст, це один blob. Якщо файл не змінився, новий tree вказує на той самий blob — тому «знімки» дешеві.

**Хеш вмісту** обчислюється як SHA-1 від `"blob <довжина>\0<вміст>"`:

```bash
echo -n "hello" | git hash-object --stdin
# b6fc4c620b67d95f953a5c1c1230aaab5db5a1b0
echo "hello" | git hash-object --stdin       # з символом нового рядка — інший хеш
# ce013625030ba8dba906f756967f9e9ca394464a
```

Хеш коміту залежить від tree, батька, автора, часу й повідомлення. Зміна **будь-чого** в історії змінює всі наступні хеші — звідси цілісність (як ланцюжок блоків) і причина, чому «переписування історії» створює нові коміти.

### 5.1. Посилання (refs): гілки, теги, HEAD

- **Гілка** — файл `.git/refs/heads/<ім'я>` з 40 символами: хеш коміту, на який вона вказує. Створення гілки = запис одного файлу.
- **Тег** — `refs/tags/<ім'я>`, вказівник, що **не рухається**.
- **HEAD** — «де я зараз»: зазвичай `ref: refs/heads/main` (на гілку); при `detached HEAD` — просто хеш.
- **Віддалена гілка** `origin/main` — локальна копія стану гілки на сервері; оновлюється `git fetch`.

Новий коміт: Git створює коміт з батьком = поточний, і **пересуває поточну гілку** на нього.

Файли спершу зберігаються як окремі «вільні» об'єкти (`objects/ab/cdef…`), а `git gc` (і push/fetch) пакує їх у **packfile** з дельта-стисненням — тому репозиторій компактніший, ніж здається.

```bash
git ls-files            # що в індексі
git ls-files -s         # + режим і хеш blob
# 100644 cc22473b… 0	README.md
git ls-tree HEAD        # дерево коміту
```

## 6. Перегляд історії й змін

### 6.1. git log

```bash
git log                       # повно: хеш, автор, дата, повідомлення
git log --oneline             # коротко: e490459 Add README
git log --oneline --graph --all   # граф гілок
git log -3                    # останні 3
git log --stat                # + які файли й скільки рядків
git log -p                    # + повний diff кожного коміту
git log --author=Alex
git log --since="2 weeks ago" --until="yesterday"
git log --grep="fix"          # за повідомленням
git log -S"functionName"      # коміти, що додали/видалили цей рядок ("pickaxe")
git log -- path/file.js       # історія файлу
git log main..feature         # коміти, які є у feature, але не в main
git log --oneline --decorate  # показати де гілки й теги
git log --pretty=format:'%h %an %ar %s'
git shortlog -sn HEAD         # скільки комітів у кожного автора
```

Приклад графа після злиття:

```
*   cbc6bfd Merge login
|\
| * 722dfc7 Add login
* | 5bcec55 Update README
|/
* 1bc103a Add math.js
* 39e4e8c Excite greeting
```

Формат `--pretty=format`: `%h` короткий хеш, `%H` повний, `%an` автор, `%ae` пошта, `%ar` «9 months ago», `%ad` дата, `%s` тема, `%b` тіло, `%d` гілки/теги.

### 6.2. Запис ревізій (як вказати коміт)

| запис | значення |
|---|---|
| `HEAD` | поточний коміт |
| `HEAD~1`, `HEAD~` | батько |
| `HEAD~3` | третій предок вздовж першого батька |
| `HEAD^2` | другий батько (у merge-коміті) |
| `main`, `v1.0`, `e490459` | гілка, тег, префікс хешу (мінімум 4 символи, однозначний) |
| `HEAD@{2}` | де був HEAD два переміщення тому (reflog) |
| `main@{yesterday}` | де була гілка вчора |
| `A..B` | коміти в B, яких немає в A |
| `A...B` | коміти, що є лише в одному з двох |
| `@{u}` або `@{upstream}` | віддалена гілка, яку відстежує поточна |

### 6.3. git diff — три порівняння

```bash
git diff                   # робоча директорія ПРОТИ індексу  (що ще не staged)
git diff --staged          # індекс ПРОТИ HEAD                (що піде в коміт); те саме --cached
git diff HEAD              # робоча директорія ПРОТИ HEAD     (усе незакомічене)
git diff A B               # між двома комітами/гілками
git diff main...feature    # зміни feature від точки розходження
git diff --stat            # лише зведення
git diff --name-only       # лише імена файлів
git diff --name-status HEAD~3 HEAD   # A (added), M, D, R
```

Після `git add` команда `git diff` порожня — зміни вже в індексі, їх показує `git diff --staged`:

```
diff --git a/app.js b/app.js
index 6687898..ea9bf1a 100644
--- a/app.js
+++ b/app.js
@@ -1 +1 @@
-console.log('hi')
+console.log('hi!')
```

Читаємо: `---` старий файл, `+++` новий, `@@ -1 +1 @@` — діапазон рядків (старий / новий), `-` видалено, `+` додано. Хеші `6687898..ea9bf1a` — це blob-и до й після.

### 6.4. git show і git blame

```bash
git show                  # останній коміт з diff
git show e490459          # конкретний коміт
git show v1.1             # тег
git show HEAD:README.md   # вміст файлу на коміті
git blame notes.txt       # хто й коли останнім змінив кожен рядок
# 8217a52e (Alex 2026-01-13 10:00:00 +0200 1) line one
# 1fdc8fe3 (Alex 2026-01-13 11:00:00 +0200 2) line TWO
# 8217a52e (Alex 2026-01-13 10:00:00 +0200 3) line three
git blame -L10,20 file.js  # лише рядки 10–20
```

## 7. Скасування змін (повний розбір)

Спершу визначте, **де** зміна і чи вона **вже у спільній історії**.

| ситуація | команда |
|---|---|
| відкинути зміну у файлі (не staged) | `git restore file` |
| прибрати файл з індексу (лишити зміни) | `git restore --staged file` |
| змінити останній коміт | `git commit --amend` |
| відмінити коміт, лишивши історію | `git revert <коміт>` |
| пересунути гілку назад | `git reset [--soft|--mixed|--hard] <коміт>` |
| видалити untracked файли | `git clean -n` (перегляд), `git clean -fd` |
| відновити «втрачене» | `git reflog` + `git reset --hard <хеш>` |

### 7.1. git restore

```bash
echo "oops" >> app.js
git status -s
#  M app.js
git restore app.js          # робоча копія повертається до індексу
git status -s               # чисто

git add app.js
git restore --staged app.js # з індексу прибрано, зміни у файлі лишились
git restore --source=HEAD~2 file.js   # взяти версію файлу з коміту
```

`git restore file` **безповоротно** стирає незакомічені зміни — їх не можна відновити.

### 7.2. git reset — три режими

`git reset <коміт>` пересуває поточну гілку на `<коміт>`. Режим визначає, що з індексом і робочою директорією:

| режим | HEAD/гілка | індекс | робоча директорія |
|---|---|---|---|
| `--soft` | пересунуто | не чіпає | не чіпає |
| `--mixed` (за замовч.) | пересунуто | скинуто до коміту | не чіпає |
| `--hard` | пересунуто | скинуто | **скинуто (зміни зникають)** |

```bash
git log --oneline -3
# 63afeeb r2
# af9ffac r1
# df52593 Add a.txt

git reset --soft HEAD~1     # коміт «r2» скасовано, зміни ЗАЛИШИЛИСЬ у staged
git status -s
# M  r.txt

git reset HEAD              # --mixed: зміни з індексу зняті, у файлі лишаються
git status -s
#  M r.txt

git reset --hard HEAD~1     # ще й робоча директорія повернулась
# HEAD is now at df52593 Add a.txt
```

`reset` **переписує історію гілки**. Для комітів, які вже у віддаленому репозиторії, використовуйте `revert`.

### 7.3. git revert

Створює **новий коміт**, що скасовує зміни вказаного. Історія лишається чесною, безпечно для спільних гілок:

```bash
git revert --no-edit HEAD
# [main 3d0ebb0] Revert "r2"
#  1 file changed, 1 deletion(-)
git log --oneline -3
# 3d0ebb0 Revert "r2"
# 63afeeb r2
# af9ffac r1
```

Для merge-коміту потрібен `-m 1` (обрати батька, який вважати «основним»).

### 7.4. git reflog — страхувальна сітка

`reflog` — локальний журнал усіх переміщень `HEAD` та гілок (зазвичай зберігається ~90 днів). Навіть після `reset --hard` коміти ще є:

```bash
git reflog -5
# df52593 HEAD@{0}: reset: moving to HEAD~1
# af9ffac HEAD@{1}: reset: moving to HEAD
# af9ffac HEAD@{2}: reset: moving to HEAD~1
# 63afeeb HEAD@{3}: commit: r2     # <- «втрачений» коміт
# af9ffac HEAD@{4}: commit: r1
git reset --hard 63afeeb          # повернули
```

Видалену гілку теж можна відновити: знайти її останній коміт у reflog і `git branch назва <хеш>`.

### 7.5. git clean

```bash
git clean -n        # показати, що буде видалено (dry run)
git clean -fd       # видалити untracked файли й папки
git clean -fdx      # + ігноровані файли
```

Видалені `clean` файли не потрапляють у reflog — спершу завжди `-n`.

## 8. Гілки

**Гілка** — рухомий вказівник на коміт. Створення, перемикання й видалення — миттєві.

```bash
git branch                  # список локальних, * = поточна
git branch -a               # + віддалені
git branch -vv              # + останній коміт і upstream
git branch feature          # створити (не перемикаючись)
git switch feature          # перемкнутись
git switch -c feature       # створити й перемкнутись
git switch -c fix abc1234   # створити від конкретного коміту
git checkout -b feature     # старий еквівалент switch -c
git branch -m new-name      # перейменувати поточну
git branch -d feature       # видалити (лише якщо злита)
git branch -D feature       # видалити примусово
git branch --merged         # які гілки вже злиті в поточну
git switch -                # назад на попередню гілку
```

`git switch` і `git restore` з'явились у Git 2.23, щоб розділити перенавантажену команду `git checkout` (яка і перемикала гілки, і відновлювала файли).

### 8.1. Detached HEAD

Якщо перейти на коміт, тег або `origin/main` напряму (`git switch --detach abc1234`), HEAD вказує не на гілку, а на коміт. Нові коміти не належать жодній гілці й «загубляться» після перемикання. Збережіть їх: `git switch -c rescue`.

### 8.2. Злиття (merge)

```bash
git switch main
git merge feature
```

**Fast-forward** — коли `main` — предок `feature` (в main не було нових комітів), Git просто пересуває вказівник:

```
Updating 39e4e8c..1bc103a
Fast-forward
 math.js | 1 +
 1 file changed, 1 insertion(+)
```

**Трьохстороннє злиття (three-way)** — коли гілки розійшлись. Git бере три знімки: обидва кінці й **спільного предка (merge base)**, і створює **merge-коміт з двома батьками**:

```
Merge made by the 'ort' strategy.
 login.js | 1 +
```

```
*   cbc6bfd Merge login
|\
| * 722dfc7 Add login
* | 5bcec55 Update README
|/
* 1bc103a Add math.js
```

Опції: `--no-ff` (завжди створювати merge-коміт, навіть коли можна fast-forward), `--ff-only` (відмовитись, якщо потрібен merge-коміт), `--squash` (зібрати всі зміни гілки в індекс без merge-коміту).

### 8.3. Конфлікти

Конфлікт — коли обидві гілки змінили **одне й те саме місце**:

```bash
git merge fix-a
# Auto-merging app.js
# CONFLICT (content): Merge conflict in app.js
# Automatic merge failed; fix conflicts and then commit the result.
git status
# You have unmerged paths.
#   (fix conflicts and run "git commit")
#   (use "git merge --abort" to abort the merge)
# Unmerged paths:
#         both modified:   app.js
```

Вміст файлу з маркерами:

```
<<<<<<< HEAD
console.log('B')
=======
console.log('A')
>>>>>>> fix-a
```

Верхня частина (до `=======`) — ваша гілка (HEAD), нижня — та, що зливаємо. Розв'язання:

1. відредагувати файл: лишити потрібне й **видалити маркери**;
2. `git add app.js` (позначити розв'язаним);
3. `git commit` (завершити злиття).

Скасувати: `git merge --abort` — повертає стан до `git merge`. Допомагає: `git mergetool`, `git checkout --ours file` / `--theirs file`, `git diff` під час конфлікту, `rerere`.

## 9. Rebase, cherry-pick, інтерактивне переписування

### 9.1. Rebase

`rebase` **відтворює** ваші коміти поверх іншої бази, створюючи їх копії з новими хешами:

```bash
git switch feat-rebase
git rebase main
# Successfully rebased and updated refs/heads/feat-rebase.
```

Було: `main`: `A–B–C`, `feature`: `A–B–D–E`. Після `rebase main`: `A–B–C–D′–E′`. Історія лінійна, без merge-коміту. Потім `git switch main && git merge feature` — fast-forward.

**Merge чи rebase?**

| | merge | rebase |
|---|---|---|
| історія | зберігає справжній хід подій, merge-коміти | лінійна й чиста |
| безпека | не переписує коміти | переписує (нові хеші) |
| конфлікти | один раз | можливо на кожному коміті |

**Золоте правило: не робіть rebase комітів, які вже опубліковані й на яких працюють інші.**

Конфлікт під час rebase: виправити файл → `git add` → `git rebase --continue`; пропустити коміт `--skip`; скасувати все `--abort`.

### 9.2. Інтерактивний rebase

```bash
git rebase -i HEAD~4
```

Відкривається список комітів (старіші зверху) з командами:

```
pick   a1b2c3d Add login form
squash e4f5g6h Fix typo           # злити з попереднім
reword 1a2b3c4 Add validation     # змінити повідомлення
drop   9z8y7x6 Debug logging      # видалити коміт
fixup  5d6e7f8 Oops               # злити, відкинувши повідомлення
edit   0a1b2c3 Big change         # зупинитись для правок
```

Також можна змінювати порядок рядків. Рецепт «акуратний PR»: чернеткові коміти → `squash`/`fixup` → один-два логічних коміти. Швидкий спосіб: `git commit --fixup <хеш>` + `git rebase -i --autosquash`.

### 9.3. cherry-pick

Копіює **один коміт** на поточну гілку (новий хеш):

```bash
git cherry-pick 96fb99d
# [main a4c6d8a] Fix typo
#  1 file changed, 1 insertion(+)
git cherry-pick A^..B       # діапазон
git cherry-pick -x <хеш>    # додати у повідомлення «(cherry picked from commit …)»
```

Типово: хотфікс із однієї гілки потрібен в іншій.

## 10. Віддалені репозиторії

**Remote** — псевдонім URL іншого репозиторію. Стандартне ім'я — `origin`.

```bash
git clone https://github.com/user/repo.git         # скопіювати весь репозиторій (з історією)
git clone --depth 1 <url>                          # лише останній стан (shallow clone)
git remote add origin <url>                        # зв'язати локальний репозиторій
git remote -v                                      # список remotes
# origin	../remote.git (fetch)
# origin	../remote.git (push)
git remote show origin                             # детально про remote
git remote rename origin upstream
git remote remove origin
```

### 10.1. fetch, pull, push

```bash
git fetch                  # завантажити нові коміти й оновити origin/*, НЕ чіпаючи ваших гілок
# From ../remote
#    a4c6d8a..375cf20  main       -> origin/main
git status
# Your branch is behind 'origin/main' by 3 commits, and can be fast-forwarded.
git pull                   # = git fetch + git merge origin/main
git pull --rebase          # = git fetch + git rebase origin/main
git push                   # відправити поточну гілку
git push -u origin main    # відправити й запам'ятати upstream (tracking)
# branch 'main' set up to track 'origin/main'.
```

`fetch` завжди безпечний (нічого не змінює у вашій роботі) — перевіряйте, що прийшло, а потім зливайте. `pull` — це швидкий спосіб зробити fetch + integrate.

**Tracking-гілка** (upstream) — зв'язок локальної `main` з `origin/main`; завдяки йому `git status` каже «behind/ahead», а `git push`/`pull` не потребують аргументів. `git branch -vv` показує: `main 375cf20 [origin/main] More`.

### 10.2. Відхилений push

Коли на сервері є коміти, яких у вас немає:

```
! [rejected]        main -> main (fetch first)
hint: Updates were rejected because the remote contains work that you do not
hint: have locally.
```

Рішення: `git pull --rebase` (ваші коміти ляжуть поверх чужих), потім `git push`:

```
$ git pull --rebase
Rebasing (1/1)Successfully rebased and updated refs/heads/main.
* 72d2237 B from clone
* a77f1b8 A from play
```

### 10.3. Force push

Після rebase/amend історія гілки змінилась, і звичайний push відхиляється. Примусово:

```bash
git push --force-with-lease     # безпечніше: відмовиться, якщо хтось встиг запушити ще щось
git push --force                # без перевірок — небезпечно
```

`--force-with-lease` перевіряє, що віддалена гілка там, де ви її востаннє бачили (`stale info` — відмова). Ніколи не робіть force push у спільну `main`.

### 10.4. Інше про remotes

- `git push origin feature` — відправити гілку; `git push origin --delete feature` — видалити віддалену.
- `git fetch --prune` — прибрати локальні `origin/*` для гілок, видалених на сервері.
- **Fork** (GitHub): ваша копія чужого репозиторію; зазвичай `origin` = ваш fork, `upstream` = оригінал.
- `git push` отримує/відправляє лише потрібні об'єкти — дельти в packfile.
- Тільки-серверний «голий» репозиторій: `git init --bare` (без робочої директорії) — що лежить на серверах.

## 11. Stash, теги та інші інструменти

### 11.1. stash

Швидко прибрати незакомічені зміни, щоб перемкнутись на іншу задачу:

```bash
git stash push -m "wip app"
# Saved working directory and index state On main: wip app
git stash list
# stash@{0}: On main: wip app
git stash pop         # застосувати й видалити зі списку
git stash apply       # застосувати, залишивши в списку
git stash drop        # видалити
git stash -u          # включити і untracked файли
git stash show -p stash@{0}
```

Без `-u` **untracked файли не потрапляють у stash** — у нашому прикладі `scratch.txt` лишився в робочій директорії.

### 11.2. Теги

```bash
git tag v1.0                      # легкий тег (просто вказівник)
git tag -a v1.1 -m "Release 1.1"  # анотований: окремий об'єкт з автором, датою, повідомленням
git tag                           # список
git show v1.1
git push origin v1.1              # теги не відправляються за замовчуванням
git push origin --tags
git tag -d v1.0                   # видалити локально
git describe --tags               # v1.1-7-g44746c1  = тег v1.1 + 7 комітів + хеш
```

Для релізів використовують анотовані теги й семантичне версіонування `MAJOR.MINOR.PATCH`.

### 11.3. .gitignore

Файл зі шаблонами того, що Git не відстежує:

```gitignore
node_modules/      # папка
*.log              # за маскою
.env               # секрети
!important.log     # виняток
/build             # лише в корені
**/temp/           # в будь-якому місці
```

```bash
git check-ignore -v debug.log
# .gitignore:2:*.log	debug.log      # який рядок спрацював
git rm --cached file     # перестати відстежувати вже закомічений файл (залишивши на диску)
```

`.gitignore` діє лише на **ще не відстежувані** файли; уже закомічений файл треба зняти з відстеження (`git rm --cached`). Глобальний ігнор: `git config --global core.excludesFile ~/.gitignore_global`. Секрети (`.env`, ключі) ніколи не комітьте.

### 11.4. rm і mv

```bash
git rm file.txt            # видалити файл і зафіксувати видалення
git rm --cached file.txt   # лише з індексу
git mv old.txt new.txt     # перейменування (Git сам визначає rename за схожістю вмісту)
```

### 11.5. bisect — пошук коміту, що зламав

Бінарний пошук по історії:

```bash
git bisect start
git bisect bad            # поточний коміт поганий
git bisect good v1.0      # цей був хороший
# Bisecting: 1 revision left to test after this (roughly 1 step)
# ... перевіряєте, потім: git bisect good / git bisect bad
git bisect reset          # завершити
git bisect run npm test   # автоматично
```

Для 1000 комітів — близько 10 перевірок.

### 11.6. Інше

- `git worktree add ../fix fix-branch` — друга робоча директорія того ж репозиторію (дві гілки одночасно без stash).
- **Submodules** — вкладені репозиторії: `git submodule add <url>`, `git submodule update --init`.
- **Hooks** — скрипти в `.git/hooks`: `pre-commit` (лінтер), `commit-msg`, `pre-push`. Поширюють через Husky/lefthook.
- `.gitattributes` — правила для шляхів: перенос рядків, бінарні файли, **Git LFS** для великих файлів.
- `git gc` — упакувати об'єкти; `git count-objects -v` — розмір; `git fsck` — перевірка цілісності.
- Підпис комітів: `git commit -S` (GPG або SSH-ключ) → «Verified» на GitHub.

## 12. Робочі процеси та практики

**Feature branch + pull request** (найпоширеніший):

1. `git switch -c feature/login` від свіжого `main`;
2. невеликі коміти;
3. `git push -u origin feature/login`, відкрити PR;
4. рев'ю, виправлення, CI;
5. merge/squash у `main`, видалити гілку.

Інші моделі: **GitHub Flow** (main завжди розгортувана + короткі гілки), **trunk-based** (дуже короткі гілки, часті інтеграції, feature flags), **GitFlow** (develop, release, hotfix — для версійних релізів).

**Хороше повідомлення коміту:**

```
Add rate limiting to login endpoint

Previously the endpoint accepted unlimited attempts, which allowed
brute-force attacks. Limit to 5 attempts per minute per IP.

Closes #123
```

- перший рядок ≤ 50 символів, в наказовому способі («Add», «Fix», а не «Added»);
- порожній рядок, потім **чому**, а не що (що видно з diff);
- **Conventional Commits**: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:` (+ `!` для breaking change) — для автоматичних changelog і версій.
- Один коміт — одна логічна зміна (**атомарні коміти**); код у кожному коміті має збиратись.
- Назви гілок: `feature/…`, `fix/…`, `chore/…` без пробілів.

## 13. Безпека й типові проблеми

**Закомітили секрет (пароль, токен).** Видалення в наступному коміті **не допомагає** — він лишається в історії. Дії: 1) негайно **відкликати/змінити** секрет; 2) за потреби очистити історію (`git filter-repo` або BFG) і force push; 3) додати файл у `.gitignore`.

**Закомітили не на ту гілку.** `git branch rescue` (зберегти коміти) → `git reset --hard HEAD~N` (на старій гілці) → `git switch правильна` → `git cherry-pick`/merge rescue.

**«Втратив коміти».** `git reflog` → знайти хеш → `git branch recovered <хеш>`.

**Порожня папка не комітиться** — Git відстежує файли, не папки: покладіть у неї `.gitkeep`.

**Різні кінці рядків (CRLF/LF)** — налаштуйте `core.autocrlf` або `.gitattributes`.

**Регістр у назвах на macOS/Windows** — файлові системи нечутливі до регістру (`core.ignorecase = true`), перейменування `a.txt` → `A.txt` робіть через `git mv`.

## 14. Шпаргалка

| завдання | команда |
|---|---|
| створити репозиторій | `git init` / `git clone <url>` |
| що змінилось | `git status`, `git diff`, `git diff --staged` |
| зберегти | `git add <файли>` → `git commit -m "..."` |
| історія | `git log --oneline --graph --all` |
| нова гілка | `git switch -c name` |
| злити | `git merge name` |
| лінійна історія | `git rebase main` |
| відмінити у файлі | `git restore file` |
| зняти з індексу | `git restore --staged file` |
| скасувати коміт безпечно | `git revert <hash>` |
| відкотити гілку | `git reset --hard <hash>` |
| відновити втрачене | `git reflog` |
| отримати зміни | `git fetch` / `git pull` |
| відправити | `git push` |
| сховати робоче | `git stash` / `git stash pop` |
| мітка релізу | `git tag -a v1.0 -m "..."` |
| хто змінив рядок | `git blame file` |
| знайти коміт з багом | `git bisect` |

## Підсумок

- Git — розподілена система контролю версій: кожен клон має повну історію; працює офлайн; GitHub — лише хостинг.
- Зберігає **знімки**, а не різниці; об'єкти blob/tree/commit/tag адресуються SHA-хешем вмісту, тому історія цілісна й незмінна (зміна = нові хеші).
- Три області: робоча директорія → індекс (`git add`) → репозиторій (`git commit`); файл буває untracked/modified/staged/committed.
- Гілка — вказівник на коміт, HEAD — «де я зараз»; новий коміт пересуває поточну гілку.
- `merge` (fast-forward або three-way з merge-комітом), `rebase` (лінійна історія, нові хеші; не для опублікованих комітів), `cherry-pick` (копія одного коміту).
- Скасування: `restore` (файли), `reset --soft/--mixed/--hard` (пересунути гілку), `revert` (новий скасовуючий коміт), `reflog` (відновити).
- Віддалені: `clone`, `remote`, `fetch` (безпечно), `pull` (= fetch + merge/rebase), `push`, upstream tracking, `--force-with-lease`.
- Інструменти: `stash`, `tag`, `.gitignore`, `bisect`, `blame`, `worktree`, hooks.
- Практики: невеликі атомарні коміти з осмисленими повідомленнями, feature-гілки + PR, секрети не комітити.
