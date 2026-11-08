import { Product } from './Product';

export class CartItem {
  constructor(
    public productId: number = 0,
    public quantity: number = 1,
    public selected: boolean = true,
    public attribute: string = 'Bản Tiêu Chuẩn',
    public reservedUntil?: number,
    public product?: Product
  ) {}
}
