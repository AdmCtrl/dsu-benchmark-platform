# JobLogStore — Contract

`JobLogStore` — **единственный источник правды для логов job’ов и связанного UI-state (scroll)**.

Он **не знает**, кто и зачем читает логи.
Он **не принимает решений**, только хранит и отдаёт данные.

---

## Responsibilities

✅ Хранение логов по `jobId`  
✅ Инкрементальное добавление строк  
✅ Очистка логов конкретного job  
✅ Хранение UI-состояния scroll (позиция)  
✅ Предоставление реактивных селекторов  

---

## Explicitly NOT responsible for

❌ DOM / scrollTop  
❌ requestAnimationFrame  
❌ pairwise / анализ diff’ов  
❌ Решения *когда* скроллить  
❌ Жизненный цикл компонентов  

> Store **хранит**, но **не интерпретирует**.

---

## Public API (cemented)

```ts
logsFor(jobId: string): Observable<string[]>;

append(jobId: string, line: string): void;
clearLogs(jobId: string): void;

// UI state (scroll)
getScroll(jobId: string): number | undefined;
setScroll(jobId: string, value: number): void;
```

---

## Invariants

* Логи **никогда не мутируются**
* Новый лог → всегда новый массив
* Scroll — **best effort**, не гарантирован
* Scroll живёт **дольше компонента**
* Очистка логов **не трогает scroll**, если явно не нужно

---

## Usage rules

* ❗ `JobLogStore` **НЕ используется напрямую компонентами**
* ❗ Единственный потребитель Store — `JobLogService`
* ❗ Фасад может писать логи, но **не читает scroll**
