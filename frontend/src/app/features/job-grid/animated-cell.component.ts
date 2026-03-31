import { Component, Input, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-animated-cell',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="cell-container">
      <span class="current-value" [class.pulsing]="isPulsing">{{ value }}</span>

      <span *ngFor="let ghost of ghosts" class="ghost-value">
        {{ ghost.text }}
      </span>
    </div>
  `,
  styles: [`
    .cell-container {
      position: relative;
      display: inline-block;
      width: 100%;
    }

    .current-value {
      display: inline-block;
      transition: color 0.3s;
    }

    .current-value.pulsing {
      animation: pulseNewValue 2.4s ease-in-out 2; /* В два раза медленнее: 2 раза по 2.4с = 4.8с */
      color: white;
      text-shadow: 0 0 8px rgba(255, 255, 255, 0.5);
    }

    @keyframes pulseNewValue {
      0% { transform: scale(1); }
      50% { transform: scale(1.3); }
      100% { transform: scale(1); }
    }

    .ghost-value {
      position: absolute;
      top: 0;
      left: 0;
      color: var(--accent-blue);
      font-weight: bold;
      text-shadow: 0 0 8px rgba(59, 130, 246, 0.6);
      pointer-events: none; /* Чтобы не мешал кликам */
      white-space: nowrap;
      z-index: 10;
      /* Запуск анимации исчезновения */
      animation: floatAway 4.8s cubic-bezier(0.25, 1, 0.5, 1) forwards;
    }

    @keyframes floatAway {
      0% {
        opacity: 1;
        transform: translate(0, 0) scale(1);
      }
      100% {
        opacity: 0;
        transform: translate(20px, -15px) scale(1.3); /* Вправо-вверх + увеличение */
      }
    }
  `]
})
export class AnimatedCellComponent implements OnChanges {
  @Input() value: any;

  // Массив для хранения старых значений, пока они анимируются
  ghosts: { id: number, text: any }[] = [];
  private ghostIdCounter = 0;
  isPulsing = false;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    const valueChange = changes['value'];

    // Если значение изменилось (и это не самая первая инициализация)
    if (valueChange && !valueChange.isFirstChange()) {
      const oldValue = valueChange.previousValue;

      if (oldValue !== undefined && oldValue !== null && oldValue !== this.value) {
        const id = this.ghostIdCounter++;
        this.ghosts.push({ id, text: oldValue });
        this.isPulsing = true;

        // Удаляем "призрака" из DOM ровно через 4800мс
        setTimeout(() => {
          this.ghosts = this.ghosts.filter(g => g.id !== id);
          if (this.ghosts.length === 0) {
            this.isPulsing = false;
          }
          this.cdr.markForCheck(); // Сообщаем Angular, что нужно обновить view
        }, 4800);
      }
    }
  }
}
