import { Review } from './Review';

export class Product {
  constructor(
    public id: number = 0,
    public slug: string = '',
    public sku: string = '',
    public name: string = '',
    public category: string = '',
    public price: number = 0,
    public discountPrice: number | null = null,
    public stock: number = 0,
    public status: string = 'ACTIVE',
    public featured: boolean = false,
    public createdAt: string = '',
    public images: string[] = [],
    public description: string = '',
    public historicalPeriod: string = '',
    public gameType: string = '',
    public playerCount: string = '',
    public ageRating: string = '',
    public duration: string = '',
    public difficulty: string = '',
    public components: string = '',
    public storySummary: string = '',
    public model3d?: string,
    public demoVideo?: string,
    public reviews?: Review[],
    public minStock?: number,
    public batchCode?: string,
    public importDate?: string,
    public expiryDate?: string,
    public warehouseLocation?: string,
    public warehouseZone?: string,
    public lastAuditAt?: string
  ) {}
}
