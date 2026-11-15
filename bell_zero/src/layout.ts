import { Scene, SceneChar } from "./types";

export const CHAR_SCALE: Record<string, number> = { hero_student_m: 1.12, teacher_harper: 1.2 };

/** where a "point" gesture is aimed, per location (x as fraction of width) */
const POINT_TARGET: Record<string, number> = { classroom_interior: 0.5, classroom_door_view: 0.78 };

/** true when the character faces screen-left */
export const facingLeft = (sc: Scene, c: SceneChar): boolean => {
  if (c.action === "point") return (POINT_TARGET[sc.bg] ?? 0.5) < c.pos[0];
  const other = sc.characters.find((o) => o.rig !== c.rig);
  return other ? other.pos[0] < c.pos[0] : c.pos[0] > 0.6;
};
