import { Skeleton } from "@/components/ui/skeleton";

export function TasksLoadingSkeleton() {
  return (
    <div className="space-y-6 p-6" data-testid="loading-skeleton">
      {[1, 2, 3].map((domain) => (
        <div key={domain} className="space-y-2">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-5 w-8 rounded-full" />
            </div>
            <Skeleton className="h-9 w-9" />
          </div>
          {[1, 2, 3].map((task) => (
            <div key={task} className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-5 flex-1" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
