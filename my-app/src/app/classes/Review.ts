export class Review {
  constructor(
    public id: number = 0,
    public userId: number = 0,
    public productId: number = 0,
    public orderId: number = 0,
    public rating: number = 5,
    public comment: string = '',
    public status: string = 'VISIBLE',
    public createdAt: string = '',
    public customerName?: string,
    public imageName?: string | null
  ) {}
}
