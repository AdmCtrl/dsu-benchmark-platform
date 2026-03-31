## FileUploaderComponent — Contract

`FileUploaderComponent` — **UI-компонент инициации Job**, отвечающий за:

* загрузку входного файла
* создание нового Job
* ручную серверную синхронизацию (repair)

---

## Responsibilities

✅ Приём файла от пользователя – Обрабатывает выбор файла в `input[type="file"]`
– Показывает превью имени файла
– Делегирует Upload и Repair в `JobService`
– Обновляет `JobStore` (setAll) после успешного Repair
– **🆕 Контракт визуализации**:
    – Стиль **Glassmorphism** (полупрозрачный фон, размытие)
    – Интерактивные кнопки (**Browse**, **Create**, **Force Sync**)
    – Кнопка **Create Job** превращается в триггер для `uiState.run()`
✅ Вызов API (`JobService`)  
✅ Первичное добавление / обновление `JobStore`  
✅ Управление локальным UI-состоянием (busy / message)  

---

## Explicitly NOT responsible for

❌ SSE  
❌ Статусы выполнения Job  
❌ Многозадачность  
❌ Логи  
❌ Derived-состояние Jobs  
❌ Бизнес-логику Job  

---

## Position in Architecture

```text
[ UI ]
  └─ FileUploaderComponent
        ↓
[ Service ]
  └─ JobService (HTTP)
        ↓
[ State ]
  └─ JobStore
```

⚠️ **Facade здесь не используется осознанно**

Причина:

> FileUploader не интерпретирует события и не управляет runtime-состоянием  
> Он лишь инициирует операции и кладёт результат в Store  

---

## Internal State

```ts
private _busy = new BehaviorSubject<boolean>(false);
private _message = new BehaviorSubject<string>('');
```

Назначение:

* `_busy` — блокировка UI на время HTTP-запросов
* `_message` — пользовательская обратная связь

Инварианты:

* состояние **локально** и **не сохраняется**
* не синхронизируется с глобальным Store
* сбрасывается при пересоздании компонента

---

## Public Template API

```html
<input type="file" ... />
<button>Create Job</button>
<button>Repair Jobs</button>
```

Правила:

* кнопки заблокированы при `busy === true`
* `repair` не требует файла (можно обсудить отдельно, но сейчас допустимо)

---

## Behaviour Contracts

### `upload()`

```ts
jobService.createJob(file)
  → Job
  → jobStore.add(job)
```

Инварианты:

* компонент* 🔌 **вызывает JobService** для заливки CSV
* 🔌 **вызывает Repair** для синхронизации после загрузки
* 🚫 **не знает про SSE**
* 🚫 **не знает про JobEventsFacade**
* **🆕 Использует `UiStateService`** для информирования о прогрессе заливки

---

### `repair()`

```ts
jobService.repair()
  → Job[]
  → jobStore.setAll(jobs)
```

Инварианты:

* это **административная операция**
* полностью пересобирает клиентское состояние Jobs
* допустима только как ручное действие

---

## Why JobStore is used directly

Осознанное решение:

* `JobStore` — source of truth для UI
* `FileUploader` не влияет на runtime execution
* нет риска race-condition

Правило:

> **Facade нужен там, где есть интерпретация событий и конкуренция состояний**

Здесь этого нет.

---

## Potential future refactors (not now)

⚠️ **НЕ часть текущего контракта**, но допустимо в будущем:

* вынести busy/message в `UiStateService`
* запретить `repair()` при активных RUNNING jobs
* заменить `BehaviorSubject` на `signal()`

---

## Core invariant (cemented)

> **FileUploaderComponent — это “command UI”, а не часть job lifecycle.**

Он:

* запускает действия
* не сопровождает их
* не отслеживает выполнение

---

## TL;DR

> `FileUploaderComponent` — простой UI-триггер,  
> который создаёт и синхронизирует Jobs,  
> **не участвуя** в их выполнении.  

