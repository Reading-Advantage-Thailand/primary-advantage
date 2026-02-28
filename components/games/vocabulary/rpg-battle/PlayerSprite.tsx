import React from "react";
import Image from "next/image";

export function PlayerSprite() {
  return (
    <div className="flex items-end justify-start">
      <Image
        src="/games/rpg-battle/hero_male_pose_sheet_3x3.png"
        alt="Player sprite sheet"
        width={160}
        height={160}
        className="bg-muted/40 h-40 w-40 rounded-lg border object-contain"
        unoptimized
      />
    </div>
  );
}
