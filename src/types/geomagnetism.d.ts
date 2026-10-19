/** تعريف أنواع مكتبة الانحراف المغناطيسي (بدون أنواع رسمية) */
declare module "geomagnetism" {
  export interface GeoMagResult {
    x: number;
    y: number;
    z: number;
    h: number;
    f: number;
    /** ميل المجال بالدرجات */
    incl: number;
    /** الانحراف المغناطيسي بالدرجات — الموجب شرقًا */
    decl: number;
  }
  export interface GeoMagModel {
    /** الإحداثيات: [خط العرض, خط الطول] بالدرجات */
    point(coords: [number, number]): GeoMagResult;
  }
  export function model(date?: Date): GeoMagModel;
}
