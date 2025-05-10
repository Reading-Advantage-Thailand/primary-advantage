import { useState } from "react";
import { Star } from "lucide-react";

export function StarRating({
  max = 5,
  onChange,
}: {
  max?: number;
  onChange?: (value: number) => void;
}) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);

  const handleClick = (value: number) => {
    setRating(value);
    onChange?.(value);
  };

  return (
    <div className="flex space-x-1">
      {Array.from({ length: max }, (_, i) => i + 1).map((value) => (
        <button
          key={value}
          onClick={() => handleClick(value)}
          onMouseEnter={() => setHover(value)}
          onMouseLeave={() => setHover(0)}
          className="text-yellow-500"
        >
          <Star
            className={`w-6 h-6 transition-colors ${
              value <= (hover || rating) ? "fill-yellow-400" : "fill-muted"
            }`}
          />
        </button>
      ))}
    </div>
  );
}
