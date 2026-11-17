export class BlogPost {
  constructor(
    public id: number | string = 0,
    public title: string = '',
    public excerpt: string = '',
    public image: string = '/img/products/4.png',
    public date: string = '',
    public status: string = 'PUBLISHED',
    public source: string = 'ADMIN',
    public authorName?: string,
    public content?: string
  ) {}
}
