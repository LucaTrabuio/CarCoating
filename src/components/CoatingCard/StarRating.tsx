import { Star } from "lucide-react";

type Props = {
  rating: number; // usually out of 7
  max?: number;
};

export default function StarRating({ rating, max = 7 }: Props) {
  return (
    <div className="flex items-center space-x-0.5">
      {[...Array(max)].map((_, i) => (
        <Star
          key={i}
          size={18}
          fill={i < rating ? "#006644" : "transparent"}
          stroke={i < rating ? "#006644" : "#cbd5e1"}
          strokeWidth={i < rating ? 0 : 2}
        />
      ))}
    </div>
  );
}
