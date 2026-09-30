import type { CargoCategory, CargoInfo } from "../../../../contracts/types";
import { draftService } from "../../../../services/draft";
import { repo } from "../../../../repositories/index";
import { CARGO_LABELS } from "../../../../view-models/cargo";
import { withPagePerformance } from "../../../../utils/page-performance";

interface PageData {
  draftId: string;
  category: CargoCategory;
  description: string;
  quantity: number;
  unitWeightKg: string;
  lengthMm: string;
  widthMm: string;
  heightMm: string;
  fragile: boolean;
  categories: Array<{ value: CargoCategory; label: string; mark: string }>;
  loading: boolean;
}

const CATEGORY_MARKS: Record<CargoCategory, string> = {
  general: "箱", document: "文", fresh_cold_chain: "冷", food: "食", medical: "医", other: "物",
};

Page<PageData, any>(withPagePerformance<PageData, any>("delivery/cargo-step", {
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
    categories: (Object.keys(CARGO_LABELS) as CargoCategory[]).map((k) => ({
      value: k,
      label: CARGO_LABELS[k],
      mark: CATEGORY_MARKS[k],
    })),
    loading: true,
  },

  onLoad(query) {
    const draftId = query?.draftId as string;
    const d = repo.getDraft(draftId);
    if (!d) {
      wx.showToast({ title: "草稿不存在", icon: "none" });
      setTimeout(() => wx.navigateBack(), 600);
      return;
    }
    const c = d.cargo ?? ({
      category: "general",
      description: "",
      quantity: 1,
      fragile: false,
      needsHandling: false,
    } as CargoInfo);
    this.setData({
      draftId,
      category: c.category,
      description: c.description ?? "",
      quantity: c.quantity ?? 1,
      unitWeightKg: c.unitWeightGrams !== undefined ? String(c.unitWeightGrams / 1000) : "",
      lengthMm: c.unitDimensionsMm?.length !== undefined ? String(c.unitDimensionsMm.length / 10) : "",
      widthMm: c.unitDimensionsMm?.width !== undefined ? String(c.unitDimensionsMm.width / 10) : "",
      heightMm: c.unitDimensionsMm?.height !== undefined ? String(c.unitDimensionsMm.height / 10) : "",
      fragile: c.fragile ?? false,
      loading: false,
    });
  },

  onPickCategory(e: any) {
    this.setData({ category: e.currentTarget.dataset.value });
  },

  onDescriptionInput(e: any) {
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

  onQuantityInput(e: any) {
    const v = parseInt(e.detail.value || "1", 10);
    this.setData({ quantity: Math.max(1, isNaN(v) ? 1 : v) });
  },

  onWeightInput(e: any) { this.setData({ unitWeightKg: e.detail.value }); },
  onLengthInput(e: any) { this.setData({ lengthMm: e.detail.value }); },
  onWidthInput(e: any) { this.setData({ widthMm: e.detail.value }); },
  onHeightInput(e: any) { this.setData({ heightMm: e.detail.value }); },

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
    const cargo: CargoInfo = {
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
    draftService.update(this.data.draftId, (d) => ({ ...d, cargo }));
    wx.navigateTo({ url: `/packages/delivery/pages/model-step/index?draftId=${this.data.draftId}` });
  },
}));
