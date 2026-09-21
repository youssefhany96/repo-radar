import { InputAdornment, TextField, CircularProgress } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  loading?: boolean;
  placeholder?: string;
}

// Knows nothing about debouncing or fetching — that's the consumer's concern.
export function SearchField({ value, onChange, loading, placeholder }: SearchFieldProps) {
  return (
    <TextField
      fullWidth
      /* Chrome's autofill background ignores the theme. */
      sx={{
        "& input:-webkit-autofill": {
          WebkitBoxShadow: "0 0 0 100px transparent inset",
          WebkitTextFillColor: "inherit",
          transition: "background-color 5000s ease-in-out 0s",
        },
      }}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder ?? "Search repositories…"}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
          ),
          endAdornment: loading ? (
            <InputAdornment position="end"><CircularProgress size={18} /></InputAdornment>
          ) : undefined,
        },
      }}
    />
  );
}
