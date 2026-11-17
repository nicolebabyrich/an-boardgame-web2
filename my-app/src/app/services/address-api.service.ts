import { Injectable } from '@angular/core';

const API_BASE_URL = 'https://provinces.open-api.vn/api/v2';

export interface ProvinceOption {
  code: number;
  name: string;
}

export interface WardOption {
  code: number;
  name: string;
  province_code: number;
}

const FALLBACK_PROVINCES: ProvinceOption[] = [
  { code: 79, name: 'Thành phố Hồ Chí Minh' },
  { code: 1, name: 'Thành phố Hà Nội' },
  { code: 48, name: 'Thành phố Đà Nẵng' },
  { code: 46, name: 'Thành phố Huế' },
  { code: 92, name: 'Thành phố Cần Thơ' }
];

const FALLBACK_WARDS: Record<string, WardOption[]> = {
  '79': [
    { code: 26734, name: 'Phường Bến Nghé', province_code: 79 },
    { code: 26740, name: 'Phường Bến Thành', province_code: 79 },
    { code: 27145, name: 'Phường Võ Thị Sáu', province_code: 79 },
    { code: 26869, name: 'Phường Linh Trung', province_code: 79 }
  ],
  '1': [
    { code: 37, name: 'Phường Hàng Bạc', province_code: 1 },
    { code: 40, name: 'Phường Hàng Đào', province_code: 1 },
    { code: 1, name: 'Phường Phúc Xá', province_code: 1 }
  ]
};

@Injectable({
  providedIn: 'root'
})
export class AddressApiService {
  private provinceCache: ProvinceOption[] | null = null;
  private wardCache = new Map<string, WardOption[]>();

  async getProvinces(): Promise<ProvinceOption[]> {
    if (this.provinceCache) return this.provinceCache;
    try {
      const response = await fetch(`${API_BASE_URL}/p/`, { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('API error');
      const data = await response.json();
      this.provinceCache = data;
      return data;
    } catch {
      return FALLBACK_PROVINCES;
    }
  }

  async getWards(provinceCode: number | string): Promise<WardOption[]> {
    const key = String(provinceCode || '');
    if (!key) return [];
    if (this.wardCache.has(key)) return this.wardCache.get(key)!;
    try {
      const response = await fetch(`${API_BASE_URL}/w/?province=${encodeURIComponent(key)}`, {
        headers: { Accept: 'application/json' }
      });
      if (!response.ok) throw new Error('API error');
      const data = await response.json();
      this.wardCache.set(key, data);
      return data;
    } catch {
      return FALLBACK_WARDS[key] || [{ code: 1, name: 'Phường Trung Tâm', province_code: Number(key) }];
    }
  }
}
