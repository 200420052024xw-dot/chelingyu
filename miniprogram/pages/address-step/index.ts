import type { Address, DeliveryAddressSnapshot, ServiceTimeMode } from "../../contracts/types";
import { addressService } from "../../services/address";
import { draftStore } from "../../stores/order-draft";
import { subscribeDB } from "../../repositories/local-database";
import { sessionStore } from "../../stores/session";
import { draftService } from "../../services/draft";
import { updateBookingDraft } from "../../services/booking-draft";
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
  timeColumns: string[][];
  timeSelection: number[];
  step: number;
  totalSteps: number;
  loading: boolean;
  dateMin: string;
  returnToConfirm: boolean;
}

interface PageInstance {
  unsubscribe?: () => void;
}

const instance: PageInstance = {};
const HOURS = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, "0"));
const MINUTES = Array.from({ length: 12 }, (_, slot) => String(slot * 5).padStart(2, "0"));

function alignScheduledTime(iso?: string | null) {
  if (!iso) return { date: "", time: "", iso: null, selection: [0, 0] };
  let date = iso.substring(0, 10);
  const hour = Number(iso.substring(11, 13));
  const minute = Number(iso.substring(14, 16));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59) {
    return { date: "", time: "", iso: null, selection: [0, 0] };
  }
  let totalMinutes = hour * 60 + Math.ceil(minute / 5) * 5;
  if (totalMinutes === 24 * 60) {
    const [year, month, day] = date.split("-").map(Number);
    date = new Date(Date.UTC(year, month - 1, day + 1)).toISOString().substring(0, 10);
    totalMinutes = 0;
  }
  const alignedHour = Math.floor(totalMinutes / 60);
  const minuteSlot = (totalMinutes % 60) / 5;
  const time = `${HOURS[alignedHour]}:${MINUTES[minuteSlot]}`;
  return { date, time, iso: `${date}T${time}:00+08:00`, selection: [alignedHour, minuteSlot] };
}

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
    timeColumns: [HOURS.map((hour) => `${hour} 时`), MINUTES.map((minute) => `${minute} 分`)],
    timeSelection: [0, 0],
    step: 1,
    totalSteps: 3,
    loading: true,
    dateMin: "",
    returnToConfirm: false,
  },

  onLoad(query) {
    const draftId = query?.draftId as string | undefined;
    let d = draftId ? repo.getDraft(draftId) : null;
    if (!d && !draftId) d = draftService.create();
    if (!d) {
      wx.showToast({ title: "订单草稿已失效，请重新下单", icon: "none" });
      wx.switchTab({ url: "/pages/home/index" });
      return;
    }

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
    const scheduled = alignScheduledTime(d?.scheduledPickupAt);

    this.setData({
      draftId: d?.id ?? null,
      returnToConfirm: query?.returnTo === "confirm",
      sender: d?.sender ? findAddr(list, d.sender) ?? null : null,
      receiver: d?.receiver ? findAddr(list, d.receiver) ?? null : null,
      addresses: list,
      serviceTimeMode: d?.serviceTimeMode ?? "immediate",
      scheduledIso: scheduled.iso,
      scheduledDate: scheduled.date,
      scheduledTime: scheduled.time,
      timeSelection: scheduled.selection,
      dateMin,
      loading: false,
    });

    instance.unsubscribe = subscribeDB(() => {
      this.setData({ addresses: addressService.list() });
    });
  },

  onUnload() {
    instance.unsubscribe?.();
    if (!this.data.returnToConfirm && this.data.draftId) {
      if (repo.getDraft(this.data.draftId)) draftService.remove(this.data.draftId);
      if (draftStore.get()?.id === this.data.draftId) draftStore.clear();
    }
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
    const [hour, minuteSlot] = e.detail.value as number[];
    this.setData({
      scheduledTime: `${HOURS[hour]}:${MINUTES[minuteSlot]}`,
      timeSelection: [hour, minuteSlot],
    });
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
    try {
      if (this.data.returnToConfirm && this.data.draftId) {
        updateBookingDraft(this.data.draftId, (current) => ({ ...current, ...draftValues }));
        wx.navigateBack();
        return;
      }
      const draft = this.data.draftId
        ? draftService.update(this.data.draftId, (current) => ({ ...current, ...draftValues }))
        : draftService.create(draftValues);
      this.setData({ draftId: draft.id });
      draftStore.set(draft);
      wx.navigateTo({ url: `/packages/delivery/pages/cargo-step/index?draftId=${draft.id}` });
    } catch (error: any) {
      wx.showToast({ title: error?.message || "报价更新失败", icon: "none" });
    }
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
