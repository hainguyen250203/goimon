import { Construction } from "lucide-react";

export function ComingSoon() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 py-24 text-center">
      <Construction className="size-10 text-muted-foreground" />
      <p className="text-sm font-medium">Sắp ra mắt</p>
      <p className="text-sm text-muted-foreground">
        Trang này đang được phát triển.
      </p>
    </div>
  );
}
