import { Flex, Text } from "@chakra-ui/react";
import { Construction } from "lucide-react";

export function ComingSoon() {
  return (
    <Flex flex={1} direction="column" align="center" justify="center" gap={2} py={24} textAlign="center">
      <Construction size={40} color="var(--chakra-colors-fg-muted)" />
      <Text fontSize="sm" fontWeight="medium">
        Sắp ra mắt
      </Text>
      <Text fontSize="sm" color="fg.muted">
        Trang này đang được phát triển.
      </Text>
    </Flex>
  );
}
