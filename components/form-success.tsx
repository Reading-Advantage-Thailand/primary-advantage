import { CircleCheckIcon } from "lucide-react";

interface FormSuccessProps {
  message?: string;
}

/**
 * Renders a success message alert with a check icon.
 * Returns null if no message is provided.
 */
export function FormSuccess({ message }: FormSuccessProps) {
  if (!message) return null;
  return (
    <div className="bg-emerald-500/15 p-3 rounded-md flex gap-x-2 items-center text-sm text-emerald-500">
      <CircleCheckIcon className="h-4 w-4" />
      <span>{message}</span>
    </div>
  );
}
