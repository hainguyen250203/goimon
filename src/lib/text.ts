/**
 * Bo dau tieng Viet de so khop tim kiem khong dau (go "ga" van ra "Ga").
 * NFD tach duoc hau het dau thanh/nguyen am, rieng "d"/"D" khong tach duoc
 * bang NFD (la ky tu goc rieng trong Unicode, khong phai "d" + dau) nen phai
 * thay tay.
 */
export function stripDiacritics(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}
