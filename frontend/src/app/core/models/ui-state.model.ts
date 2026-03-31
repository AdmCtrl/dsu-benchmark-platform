export type UiMessageType = 'info' | 'success' | 'error';

export interface UiMessage {
  id: number;
  text: string;
  type: UiMessageType;
  sticky: boolean; // Ошибка — true (не пропадает сама), info/success — false
  progress?: number; // 0-100%
}
