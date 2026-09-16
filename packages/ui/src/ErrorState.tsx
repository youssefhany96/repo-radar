import { Alert, AlertTitle, Button } from "@mui/material";

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <Alert
      severity="error"
      action={onRetry ? <Button size="small" onClick={onRetry}>Retry</Button> : undefined}
    >
      <AlertTitle>Something went wrong</AlertTitle>
      {message}
    </Alert>
  );
}
