export class User {
  constructor(
    public id: number = 0,
    public fullName: string = '',
    public email: string = '',
    public phone: string = '',
    public dateOfBirth: string | null = null,
    public status: string = 'ACTIVE'
  ) {}
}
