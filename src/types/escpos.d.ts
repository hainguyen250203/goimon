// escpos/escpos-network (v3 alpha) không phát hành type định nghĩa chính
// thức — khai báo tối giản kiểu `any` để dùng được qua `import`, tránh rải
// `// @ts-ignore` khắp nơi. Xem escpos-bill-printer.ts cho cách dùng thật.
declare module "escpos" {
  const escpos: any;
  export default escpos;
}

declare module "escpos-network" {
  const EscposNetwork: any;
  export default EscposNetwork;
}
