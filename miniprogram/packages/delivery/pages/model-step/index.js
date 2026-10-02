"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fleet_1 = require("../../../../services/fleet");
const pricing_1 = require("../../../../services/pricing");
const booking_draft_1 = require("../../../../services/booking-draft");
const index_1 = require("../../../../repositories/index");
const geo_1 = require("../../../../adapters/geo");
const geo_2 = require("../../../../adapters/geo");
const page_performance_1 = require("../../../../utils/page-performance");
const remote_1 = require("../../../../services/remote");
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
        returnToConfirm: false,
    },
    onLoad(query) {
        const draftId = query === null || query === void 0 ? void 0 : query.draftId;
        this.setData({ draftId, returnToConfirm: (query === null || query === void 0 ? void 0 : query.returnTo) === "confirm" });
        this.refresh();
    },
    async refresh() {
        var _a, _b;
        const draft = index_1.repo.getDraft(this.data.draftId);
        if (!draft)
            return;
        if ((0, remote_1.isSharedMode)())
            await remote_1.sharedPricing.syncModels().catch(() => undefined);
        let offers = fleet_1.fleetService.recommend({ draft });
        if ((0, remote_1.isSharedMode)()) {
            try {
                const fleet = await remote_1.sharedFleet.list();
                const origin = (_a = draft.sender) === null || _a === void 0 ? void 0 : _a.location;
                offers = offers.map(offer => {
                    const matching = fleet.filter(v => v.modelId === offer.modelId && v.location).sort((a, b) => origin ? (0, geo_2.haversineMeters)(a.location, origin) - (0, geo_2.haversineMeters)(b.location, origin) : 0);
                    const nearest = matching[0];
                    const distance = (nearest === null || nearest === void 0 ? void 0 : nearest.location) && origin ? (0, geo_2.haversineMeters)(nearest.location, origin) : 0;
                    return Object.assign(Object.assign({}, offer), { availableCount: matching.length, distanceMeters: distance, estimatedArrivalMinutes: nearest ? Math.max(3, Math.ceil(distance / 250)) : 0, batteryPercent: nearest === null || nearest === void 0 ? void 0 : nearest.batteryPercent, supplySource: draft.serviceTimeMode === "scheduled" || !nearest || offer.unavailableReasons.length ? "headquarters" : "nearby" });
                });
            }
            catch (error) {
                wx.showToast({ title: (error === null || error === void 0 ? void 0 : error.message) || "运力加载失败", icon: "none" });
            }
        }
        const recommendedList = offers.filter((o) => o.recommended);
        const sel = offers.find((o) => o.modelId === draft.selectedVehicleModelId)
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
            selectedModelId: (_b = sel === null || sel === void 0 ? void 0 : sel.modelId) !== null && _b !== void 0 ? _b : "",
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
            wx.showModal({
                title: "车型适配提醒",
                content: `${o.unavailableReasons.join("；") || "该车型可能不适合当前货物"}。仍要选择将提交平台调度确认。`,
                cancelText: "返回重选",
                confirmText: "仍要选择",
                success: (result) => {
                    if (result.confirm)
                        this.selectOffer(o);
                },
            });
            return;
        }
        this.selectOffer(o);
    },
    selectOffer(o) {
        const id = o.modelId;
        this.setData({ selectedModelId: id, selected: o, estimatedTotal: null, expired: false });
        this.computeQuote(id);
    },
    onImageTap(e) {
        const id = e.currentTarget.dataset.id;
        wx.navigateTo({ url: `/packages/delivery/pages/model-detail/index?modelId=${encodeURIComponent(id)}` });
    },
    async computeQuote(modelId) {
        this.setData({ computing: true, expired: false });
        try {
            const draft = index_1.repo.getDraft(this.data.draftId);
            if (!draft) {
                this.setData({ computing: false });
                return;
            }
            const q = (0, remote_1.isSharedMode)() ? await remote_1.sharedPricing.quote(draft, modelId) : pricing_1.pricingService.quote({ draft, modelId });
            this.setData({ estimatedTotal: q.totalAmountFen, computing: false });
        }
        catch (e) {
            wx.showToast({ title: e.message || "报价失败", icon: "none" });
            this.setData({ computing: false, estimatedTotal: null });
        }
    },
    onConfirm() {
        const id = this.data.selectedModelId;
        if (!id) {
            wx.showToast({ title: "请选择车型", icon: "none" });
            return;
        }
        try {
            const draft = index_1.repo.getDraft(this.data.draftId);
            if (!draft) {
                wx.showToast({ title: "订单已创建，请在订单列表查看", icon: "none" });
                return;
            }
            const updated = (0, booking_draft_1.updateBookingDraft)(this.data.draftId, (d) => {
                var _a, _b;
                return (Object.assign(Object.assign({}, d), { selectedVehicleModelId: id, dispatchSource: d.serviceTimeMode === "scheduled" ? "headquarters" : (_b = (_a = this.data.selected) === null || _a === void 0 ? void 0 : _a.supplySource) !== null && _b !== void 0 ? _b : "headquarters" }));
            });
            if (this.data.returnToConfirm)
                wx.navigateBack();
            else
                wx.navigateTo({
                    url: `/packages/delivery/pages/confirm/index?draftId=${updated.id}`,
                    fail: () => wx.showToast({ title: "打开订单确认页失败，请重试", icon: "none" }),
                });
        }
        catch (e) {
            wx.showToast({ title: e.message || "报价失败", icon: "none" });
        }
    },
    formatDistanceLabel(m) {
        return (0, geo_1.formatDistance)(m);
    },
}));
