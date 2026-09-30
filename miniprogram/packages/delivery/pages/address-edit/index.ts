import { withPagePerformance } from "../../../../utils/page-performance";
import type { Address } from "../../../../contracts/types";
import { addressService } from "../../../../services/address";
import { APP_CONFIG } from "../../../../config/index";
import { locationAdapter } from "../../../../adapters/location";

interface PageData {
  id: string | null;
  name: string;
  contactName: string;
  contactMobile: string;
  detail: string;
  label: "home" | "company" | "school" | "other";
  isDefaultSender: boolean;
  isDefaultReceiver: boolean;
  demoCenter: { latitude: number; longitude: number };
  location: { latitude: number; longitude: number };
  regionCode: string;
  hasRealLocation: boolean;
  loading: boolean;
  from: string;
  locationChosen: boolean;
}

Page<PageData, any>(withPagePerformance<PageData, any>("packages/delivery/pages/address-edit/index", {
  data: {
    id: null,
    name: "",
    contactName: "测试用户",
    contactMobile: "138****0000",
    detail: "",
    label: "school",
    isDefaultSender: false,
    isDefaultReceiver: false,
    demoCenter: APP_CONFIG.demoCenter,
    location: APP_CONFIG.demoCenter,
    regionCode: "",
    hasRealLocation: false,
    loading: true,
    from: "addresses",
    locationChosen: false,
  },

  onLoad(query) {
    const id = (query?.id as string) || null;
    let a: Address | undefined;
    if (id) a = addressService.list().find((x) => x.id === id);
    const from = (query?.from as string) || "addresses";
    if (a) {
      this.setData({
        id: a.id,
        name: a.name,
        contactName: a.contactName,
        contactMobile: a.contactMobile,
        detail: a.detail,
        label: a.label ?? "other",
        isDefaultSender: a.isDefaultSender,
        isDefaultReceiver: a.isDefaultReceiver,
        demoCenter: a.location,
        location: a.location,
        regionCode: a.regionCode,
        hasRealLocation: true,
        locationChosen: true,
        loading: false,
        from,
      });
    } else {
      this.setData({ loading: false, from, locationChosen: false, hasRealLocation: false });
    }
  },

  onInput(e: any) {
    const field = e.currentTarget.dataset.field as keyof PageData;
    this.setData({ [field]: e.detail.value });
  },

  onLabelChange(e: any) {
    this.setData({ label: e.currentTarget.dataset.label });
  },

  onChoosePlace() {
    wx.navigateTo({
      url: "/packages/delivery/pages/place-search/index",
      success: (res) => res.eventChannel.on("placeSelected", (place: any) => this.setData({
        name: place.name,
        detail: place.detail || place.name,
        location: place.point,
        regionCode: place.adcode || this.data.regionCode,
        demoCenter: place.point,
        hasRealLocation: true,
        locationChosen: true,
      })),
    });
  },

  onToggleSender() {
    this.setData({ isDefaultSender: !this.data.isDefaultSender });
  },

  onToggleReceiver() {
    this.setData({ isDefaultReceiver: !this.data.isDefaultReceiver });
  },

  async onPickCurrent() {
    try {
      const point = await locationAdapter.requestLocation();
      this.setData({
        demoCenter: point,
        location: point,
        hasRealLocation: true,
        locationChosen: true,
      });
    } catch (error) {
      console.warn("[address] wx.getLocation failed", error);
      wx.showToast({ title: "定位失败，请检查微信定位权限", icon: "none" });
    }
  },

  onMapRegionChange(e: any) {
    if (e?.type !== "end" && e?.detail?.type !== "end") return;
    wx.createMapContext("edit-map", this).getCenterLocation({
      success: (point) => this.setData({ location: { latitude: point.latitude, longitude: point.longitude } }),
    });
  },

  onSave() {
    const { name, contactName, contactMobile, detail } = this.data;
    if (!name.trim() || !detail.trim()) {
      wx.showToast({ title: "请填写地址名称和详细地址", icon: "none" });
      return;
    }
    if (!contactName.trim()) {
      wx.showToast({ title: "请填写联系人", icon: "none" });
      return;
    }
    if (!this.data.locationChosen) {
      wx.showToast({ title: "请先搜索地点或在地图上选点", icon: "none" });
      return;
    }
    if (!/^\d{11}$|^\d{3}\*+\d{4}$/.test(contactMobile.trim())) {
      wx.showToast({ title: "联系电话格式不正确", icon: "none" });
      return;
    }
    addressService.save({
      id: this.data.id ?? undefined,
      name: name.trim(),
      detail: detail.trim(),
      contactName: contactName.trim(),
      contactMobile: contactMobile.trim(),
      regionCode: this.data.regionCode,
      label: this.data.label,
      isDefaultSender: this.data.isDefaultSender,
      isDefaultReceiver: this.data.isDefaultReceiver,
      location: this.data.location,
    });
    wx.showToast({ title: "保存成功", icon: "success" });
    setTimeout(() => {
      wx.navigateBack({ delta: 1, success: () => {} });
    }, 600);
  },

  onDelete() {
    if (!this.data.id) return;
    wx.showModal({
      title: "删除地址",
      content: "确认删除该常用地址？",
      success: (res) => {
        if (res.confirm) {
          addressService.remove(this.data.id!);
          wx.navigateBack();
        }
      },
    });
  },
}));
