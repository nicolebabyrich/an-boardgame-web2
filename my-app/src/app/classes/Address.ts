export class Address {
  constructor(
    public id: number = 0,
    public userId: number = 0,
    public receiverName: string = '',
    public receiverPhone: string = '',
    public province: string = '',
    public district: string = '',
    public ward: string = '',
    public detailAddress: string = '',
    public label: string = 'Nhà riêng',
    public isDefault: boolean = false
  ) {}
}
