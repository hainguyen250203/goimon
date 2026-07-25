import { Circle, Flex, Text } from "@chakra-ui/react";

/**
 * Thay cho Badge (pill nền màu) — chấm tròn màu + text thường, nhẹ nhàng
 * hơn cho các cột trạng thái trong bảng danh sách. `color` là token màu
 * thật (vd: "green.500"), không phải colorPalette semantic.
 */
export function StatusDot({
  color,
  children,
}: {
  color: string;
  children: React.ReactNode;
}) {
  return (
    <Flex align="center" gap={2}>
      <Circle size="2" bg={color} flexShrink={0} />
      <Text fontSize="sm">{children}</Text>
    </Flex>
  );
}
