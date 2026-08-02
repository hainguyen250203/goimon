"use client";

import { Grid, Input } from "@chakra-ui/react";

import { Field } from "~/components/ui/field";
import { FilterCombobox } from "./filter-combobox";
import { FilterSelect } from "./filter-select";
import type { FilterField } from "./filter-field.type";

type FilterPatch = Record<string, string | undefined>;

/**
 * Render đúng control theo `field.type` — tham khảo `FilterFieldInput` của
 * alix-bo-frontend-v2. `FilterDrawer` gọi component này cho từng field khai
 * báo trong `fields: FilterField[]`, không cần viết JSX riêng cho từng field
 * ở trang gọi.
 */
export function FilterFieldInput({
  field,
  values,
  onChange,
}: {
  field: FilterField;
  values: Record<string, string>;
  onChange: (patch: FilterPatch) => void;
}) {
  if (field.type === "daterange") {
    const fromKey = `${field.name}From`;
    const toKey = `${field.name}To`;
    return (
      <Field label={field.label}>
        <Grid templateColumns="1fr 1fr" gap={2} w="full">
          <Input
            type="date"
            size="sm"
            aria-label={`${field.label} — từ ngày`}
            value={values[fromKey] ?? ""}
            max={values[toKey]}
            onChange={(e) => onChange({ [fromKey]: e.target.value || undefined })}
          />
          <Input
            type="date"
            size="sm"
            aria-label={`${field.label} — đến ngày`}
            value={values[toKey] ?? ""}
            min={values[fromKey]}
            onChange={(e) => onChange({ [toKey]: e.target.value || undefined })}
          />
        </Grid>
      </Field>
    );
  }

  const allItems = field.allLabel ? [{ value: "", label: field.allLabel }, ...field.options] : field.options;
  const SelectComponent = field.variant === "combobox" ? FilterCombobox : FilterSelect;

  return (
    <Field label={field.label}>
      <SelectComponent
        options={allItems}
        value={values[field.name] ?? ""}
        onValueChange={(value) => onChange({ [field.name]: value || undefined })}
        placeholder={field.allLabel ?? field.placeholder}
        width="full"
        size="sm"
      />
    </Field>
  );
}
