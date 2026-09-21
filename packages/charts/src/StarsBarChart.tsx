import { Box, Typography, useMediaQuery, useTheme } from "@mui/material";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import type { ChartDatum } from "./types";

interface StarsBarChartProps {
  data: ChartDatum[];
  title?: string;
  height?: number;
  emptyMessage?: string;
}

const compact = new Intl.NumberFormat("en", { notation: "compact" });

export function StarsBarChart({
  data, title, height, emptyMessage = "Nothing to chart yet.",
}: StarsBarChartProps) {
  const theme = useTheme();
  // Labels overlap under ~600px.
  const isNarrow = useMediaQuery(theme.breakpoints.down("sm"));
  const chartHeight = height ?? (isNarrow ? 300 : 260);

  if (data.length === 0) {
    return (
      <Box sx={{ height: chartHeight, display: "grid", placeItems: "center" }}>
        <Typography variant="body2" color="text.secondary">{emptyMessage}</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {title && <Typography variant="subtitle2" sx={{ mb: 2 }}>{title}</Typography>}
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: isNarrow ? 10 : 12 }}
            stroke={theme.palette.text.secondary}
            interval={0}
            angle={isNarrow ? -45 : -25}
            textAnchor="end"
            height={isNarrow ? 80 : 70}
            tickFormatter={(label: string) =>
              isNarrow && label.length > 10 ? `${label.slice(0, 9)}…` : label
            }
          />
          <YAxis
            tick={{ fontSize: 12 }} stroke={theme.palette.text.secondary}
            tickFormatter={(v: number) => compact.format(v)}
          />
          <Tooltip
            /* Default cursor is opaque grey — wrong on dark backgrounds. */
            cursor={{ fill: theme.palette.action.hover }}
            formatter={(value) => [Number(value).toLocaleString(), "Stars"]}
            contentStyle={{
              background: theme.palette.background.paper,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 8,
            }}
          />
          <Bar
            dataKey="value"
            fill={theme.palette.primary.main}
            radius={[4, 4, 0, 0]}
            /* Recharts fills available width — two repos would be huge. */
            maxBarSize={72}
          />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}
