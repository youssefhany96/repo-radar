import { Chip, Tooltip } from "@mui/material";
import type { ReactElement } from "react";

interface StatChipProps {
  icon: ReactElement;
  label: string;
  tooltip: string;
}

/** A single stat readout. Presentational only — no data access, no store. */
export function StatChip({ icon, label, tooltip }: StatChipProps) {
  return (
    <Tooltip title={tooltip}>
      <Chip icon={icon} label={label} size="small" variant="outlined" />
    </Tooltip>
  );
}
