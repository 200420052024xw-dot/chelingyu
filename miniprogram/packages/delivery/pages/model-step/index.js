"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fleet_1 = require("../../../../services/fleet");
const draft_1 = require("../../../../services/draft");
const pricing_1 = require("../../../../services/pricing");
const order_draft_1 = require("../../../../stores/order-draft");
const index_1 = require("../../../../repositories/index");
const geo_1 = require("../../../../adapters/geo");
const pricing_2 = require("../../../../domain/pricing");
const page_performance_1 = require("../../../../utils/page-performance");
Page((0, page_performance_1.withPagePerformance)("delivery/model-step", {
    data: {
        draftId: "",
        loading: true,
        offers: [],
        sortedByDistance: [],
        visibleOffers: [],
        selectedModelId: "",
        activeTab: "recommended",
        selected: null,
        estimatedTotal: null,
        computing: false,
        expired: false,
    },
    onLoad(query) {
        const draftId = query === null || query === void 0 ? void 0 : query.draftId;
        this.setData({ draftId });
        this.refresh();
    },
    refresh() {
        var _a;
        const draft = index_1.repo.getDraft(this.data.draftId);
        if (!draft)
            return;
        const offers = fleet_1.fleetService.recommend({ draft });
        const recommendedList = offers.filter((o) => o.recommended);
        const sel = offers.find((o) => o.modelId === draft.selectedVehicleModelId && o.available)
            || recommendedList[0]
            || offers.find((o) => o.available)
            || null;
        const sortedByDistance = [...offers].sort((a, b) => {
            const sourceRank = (a.supplySource === "headquarters" ? 1 : 0) - (b.supplySource === "headquarters" ? 1 : 0);
            return sourceRank || a.distanceMeters - b.distanceMeters;
        });
        this.setData({
            offers,
            sortedByDistance,
            visibleOffers: recommendedList,
            loading: false,
            selectedModelId: (_a = sel === null || sel === void 0 ? void 0 : sel.modelId) !== null && _a !== void 0 ? _a : "",
            selected: sel,
        });
        if (sel)
            wx.nextTick(() => this.computeQuote(sel.modelId));
    },
    onTabChange(e) {
        const activeTab = e.currentTarget.dataset.tab;
        const visibleOffers = activeTab === "recommended"
            ? this.data.offers.filter((o) => o.recommended)
            : activeTab === "nearest"
                ? this.data.sortedByDistance
                : this.data.offers;
        this.setData({ activeTab, visibleOffers });
    },
    onSelect(e) {
        const id = e.currentTarget.dataset.id;
        const o = this.data.offers.find((x) => x.modelId === id);
        if (!o)
            return;
        if (!o.available) {
            wx.showToast({
                title: o.unavailableReasons[0] || "当前车型不可用",
                icon: "none",
            });
            return;
        }
        this.setData({ selectedModelId: id, selected: o, estimatedTotal: null, expired: false });
        this.computeQuote(id);
    },
    computeQuote(modelId) {
        this.setData({ computing: true, expired: false });
        try {
            const draft = index_1.repo.getDraft(this.data.draftId);
            if (!draft)
                return;
            const q = pricing_1.pricingService.quote({ draft, modelId });
            this.setData({ estimatedTotal: q.totalAmountFen, computing: false });
        }
        catch (e) {
            wx.showToast({ title: e.message || "报价失败", icon: "none" });
            this.setData({ computing: false, estimatedTotal: null });
        }
    },
    onConfirm() {
        var _a;
        const id = this.data.selectedModelId;
        if (!id) {
            wx.showToast({ title: "请选择车型", icon: "none" });
            return;
        }
        if (!((_a = this.data.selected) === null || _a === void 0 ? void 0 : _a.available)) {
            wx.showToast({ title: "当前车型不可用", icon: "none" });
            return;
        }
        try {
            const draft = index_1.repo.getDraft(this.data.draftId);
            if (!draft)
                return;
            // 修改草稿版本：触发报价失效
            const updated = draft_1.draftService.update(this.data.draftId, (d) => {
                var _a, _b;
                return (Object.assign(Object.assign({}, d), { selectedVehicleModelId: id, dispatchSource: (_b = (_a = this.data.selected) === null || _a === void 0 ? void 0 : _a.supplySource) !== null && _b !== void 0 ? _b : "nearby", headquartersConfirmed: false }));
            });
            // 重新报价
            const q = pricing_1.pricingService.quote({ draft: updated, modelId: id });
            // 绑定到草稿
            const bound = draft_1.draftService.attachQuote(updated.id, q.id, (0, pricing_2.computeInputFingerprint)(updated, id));
            order_draft_1.draftStore.set(bound);
            wx.navigateTo({ url: `/packages/delivery/pages/confirm/index?draftId=${updated.id}` });
        }
        catch (e) {
            wx.showToast({ title: e.message || "报价失败", icon: "none" });
        }
    },
    formatDistanceLabel(m) {
        return (0, geo_1.formatDistance)(m);
    },
}));
