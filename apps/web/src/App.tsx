import { useState } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Tabs,
  Tab,
  Box,
  IconButton,
  Badge,
  CssBaseline,
  ThemeProvider,
  createTheme,
  useMediaQuery,
} from "@mui/material";
import DarkIcon from "@mui/icons-material/DarkMode";
import LightIcon from "@mui/icons-material/LightMode";
import RadarIcon from "@mui/icons-material/Radar";
import { useTrackedStore } from "./store/trackedStore";
import { SearchPanel } from "./features/search/SearchPanel";
import { TrackedPanel } from "./features/tracked/TrackedPanel";

export default function App() {
  const prefersDark = useMediaQuery("(prefers-color-scheme: dark)");
  const [mode, setMode] = useState<"light" | "dark">(
    prefersDark ? "dark" : "light",
  );
  const [tab, setTab] = useState(0);
  const trackedCount = useTrackedStore((s) => s.order.length);

  const theme = createTheme({
    palette: { mode, primary: { main: "#2b5cff" } },
    shape: { borderRadius: 10 },
    typography: {
      fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
    },
  });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar
        position="sticky"
        color="default"
        elevation={0}
        sx={{ borderBottom: 1, borderColor: "divider" }}
      >
        <Toolbar>
          <RadarIcon sx={{ mr: 1.5, color: "primary.main" }} />
          <Typography variant="h6" sx={{ flex: 1, fontWeight: 600 }}>
            Repo Radar
          </Typography>
          <IconButton
            onClick={() => setMode((m) => (m === "light" ? "dark" : "light"))}
            aria-label="Toggle theme"
          >
            {mode === "light" ? <DarkIcon /> : <LightIcon />}
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 3 }}>
        <Tabs value={tab} onChange={(_, v: number) => setTab(v)} sx={{ mb: 3 }}>
          <Tab label="Search" />
          <Tab
            label={
              <Badge
                badgeContent={trackedCount}
                color="primary"
                sx={{ "& .MuiBadge-badge": { right: -14, top: 2 } }}
              >
                Tracked
              </Badge>
            }
          />
        </Tabs>

        <Box role="tabpanel" hidden={tab !== 0}>
          {tab === 0 && <SearchPanel />}
        </Box>
        <Box role="tabpanel" hidden={tab !== 1}>
          {tab === 1 && <TrackedPanel />}
        </Box>
      </Container>
    </ThemeProvider>
  );
}
