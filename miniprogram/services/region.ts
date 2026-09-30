/** Region Service */

import type { Region, ServiceArea } from "../contracts/types";
import { repo } from "../repositories/index";

export const regionService = {
  listServiceAreas(): ServiceArea[] {
    return repo.listServiceAreas().filter((s) => s.enabled);
  },
  getServiceArea(id: string): ServiceArea | undefined {
    return repo.getServiceArea(id);
  },
  listRegions(): Region[] {
    return repo.listRegions();
  },
};
