import type { Address, DeliveryAddressSnapshot, ServiceTimeMode } from "../../contracts/types";
import { addressService } from "../../services/address";
import { draftStore } from "../../stores/order-draft";
import { subscribeDB } from "../../repositories/local-database";
import { sessionStore } from "../../stores/session";
import { draftService } from "../../services/draft";
import { repo } from "../../repositories/index";
import { formatDateTime } from "../../adapters/clock";
import { withPagePerformance } from "../../utils/page-performance";

interface PageData {
  draftId: string | null;
  sender: Address | null;
  receiver: Address | null;
  addresses: Address[];
  serviceTimeMode: ServiceTimeMode;
  scheduledDate: string;
  scheduledTime: string;
  scheduledIso: string | null;
  step: number;
  totalSteps: number;
  loading: boolean;
  dateMin: string;
}

interface PageInstance {
  unsubscribe?: () => void;
}

const instance: PageInstance = {};

Page<PageData, any>(withPagePerformance<PageData, any>("delivery/address-step", {
  data: {
    draftId: null,
    sender: null,
    receiver: null,
    addresses: [],
    serviceTimeMode: "immediate",
    scheduledDate: "",
    scheduledTime: "",
    scheduledIso: null,
    step: 1,
    totalSteps: 3,
    loading: true,
    dateMin: "",
  },

  onLoad(query) {
    const draftId = query?.draftId as string | undefined;
    let d = draftId ? repo.getDraft(draftId) : null;
    if (!d) d = draftService.loadCurrent() ?? null;

    const list = addressService.list();
    if (d?.sender) {
      const a = list.find((x) => x.id === d.sender?.sourceAddressId);
      if (a) d.sender = snapFromAddress(a);
    }
    if (d?.receiver) {
      const a = list.find((x) => x.id === d.receiver?.sourceAddressId);
      if (a) d.receiver = snapFromAddress(a);
    }

    const today = new Date();
    const dateMin = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    this.setData({
      draftId: d?.id ?? null,
      sender: d?.sender ? findAddr(list, d.sender) ?? null : null,
      receiver: d?.receiver ? findAddr(list, d.receiver) ?? null : null,
      addresses: list,
      serviceTimeMode: d?.serviceTimeMode ?? "immediate",
      scheduledIso: d?.scheduledPickupAt ?? null,
      scheduledDate: d?.scheduledPickupAt ? d.scheduledPickupAt.substring(0, 10) : "",
      scheduledTime: d?.scheduledPickupAt ? d.scheduledPickupAt.substring(11, 16) : "",
      dateMin,
      loading: false,
    });

    instance.unsubscribe = subscribeDB(() => {
      this.setData({ addresses: addressService.list() });
    });
  },

  onUnload() {
    instance.unsubscribe?.();
  },

  onPickSender(e: any) {
    wx.navigateTo({
      url: "/packages/delivery/pages/addresses/index?mode=select&role=sender",
      success: (res) => res.eventChannel.on("addressSelected", (result: any) => this.setData({ sender: result.address })),
    });
  },

  onPickReceiver(e: any) {
    wx.navigateTo({
      url: "/packages/delivery/pages/addresses/index?mode=select&role=receiver",
      success: (res) => res.eventChannel.on("addressSelected", (result: any) => this.setData({ receiver: result.address })),
    });
  },

  onAddAddress() {
    const role = this.data.sender ? "receiver" : "sender";
    wx.navigateTo({ url: `/packages/delivery/pages/address-edit/index?from=address-step&role=${role}` });
  },

  onSelectTimeMode(e: any) {
    const mode = e.currentTarget.dataset.mode as ServiceTimeMode;
    this.setData({ serviceTimeMode: mode });
  },

  onPickDate(e: any) {
    this.setData({ scheduledDate: e.detail.value });
    this.refreshScheduledIso();
  },

  onPickTime(e: any) {
    this.setData({ scheduledTime: e.detail.value });
    this.refreshScheduledIso();
  },

  refreshScheduledIso() {
    const { scheduledDate, scheduledTime } = this.data;
    if (!scheduledDate || !scheduledTime) return;
    const iso = `${scheduledDate}T${scheduledTime}:00+08:00`;
    this.setData({ scheduledIso: iso });
  },

  async onNext() {
    if (!this.data.sender || !this.data.receiver) {
      wx.showToast({ title: "请选择寄收件地址", icon: "none" });
      return;
    }
    if (this.data.serviceTimeMode === "scheduled" && !this.data.scheduledIso) {
      wx.showToast({ title: "请选择预约时间", icon: "none" });
      return;
    }
    if (this.data.serviceTimeMode === "scheduled" && new Date(this.data.scheduledIso!).getTime() <= Date.now()) {
      wx.showToast({ title: "预约时间需晚于当前时间", icon: "none" });
      return;
    }
    const senderSnap = snapFromAddress(this.data.sender);
    const receiverSnap = snapFromAddress(this.data.receiver);
    const draftValues = {
      sender: senderSnap,
      receiver: receiverSnap,
      serviceTimeMode: this.data.serviceTimeMode,
      scheduledPickupAt: this.data.serviceTimeMode === "scheduled" ? this.data.scheduledIso ?? undefined : undefined,
    };
    const draft = this.data.draftId
      ? draftService.update(this.data.draftId, (current) => ({ ...current, ...draftValues }))
      : draftService.create(draftValues);
    this.setData({ draftId: draft.id });
    draftStore.set(draft);
    wx.navigateTo({ url: `/packages/delivery/pages/cargo-step/index?draftId=${draft.id}` });
  },

  formatTimeLabel(iso?: string | null) {
    if (!iso) return "请选择";
    return formatDateTime(iso);
  },
}));

function snapFromAddress(a: Address): DeliveryAddressSnapshot {
  return {
    sourceAddressId: a.id,
    name: a.name,
    contactName: a.contactName,
    contactMobile: a.contactMobile,
    regionCode: a.regionCode,
    detail: a.detail,
    location: a.location,
  };
}

function findAddr(list: Address[], snap: DeliveryAddressSnapshot): Address | undefined {
  if (snap.sourceAddressId) return list.find((x) => x.id === snap.sourceAddressId);
  return list.find((x) => x.name === snap.name && x.detail === snap.detail);
}
