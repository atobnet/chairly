import { describe, it, expect } from 'vitest'
import { calcRefundRate } from '../cancel-policy'

/**
 * 基準時刻: JST 2024-11-15 12:00:00 = UTC 2024-11-15T03:00:00Z
 * この時刻を注入することでテストを日付に依存しない形にする
 */
const BASE_NOW = new Date('2024-11-15T03:00:00Z') // JST: 2024-11-15 12:00

describe('calcRefundRate', () => {

  describe('基本的な返金率', () => {
    it('当日 (diffDays=0) は 0%', () => {
      expect(calcRefundRate('2024-11-15', BASE_NOW)).toBe(0.0)
    })

    it('1日前 (diffDays=1) は 50%', () => {
      expect(calcRefundRate('2024-11-16', BASE_NOW)).toBe(0.5)
    })

    it('2日前 (diffDays=2) は 50% [境界値]', () => {
      expect(calcRefundRate('2024-11-17', BASE_NOW)).toBe(0.5)
    })

    it('3日前 (diffDays=3) は 70% [境界値]', () => {
      expect(calcRefundRate('2024-11-18', BASE_NOW)).toBe(0.7)
    })

    it('6日前 (diffDays=6) は 70% [境界値]', () => {
      expect(calcRefundRate('2024-11-21', BASE_NOW)).toBe(0.7)
    })

    it('7日前 (diffDays=7) は 100% [境界値]', () => {
      expect(calcRefundRate('2024-11-22', BASE_NOW)).toBe(1.0)
    })

    it('10日前 (diffDays=10) は 100%', () => {
      expect(calcRefundRate('2024-11-25', BASE_NOW)).toBe(1.0)
    })

    it('過去日 (diffDays=-1) は 0%', () => {
      expect(calcRefundRate('2024-11-14', BASE_NOW)).toBe(0.0)
    })

    it('大幅な過去日 (diffDays=-30) は 0%', () => {
      expect(calcRefundRate('2024-10-16', BASE_NOW)).toBe(0.0)
    })
  })

  describe('JST基準バグ再発防止（UTC/JST境界値）', () => {
    /**
     * バグ再現ケース:
     * UTC 2024-11-14T15:01:00Z = JST 2024-11-15 00:01:00（日付が変わった直後）
     * bookedDate='2024-11-15' は JST基準で「当日」→ 0%
     * もしUTC基準で計算すると '2024-11-15' - '2024-11-14' = 1日 → 50% になってしまう（バグ）
     */
    it('JSTで日付が変わった直後(00:01)は当日扱い(0%)', () => {
      const nowJustAfterMidnightJST = new Date('2024-11-14T15:01:00Z') // JST: 2024-11-15 00:01
      expect(calcRefundRate('2024-11-15', nowJustAfterMidnightJST)).toBe(0.0)
    })

    /**
     * JSTで前日23:59:00 の場合、翌日の予約は「前日キャンセル」= 50%
     * UTC: 2024-11-14T14:59:00Z = JST: 2024-11-14 23:59:00
     */
    it('JSTで前日23:59は翌日予約に対して50%返金', () => {
      const nowBeforeMidnightJST = new Date('2024-11-14T14:59:00Z') // JST: 2024-11-14 23:59
      expect(calcRefundRate('2024-11-15', nowBeforeMidnightJST)).toBe(0.5)
    })

    /**
     * JSTで当日0:00ちょうど = UTC前日15:00:00
     * bookedDate=当日 は 0%
     */
    it('JSTで当日0:00ちょうどは当日扱い(0%)', () => {
      const nowMidnightJST = new Date('2024-11-14T15:00:00Z') // JST: 2024-11-15 00:00
      expect(calcRefundRate('2024-11-15', nowMidnightJST)).toBe(0.0)
    })

    /**
     * JSTで夜23:59でも7日後の予約は100%返金
     */
    it('JSTで23:59でも7日後の予約は100%返金', () => {
      const nowLateNightJST = new Date('2024-11-14T14:59:00Z') // JST: 2024-11-14 23:59
      expect(calcRefundRate('2024-11-21', nowLateNightJST)).toBe(1.0)
    })
  })

  describe('now引数の省略', () => {
    it('now省略時は現在時刻を使用する（過去日は常に0%）', () => {
      expect(calcRefundRate('2020-01-01')).toBe(0.0)
    })

    it('now省略時は現在時刻を使用する（十分先の未来は100%）', () => {
      expect(calcRefundRate('2099-12-31')).toBe(1.0)
    })
  })
})
