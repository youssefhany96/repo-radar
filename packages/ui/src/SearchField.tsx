import { InputAdornment, TextField, CircularProgress } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  loading?: boolean;
  placeholder?: string;
}

/**
 * Controlled input. Deliberately knows nothing about debouncing or fetching —
 * that's the consumer's concern, which keeps this reusable anywhere.
 */
export function SearchField({ value, onChange, loading, placeholder }: SearchFieldProps) {
  return (
    <TextField
      fullWidth
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
