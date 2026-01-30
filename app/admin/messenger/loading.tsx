import { Loader2 } from "lucide-react";

export default function AdminMessengerLoading() {
  return (
    <div className="h-[calc(100vh-4rem)] flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="text-sm text-gray-500">Loading Messenger...</p>
      </div>
    </div>
  );
}
