"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const draft_1 = require("../../../../services/draft");
const index_1 = require("../../../../repositories/index");
const cargo_1 = require("../../../../view-models/cargo");
const page_performance_1 = require("../../../../utils/page-performance");
const CATEGORY_MARKS = {
    general: "箱", document: "文", fresh_cold_chain: "冷", food: "食", medical: "医", other: "物",
};
Page((0, page_performance_1.withPagePerformance)("delivery/cargo-step", {
    data: {
        draftId: "",
        category: "general",
        description: "",
        quantity: 1,
        unitWeightKg: "",
        lengthMm: "",
        widthMm: "",
        heightMm: "",
        fragile: false,
        categories: Object.keys(cargo_1.CARGO_LABELS).map((k) => ({
            value: k,
            label: cargo_1.CARGO_LABELS[k],
            mark: CATEGORY_MARKS[k],
        })),
        loading: true,
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
            category: c.category,
            description: (_b = c.description) !== null && _b !== void 0 ? _b : "",
            quantity: (_c = c.quantity) !== null && _c !== void 0 ? _c : 1,
            unitWeightKg: c.unitWeightGrams !== undefined ? String(c.unitWeightGrams / 1000) : "",
            lengthMm: ((_d = c.unitDimensionsMm) === null || _d === void 0 ? void 0 : _d.length) !== undefined ? String(c.unitDimensionsMm.length / 10) : "",
            widthMm: ((_e = c.unitDimensionsMm) === null || _e === void 0 ? void 0 : _e.width) !== undefined ? String(c.unitDimensionsMm.width / 10) : "",
            heightMm: ((_f = c.unitDimensionsMm) === null || _f === void 0 ? void 0 : _f.height) !== undefined ? String(c.unitDimensionsMm.height / 10) : "",
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
    onLengthInput(e) { this.setData({ lengthMm: e.detail.value }); },
    onWidthInput(e) { this.setData({ widthMm: e.detail.value }); },
    onHeightInput(e) { this.setData({ heightMm: e.detail.value }); },
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
        const dimensions = [this.data.lengthMm, this.data.widthMm, this.data.heightMm];
        if (dimensions.some(Boolean) && (dimensions.some((v) => !v) || dimensions.some((v) => !Number.isFinite(Number(v)) || Number(v) <= 0))) {
            wx.showToast({ title: "长、宽、高请完整填写，且都要大于 0", icon: "none" });
            return;
        }
        const cargo = {
            category: this.data.category,
            description: this.data.description,
            quantity: this.data.quantity,
            unitWeightGrams: this.data.unitWeightKg ? Math.round(parseFloat(this.data.unitWeightKg) * 1000) : undefined,
            unitDimensionsMm: this.data.lengthMm && this.data.widthMm && this.data.heightMm
                ? {
                    length: Math.round(parseFloat(this.data.lengthMm) * 10) || 0,
                    width: Math.round(parseFloat(this.data.widthMm) * 10) || 0,
                    height: Math.round(parseFloat(this.data.heightMm) * 10) || 0,
                }
                : undefined,
            fragile: this.data.fragile,
            needsHandling: false,
        };
        draft_1.draftService.update(this.data.draftId, (d) => (Object.assign(Object.assign({}, d), { cargo })));
        wx.navigateTo({ url: `/packages/delivery/pages/model-step/index?draftId=${this.data.draftId}` });
    },
}));
