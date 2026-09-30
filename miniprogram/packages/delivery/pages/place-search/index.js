"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const page_performance_1 = require("../../../../utils/page-performance");
const tencent_maps_1 = require("../../../../adapters/tencent-maps");
const location_1 = require("../../../../adapters/location");
Page((0, page_performance_1.withPagePerformance)("packages/delivery/pages/place-search/index", {
    data: { keyword: "", city: "", regionValue: [], results: [], searching: false, hint: "先选择城市，再输入地点名称" },
    onInput(e) { this.setData({ keyword: e.detail.value }); },
    onRegionChange(e) {
        const regionValue = e.detail.value;
        this.setData({ regionValue, city: regionValue[1] || regionValue[0] || "", results: [], hint: "输入街道、园区或楼宇名称搜索" });
    },
    async onSearch() {
        const keyword = this.data.keyword.trim();
        if (!keyword) {
            this.setData({ hint: "先输入要查找的地点" });
            return;
        }
        this.setData({ searching: true, hint: "正在搜索地点…", results: [] });
        try {
            const results = await (0, tencent_maps_1.suggestPlaces)(keyword, this.data.city.trim() || undefined);
            this.setData({ results, hint: results.length ? "请选择准确的地点" : "没有找到地点，可使用微信地图选点" });
        }
        catch (_) {
            this.setData({ results: [], hint: "在线地点搜索暂不可用，可使用微信地图选点" });
        }
        finally {
            this.setData({ searching: false });
        }
    },
    onChoose(e) {
        const place = this.data.results[Number(e.currentTarget.dataset.index)];
        if (!place)
            return;
        this.returnPlace(place.location, place.title, `${place.city}${place.address ? ` · ${place.address}` : ""}`, place.adcode);
    },
    onNativeChoose() {
        wx.chooseLocation({
            success: (p) => this.returnPlace({ latitude: p.latitude, longitude: p.longitude }, p.name || "地图选点", p.address || p.name || "", ""),
            fail: () => wx.showToast({ title: "未选择地点", icon: "none" }),
        });
    },
    returnPlace(point, name, detail, adcode) {
        location_1.locationAdapter.setSelectedPlace(point, name);
        this.getOpenerEventChannel().emit("placeSelected", { point, name, detail, adcode });
        wx.navigateBack();
    },
}));
