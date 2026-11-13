"use client";

import { useState } from "react";
import { Avatar } from "@/components/character/Avatar";
import { Character, type Pose } from "@/components/character/Character";

/** The character with a switch between his poses, and the résumé avatar, for review. */
export function CharacterStage() {
  const [pose, setPose] = useState<Pose>("standing");
  return (
    <>
      <Character pose={pose} />
      <div className="pose-panel surface" role="group" aria-label="Character pose">
        <Avatar size={56} />
        {(["standing", "waving"] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={pose === option}
            onClick={() => {
              setPose(option);
            }}
          >
            {option === "standing" ? "Standing" : "Waving"}
          </button>
        ))}
      </div>
    </>
  );
}
