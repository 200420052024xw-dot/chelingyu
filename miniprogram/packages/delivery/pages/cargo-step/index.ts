import type { CargoCategory, CargoInfo } from "../../../../contracts/types";
import { draftService } from "../../../../services/draft";
import { updateBookingDraft } from "../../../../services/booking-draft";
import { repo } from "../../../../repositories/index";
import { CARGO_LABELS } from "../../../../view-models/cargo";
import { withPagePerformance } from "../../../../utils/page-performance";

interface PageData {
  draftId: string;
  category: CargoCategory;
  description: string;
  quantity: number;
  unitWeightKg: string;
  lengthMeters: string;
  widthMeters: string;
  heightMeters: string;
  fragile: boolean;
  categories: Array<{ value: CargoCategory; label: string; icon: string }>;
  loading: boolean;
  returnToConfirm: boolean;
}

const CATEGORY_ICONS: Record<CargoCategory, string> = {
  general: "/assets/icons/tabler/package.svg",
  document: "/assets/icons/tabler/file-text.svg",
  fresh_cold_chain: "/assets/icons/tabler/snowflake.svg",
  food: "/assets/icons/tabler/tools-kitchen-2.svg",
  medical: "/assets/icons/tabler/first-aid-kit.svg",
  other: "/assets/icons/tabler/dots.svg",
};

Page<PageData, any>(withPagePerformance<PageData, any>("delivery/cargo-step", {
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
    categories: (Object.keys(CARGO_LABELS) as CargoCategory[]).map((k) => ({
      value: k,
      label: CARGO_LABELS[k],
      icon: CATEGORY_ICONS[k],
    })),
    loading: true,
    returnToConfirm: false,
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
      returnToConfirm: query?.returnTo === "confirm",
      category: c.category,
      description: c.description ?? "",
      quantity: c.quantity ?? 1,
      unitWeightKg: c.unitWeightGrams !== undefined ? String(c.unitWeightGrams / 1000) : "",
      lengthMeters: c.unitDimensionsMm?.length !== undefined ? String(c.unitDimensionsMm.length / 1000) : "",
      widthMeters: c.unitDimensionsMm?.width !== undefined ? String(c.unitDimensionsMm.width / 1000) : "",
      heightMeters: c.unitDimensionsMm?.height !== undefined ? String(c.unitDimensionsMm.height / 1000) : "",
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
  onLengthInput(e: any) { this.setData({ lengthMeters: e.detail.value }); },
  onWidthInput(e: any) { this.setData({ widthMeters: e.detail.value }); },
  onHeightInput(e: any) { this.setData({ heightMeters: e.detail.value }); },

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
    const cargo: CargoInfo = {
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
        updateBookingDraft(this.data.draftId, (d) => ({ ...d, cargo }));
        wx.navigateBack();
      } else {
        draftService.update(this.data.draftId, (d) => ({ ...d, cargo }));
        wx.navigateTo({ url: `/packages/delivery/pages/model-step/index?draftId=${this.data.draftId}` });
      }
    } catch (error: any) {
      wx.showToast({ title: error?.message || "报价更新失败", icon: "none" });
    }
  },
}));
