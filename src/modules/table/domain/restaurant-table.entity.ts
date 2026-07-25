export type TableStatus = "available" | "occupied";

export type RestaurantTable = {
  id: number;
  name: string;
  areaId: number;
  areaName: string;
  status: TableStatus;
};
