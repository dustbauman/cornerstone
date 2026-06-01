import { Megaphone, SlidersHorizontal } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";

interface Props {
  filtered?: boolean;
  message?: string;
}

export default function RequestsBoardEmpty({ filtered, message }: Props) {
  if (filtered) {
    return (
      <EmptyState
        icon={SlidersHorizontal}
        title="No requests match your filters"
        description="Try clearing a filter or widening your browse area."
      />
    );
  }

  if (message === "No requests from your lodge yet.") {
    return (
      <EmptyState
        icon={Megaphone}
        title="No requests from your lodge yet"
        description="Be the first brother to post a need your lodge can help with."
      />
    );
  }

  return (
    <EmptyState
      icon={Megaphone}
      title={message ?? "No requests in this view yet"}
      description="Check another tab or post a request to get started."
    />
  );
}
