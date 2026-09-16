import { Box, Typography, useTheme } from "@mui/material";
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
  data, title, height = 320, emptyMessage = "Nothing to chart yet.",
}: StarsBarChartProps) {
  const theme = useTheme();

  if (data.length === 0) {
    return (
      <Box sx={{ height, display: "grid", placeItems: "center" }}>
        <Typography variant="body2" color="text.secondary">{emptyMessage}</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {title && <Typography variant="subtitle2" sx={{ mb: 2 }}>{title}</Typography>}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} vertical={false} />
          <XAxis
            dataKey="label" tick={{ fontSize: 12 }}
            stroke={theme.palette.text.secondary}
            interval={0} angle={-25} textAnchor="end" height={70}
          />
          <YAxis
            tick={{ fontSize: 12 }} stroke={theme.palette.text.secondary}
            tickFormatter={(v: number) => compact.format(v)}
          />
          <Tooltip
            formatter={(value) => [Number(value).toLocaleString(), "Stars"]}
            contentStyle={{
              background: theme.palette.background.paper,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 8,
            }}
          />
          <Bar dataKey="value" fill={theme.palette.primary.main} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}
