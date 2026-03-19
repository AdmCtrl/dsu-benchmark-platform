## Job — Domain Model Contract

`Job` — **доменная модель**, представляющая задание, управляемое сервером и отображаемое в UI.

Модель является **immutable-by-convention**:
экземпляры могут обновляться через `JobStore`, но логика изменения состояния **вне модели**.

---

### Source of truth

`Job` создаётся **исключительно** из DTO сервера:

```ts
new Job(dto)
```

Модель **не валидирует** данные и **не трансформирует** бизнес-логику —
она отражает серверное состояние + предоставляет удобные derived-геттеры.

---

### Structure

```ts
class Job {
  id: string;
  inputFileName: string;
  outputFileName?: string;

  status: string;

  createdAt: string;
  startedAt?: string;
  finishedAt?: string;

  errorMessage?: string;
}
```

#### Notes

* Все даты хранятся **в строковом виде (ISO)** — как пришли с сервера
* Преобразование в `Date` выполняется **только через геттер**
* `status` — строка, а не enum  
  (сервер — единственный источник допустимых значений)

---

### Derived properties (геттеры)

```ts
get isDone(): boolean
```

Возвращает `true`, если:

```ts
status === 'FINISHED'
```

Используется **только в UI** для удобства.

---

```ts
get hasError(): boolean
```

Возвращает `true`, если присутствует `errorMessage`.

❗ Не равнозначно `status === 'ERROR'`  
(сервер может передать ошибку разными способами).

---

```ts
get createdDate(): Date
```

Ленивая конвертация:

```ts
new Date(createdAt)
```

Используется **только для отображения**.

---

### Explicitly NOT responsible for

❌ Изменение статуса  
❌ Решения RUNNING / FINISHED  
❌ Учёт параллельных задач  
❌ Тайминги выполнения  
❌ Логи / прогресс / UI-состояние  

Вся оркестрация выполняется в:

* `JobEventsFacade`
* `TaskStore`

---

### Invariants

* `Job` **не знает** о `Task`
* `Job` **не знает** о логах
* `Job.status` может быть **переопределён фасадом**  
  (на основе `TaskStore`)
* Модель **допускает временно неконсистентное состояние**  
  (например, `status = RUNNING`, но `startedAt` ещё нет)

---

### Why this model is intentionally simple

* Сервер — источник истины
* Клиент — реактивный потребитель
* Бизнес-правила живут **в фасадах и сторах**
* Модель — **тонкий доменный контейнер**

Это предотвращает:

* дублирование логики
* race-condition
* расхождение UI и backend
