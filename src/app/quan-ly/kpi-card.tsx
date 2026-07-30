import type { ReactNode } from "react";
import { Box, Flex } from "@chakra-ui/react";

import { StatHelpText, StatLabel, StatRoot, StatValueText } from "~/components/ui/stat";

export function KpiCard({
  label,
  value,
  icon,
  colorPalette = "gray",
  helpText,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  colorPalette?: string;
  helpText?: string;
}) {
  return (
    <Box borderWidth="1px" rounded="l3" p={4} bg="bg.panel">
      <StatRoot size="sm">
        <Flex align="center" gap={2.5} mb={2}>
          <Flex
            colorPalette={colorPalette}
            align="center"
            justify="center"
            boxSize="8"
            rounded="l2"
            bg="colorPalette.subtle"
            color="colorPalette.fg"
            flexShrink={0}
          >
            {icon}
          </Flex>
          <StatLabel fontSize="sm" color="fg.muted">
            {label}
          </StatLabel>
        </Flex>
        <StatValueText>{value}</StatValueText>
        {helpText ? <StatHelpText>{helpText}</StatHelpText> : null}
      </StatRoot>
    </Box>
  );
}
