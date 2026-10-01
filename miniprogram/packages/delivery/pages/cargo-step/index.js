"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const draft_1 = require("../../../../services/draft");
const booking_draft_1 = require("../../../../services/booking-draft");
const index_1 = require("../../../../repositories/index");
const cargo_1 = require("../../../../view-models/cargo");
const page_performance_1 = require("../../../../utils/page-performance");
const CATEGORY_ICONS = {
    general: "/assets/icons/tabler/package.svg",
    document: "/assets/icons/tabler/file-text.svg",
    fresh_cold_chain: "/assets/icons/tabler/snowflake.svg",
    food: "/assets/icons/tabler/tools-kitchen-2.svg",
    medical: "/assets/icons/tabler/first-aid-kit.svg",
    other: "/assets/icons/tabler/dots.svg",
};
Page((0, page_performance_1.withPagePerformance)("delivery/cargo-step", {
    data: {
        draftId: "",
        category: "general",
        description: "",
        quantity: 1,
        unitWeightKg: "",
        lengthMeters: "",
        widthMeters: "",
        heightMeters: "",
        fragile: false,
        categories: Object.keys(cargo_1.CARGO_LABELS).map((k) => ({
            value: k,
            label: cargo_1.CARGO_LABELS[k],
            icon: CATEGORY_ICONS[k],
        })),
        loading: true,
        returnToConfirm: false,
    },
    onLoad(query) {
        var _a, _b, _c, _d, _e, _f, _g;
        const draftId = query === null || query === void 0 ? void 0 : query.draftId;
        const d = index_1.repo.getDraft(draftId);
        if (!d) {
            wx.showToast({ title: "草稿不存在", icon: "none" });
            setTimeout(() => wx.navigateBack(), 600);
            return;
        }
        const c = (_a = d.cargo) !== null && _a !== void 0 ? _a : {
            category: "general",
            description: "",
            quantity: 1,
            fragile: false,
            needsHandling: false,
        };
        this.setData({
            draftId,
            returnToConfirm: (query === null || query === void 0 ? void 0 : query.returnTo) === "confirm",
            category: c.category,
            description: (_b = c.description) !== null && _b !== void 0 ? _b : "",
            quantity: (_c = c.quantity) !== null && _c !== void 0 ? _c : 1,
            unitWeightKg: c.unitWeightGrams !== undefined ? String(c.unitWeightGrams / 1000) : "",
            lengthMeters: ((_d = c.unitDimensionsMm) === null || _d === void 0 ? void 0 : _d.length) !== undefined ? String(c.unitDimensionsMm.length / 1000) : "",
            widthMeters: ((_e = c.unitDimensionsMm) === null || _e === void 0 ? void 0 : _e.width) !== undefined ? String(c.unitDimensionsMm.width / 1000) : "",
            heightMeters: ((_f = c.unitDimensionsMm) === null || _f === void 0 ? void 0 : _f.height) !== undefined ? String(c.unitDimensionsMm.height / 1000) : "",
            fragile: (_g = c.fragile) !== null && _g !== void 0 ? _g : false,
            loading: false,
        });
    },
    onPickCategory(e) {
        this.setData({ category: e.currentTarget.dataset.value });
    },
    onDescriptionInput(e) {
        this.setData({ description: e.detail.value });
    },
    onMinus() {
        const q = Math.max(1, this.data.quantity - 1);
        this.setData({ quantity: q });
    },
    onPlus() {
        const q = this.data.quantity + 1;
        this.setData({ quantity: q });
    },
    onQuantityInput(e) {
        const v = parseInt(e.detail.value || "1", 10);
        this.setData({ quantity: Math.max(1, isNaN(v) ? 1 : v) });
    },
    onWeightInput(e) { this.setData({ unitWeightKg: e.detail.value }); },
    onLengthInput(e) { this.setData({ lengthMeters: e.detail.value }); },
    onWidthInput(e) { this.setData({ widthMeters: e.detail.value }); },
    onHeightInput(e) { this.setData({ heightMeters: e.detail.value }); },
    onToggleFragile() { this.setData({ fragile: !this.data.fragile }); },
    onPrev() {
        wx.navigateBack();
    },
    onNext() {
        if (!this.data.description) {
            wx.showToast({ title: "请填写货物描述", icon: "none" });
            return;
        }
        if (this.data.unitWeightKg && (!Number.isFinite(Number(this.data.unitWeightKg)) || Number(this.data.unitWeightKg) <= 0)) {
            wx.showToast({ title: "单件重量请填写大于 0 的数字", icon: "none" });
            return;
        }
        const dimensions = [this.data.lengthMeters, this.data.widthMeters, this.data.heightMeters];
        if (dimensions.some(Boolean) && (dimensions.some((v) => !v) || dimensions.some((v) => !Number.isFinite(Number(v)) || Math.round(Number(v) * 1000) <= 0))) {
            wx.showToast({ title: "长、宽、高请完整填写，且至少为 0.001 米", icon: "none" });
            return;
        }
        const cargo = {
            category: this.data.category,
            description: this.data.description,
            quantity: this.data.quantity,
            unitWeightGrams: this.data.unitWeightKg ? Math.round(parseFloat(this.data.unitWeightKg) * 1000) : undefined,
            unitDimensionsMm: this.data.lengthMeters && this.data.widthMeters && this.data.heightMeters
                ? {
                    length: Math.round(Number(this.data.lengthMeters) * 1000),
                    width: Math.round(Number(this.data.widthMeters) * 1000),
                    height: Math.round(Number(this.data.heightMeters) * 1000),
                }
                : undefined,
            fragile: this.data.fragile,
            needsHandling: false,
        };
        try {
            if (this.data.returnToConfirm) {
                (0, booking_draft_1.updateBookingDraft)(this.data.draftId, (d) => (Object.assign(Object.assign({}, d), { cargo })));
                wx.navigateBack();
            }
            else {
                draft_1.draftService.update(this.data.draftId, (d) => (Object.assign(Object.assign({}, d), { cargo })));
                wx.navigateTo({ url: `/packages/delivery/pages/model-step/index?draftId=${this.data.draftId}` });
            }
        }
        catch (error) {
            wx.showToast({ title: (error === null || error === void 0 ? void 0 : error.message) || "报价更新失败", icon: "none" });
        }
    },
}));
