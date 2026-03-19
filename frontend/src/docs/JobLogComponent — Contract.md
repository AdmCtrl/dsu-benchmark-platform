# Job Log — Contract

## Назначение

Подсистема Job Log отвечает за:

* приём логов задач (`JobEvent.LOG`)
* хранение логов по `jobId`
* восстановление UI-состояния при повторном открытии лога
* корректную прокрутку при поступлении новых строк

Подсистема **не управляет жизненным циклом компонентов** и **не зависит от UI-фреймворка**.

---

## Архитектурные роли

### JobLogStore (domain state)

**Ответственность:**

* Хранение логов по `jobId`
* Хранение scroll-позиций по `jobId`
* Чисто вычислительная логика принятия решений по scroll

**НЕ отвечает за:**

* DOM
* прокрутку
* тайминги
* жизненный цикл компонентов
* подписки UI

**API (контракт):**

```ts
logsFor(jobId: string): Observable<string[]>
append(jobId: string, line: string): void
clearLogs(jobId: string): void

setScroll(jobId: string, value: number): void
getSavedScroll(jobId: string): number | undefined

resolveScrollAction(
  jobId: string,
  prev: string[],
  curr: string[]
): 'NONE' | 'RESTORE' | 'SCROLL_TO_BOTTOM'
```
**Инварианты:**
* `JobLogStore` живёт `providedIn: 'root'`
* Store **не очищается автоматически**
* Данные не зависят от наличия UI
* Store не знает, открыт лог или нет
---
### JobLogComponent (presentation / UI)
**Ответственность:**
* Подписка на `logsFor(jobId)`
* Анализ изменений (`pairwise(prev, curr)`)
* Реакция на `ScrollAction`
* Управление DOM-прокруткой
* Сохранение scroll-позиции перед destroy  

**НЕ отвечает за:**
* хранение логов
* очистку логов без user-intent
* бизнес-логику
* SSE / backend
**Жизненный цикл:**
* Компонент **может свободно создаваться и уничтожаться**
* Уничтожение компонента **не должно влиять на данные**
* Повторное создание должно корректно восстанавливать UI  

**Допустимые действия:**
```ts
store.setScroll(jobId, scrollTop)
store.resolveScrollAction(...)
```
**Запрещённые действия:**  
❌ `store.clearLogs(jobId)` в `ngOnDestroy`  
❌ владение состоянием логов  
❌ side-effects в store  
---
## Scroll logic contract
Scroll-логика **разделена по слоям**:
### Store
* принимает `prev` и `curr`
* возвращает декларативное решение:
```ts
'NONE' | 'RESTORE' | 'SCROLL_TO_BOTTOM'
```
### Component
* интерпретирует решение
* выполняет DOM-действия:
```ts
requestAnimationFrame(...)
element.scrollTop = ...
```

Store **никогда не выполняет UI-операции**.  

---
## Взаимодействие с событиями
* Логи добавляются **только извне** (`JobEventsFacade → JobLogStore.append`)
* `JobLogComponent` не знает источник логов
* SSE / Events не знают о UI

---
## Очистка логов
Очистка логов возможна **только** в следующих случаях:
* явное действие пользователя (например, кнопка «Clear log»)
* управляемая бизнес-логика (например, после `FINISHED`)  

Очистка **НЕ** привязана к lifecycle компонентов.

---
## Гарантии
* Закрытие / открытие лога **не теряет данные**
* Scroll восстанавливается при повторном открытии
* Новые строки всегда корректно прокручивают лог
* UI может быть уничтожен без побочных эффектов

---
## Статус
* Контракт **зацементирован**
* Реализация соответствует контракту
* Возможен ввод фасада (`JobLogService`) без изменения API
