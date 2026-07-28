import { Box, Flex, Grid } from "@chakra-ui/react";
import { Skeleton } from "~/components/ui/skeleton";

/**
 * Khung xương đúng hình dạng TableSelector (dãy chip khu vực + lưới ô bàn)
 * — thay cho 1 khối skeleton phẳng, để lúc chuyển trang không bị nháy màn
 * hình trống trơn (chỉ thấy background) rồi UI mới bật ra đột ngột.
 */
export function TableSelectorSkeleton() {
  return (
    <Flex direction="column" flex={1} minH={0}>
      <Flex
        flexShrink={0}
        borderBottomWidth="1px"
        borderColor="border"
        bg="bg"
        p={{ base: 2, lg: 3 }}
        gap={{ base: 1.5, lg: 2 }}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton
            key={i}
            flexShrink={0}
            h={{ base: "34px", lg: "40px" }}
            w={{ base: "64px", lg: "90px" }}
            rounded="l3"
          />
        ))}
      </Flex>

      <Box flex={1} p={{ base: 2, lg: 3 }}>
        <Grid
          templateColumns={{ base: "repeat(4, 1fr)", sm: "repeat(5, 1fr)", md: "repeat(7, 1fr)" }}
          gap={{ base: 1.5, lg: 2 }}
        >
          {Array.from({ length: 16 }).map((_, i) => (
            <Skeleton key={i} aspectRatio={1} rounded="l3" />
          ))}
        </Grid>
      </Box>
    </Flex>
  );
}
