import { describe, it, expect } from 'vitest';
import { detectProjectByDescription } from '../projectAutoDetect';

describe('detectProjectByDescription', () => {
  it.each([
    ['Закупка конфет в офис', 'Склад / Офис'],
    ['Купили бумагу для офиса', 'Склад / Офис'],
    ['Закупка коробок на склад', 'Склад / Офис'],
    ['Офисные принадлежности', 'Склад / Офис'],
    ['Доставка на склад материалов', 'Склад / Офис'],
  ])('"%s" -> %s', (desc, expected) => {
    const result = detectProjectByDescription(desc);
    expect(result.project).toBe(expected);
    expect(result.confidence).toBe(1.0);
    expect(result.reason).toBeTruthy();
  });

  it.each([
    ['Реклама в Instagram'],
    ['Такси до площадки'],
    ['Оплата кейтеринга'],
    [''],
  ])('"%s" -> null', (desc) => {
    const result = detectProjectByDescription(desc);
    expect(result.project).toBeNull();
    expect(result.confidence).toBe(0);
  });
});
