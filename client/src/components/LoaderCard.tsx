interface LoaderCardProps {
  title: string;
  rows?: number;
  variant?: "balance" | "list";
}

export default function LoaderCard({
  title,
  rows = 4,
  variant = "balance",
}: LoaderCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-base font-semibold text-[#333333] mb-4">{title}</h2>

      <div className="space-y-4">
        {Array.from({ length: rows }).map((_, index) =>
          variant === "balance" ? (
            <div key={index} className="flex items-center gap-4 animate-pulse">
              <div className="w-12 h-8 bg-gray-200 rounded" />

              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded mb-2" />
                <div className="h-2 bg-gray-200 rounded" />
              </div>
            </div>
          ) : (
            <div key={index} className="animate-pulse">
              <div className="h-4 w-24 bg-gray-200 rounded mb-2" />

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-12 h-12 bg-gray-200 rounded" />

                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded mb-2" />
                  <div className="h-3 bg-gray-200 rounded" />
                </div>

                <div className="w-12 h-8 bg-gray-200 rounded" />
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
