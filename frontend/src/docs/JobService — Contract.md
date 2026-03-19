### 📦 JobService — контракт

**Назначение:**
Взаимодействие с backend API для операций над `Job`.

**Гарантии:**

* Все методы возвращают `Observable`
* Все ответы backend приводятся к доменной модели `Job`
* Service **не хранит состояние**
* Service **не подписывается**
* Service **не знает о Store / Facade**

---

### 📘 Публичный API

```ts
createJob(file: File): Observable<Job>
list(): Observable<Job[]>
get(id: string): Observable<Job>
run(id: string, body?): Observable<any>
delete(id: string): Observable<void>
log(id: string): Observable<string>
outputLink(id: string): string
repair(): Observable<Job[]>
```

---

### ❌ Чего здесь не должно быть

* `setAll`
* `subscribe()`
* `BehaviorSubject`
* `events$`
* `JobStore`, `TaskStore`, `Facade`
