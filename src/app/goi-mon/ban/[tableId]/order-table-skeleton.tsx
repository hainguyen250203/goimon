import { Box, Flex, Grid } from "@chakra-ui/react";
import { Skeleton } from "~/components/ui/skeleton";

/**
 * Khung xương đúng hình dạng OrderTableView (header + 3 tab + tìm kiếm +
 * rail danh mục + lưới món) — tránh nháy màn hình trống lúc chuyển từ trang
 * chọn bàn sang.
 */
export function OrderTableSkeleton() {
  return (
    <Flex direction="column" flex={1} minH={0}>
      <Flex
        flexShrink={0}
        align="center"
        gap={2}
        p={{ base: 2, lg: 3 }}
        bg="bg"
        borderBottomWidth="1px"
        borderColor="border"
      >
        <Skeleton boxSize={{ base: "28px", lg: "32px" }} rounded="l2" />
        <Skeleton h={{ base: "16px", lg: "20px" }} flex={1} maxW="140px" />
        <Skeleton boxSize={{ base: "28px", lg: "32px" }} rounded="l2" />
      </Flex>

      <Flex
        flexShrink={0}
        bg="bg"
        borderBottomWidth="1px"
        borderColor="border"
        gap={4}
        px={4}
        py={{ base: 2, lg: 3 }}
      >
        <Skeleton h={{ base: "16px", lg: "20px" }} flex={1} />
        <Skeleton h={{ base: "16px", lg: "20px" }} flex={1} />
        <Skeleton h={{ base: "16px", lg: "20px" }} flex={1} />
      </Flex>

      <Box flexShrink={0} bg="bg" borderBottomWidth="1px" borderColor="border" p={{ base: 2, lg: 3 }}>
        <Skeleton h={{ base: "32px", lg: "36px" }} rounded="l2" />
      </Box>

      <Flex flex={1} minH={0} overflow="hidden">
        <Box
          w={{ base: "88px", lg: "110px" }}
          flexShrink={0}
          bg="bg.muted"
          borderRightWidth="1px"
          borderColor="border"
          p={1}
        >
          <Flex direction="column" gap={1} p={1}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} h={{ base: "36px", lg: "42px" }} rounded="l3" />
            ))}
          </Flex>
        </Box>

        <Box flex={1} p={{ base: 2, lg: 3 }}>
          <Grid
            templateColumns={{ base: "repeat(3, 1fr)", sm: "repeat(4, 1fr)", md: "repeat(5, 1fr)" }}
            gap={{ base: 1.5, lg: 2 }}
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} minH={{ base: "72px", lg: "84px" }} rounded="l3" />
            ))}
          </Grid>
        </Box>
      </Flex>
    </Flex>
  );
}
