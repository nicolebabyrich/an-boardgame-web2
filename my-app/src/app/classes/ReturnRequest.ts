export class ReturnRequest {
  constructor(
    public id: number = 0,
    public code: string = '',
    public orderId: number = 0,
    public userId: number = 0,
    public productId: number = 0,
    public type: string = 'RETURN',
    public quantity: number = 1,
    public reason: string = '',
    public evidenceName: string | null = null,
    public status: string = 'PENDING',
    public adminNote: string = '',
    public createdAt: string = '',
    public evidenceImage: string | null = null,
    public evidenceImages: string[] = []
  ) {}
}

export class InventoryTransaction {
  constructor(
    public id: number = 0,
    public productId: number = 0,
    public orderId: number | null = null,
    public type: string = 'IMPORT',
    public change: number = 0,
    public before: number = 0,
    public after: number = 0,
    public reason: string = '',
    public createdAt: string = '',
    public docCode?: string,
    public batchCode?: string,
    public expiryDate?: string,
    public warehouseLocation?: string,
    public performer?: string
  ) {}
}
