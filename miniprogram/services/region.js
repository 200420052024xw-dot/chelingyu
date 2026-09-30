"use strict";
/** Region Service */
Object.defineProperty(exports, "__esModule", { value: true });
exports.regionService = void 0;
const index_1 = require("../repositories/index");
exports.regionService = {
    listServiceAreas() {
        return index_1.repo.listServiceAreas().filter((s) => s.enabled);
    },
    getServiceArea(id) {
        return index_1.repo.getServiceArea(id);
    },
    listRegions() {
        return index_1.repo.listRegions();
    },
};
