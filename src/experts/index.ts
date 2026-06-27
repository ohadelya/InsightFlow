import { contract } from "./contract";
import { generic } from "./generic";
import { requirements } from "./requirements";
import { resume } from "./resume";
import { tender } from "./tender";

export const experts = {
  resume,
  tender,
  contract,
  requirements,
  generic,
};

export const DEFAULT_EXPERT = generic;
