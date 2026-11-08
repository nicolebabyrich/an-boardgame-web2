export class Voucher {
  constructor(
    public code: string = '',
    public name: string = '',
    public type: 'percentage' | 'fixed' | 'shipping' = 'percentage',
    public value: number = 0,
    public maxDiscount: number | null = null,
    public minOrder: number = 0,
    public startAt: string = '',
    public endAt: string = '',
    public usageLimit: number = 100,
    public usedCount: number = 0,
    public status: string = 'ACTIVE',
    public usedByUserIds: number[] = []
  ) {}
}
