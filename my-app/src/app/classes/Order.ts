export interface OrderItem {
  productId: number;
  quantity: number;
  unitPrice: number;
  attribute?: string;
}

export interface OrderAddressSnapshot {
  receiverName: string;
  receiverPhone: string;
  detail: string;
}

export interface OrderTimelineEntry {
  status: string;
  at: string;
}

export interface CancellationRequest {
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reason: string;
  requestedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  adminNote?: string;
}

export class Order {
  constructor(
    public id: number = 0,
    public code: string = '',
    public userId: number = 0,
    public status: string = 'PENDING',
    public paymentStatus: string = 'PENDING',
    public paymentMethod: string = 'COD',
    public createdAt: string = '',
    public subtotal: number = 0,
    public discount: number = 0,
    public shippingFee: number = 0,
    public total: number = 0,
    public voucherCode: string | null = null,
    public stockDeducted: boolean = false,
    public address: OrderAddressSnapshot = { receiverName: '', receiverPhone: '', detail: '' },
    public items: OrderItem[] = [],
    public timeline: OrderTimelineEntry[] = [],
    public cancellationRequest: CancellationRequest | null = null,
    public cancelReason?: string
  ) {}
}
