import { withPagePerformance } from "../../../../utils/page-performance";
import type { Address } from "../../../../contracts/types";
import { addressService } from "../../../../services/address";
import { subscribeDB } from "../../../../repositories/local-database";

interface PageData {
  addresses: Address[];
  selecting: boolean;
  role: "sender" | "receiver";
}

interface PageInstance {
  unsubscribe?: () => void;
}

const instance: PageInstance = {};

Page<PageData, any>(withPagePerformance<PageData, any>("packages/delivery/pages/addresses/index", {
  data: {
    addresses: [],
    selecting: false,
    role: "sender",
  },

  onLoad(query) {
    const selecting = query?.mode === "select";
    const role = query?.role === "receiver" ? "receiver" : "sender";
    this.setData({ selecting, role });
    wx.setNavigationBarTitle({ title: selecting ? (role === "sender" ? "选择寄件地址" : "选择收件地址") : "地址管理" });
    this.refresh();
    instance.unsubscribe = subscribeDB(() => this.refresh());
  },

  onUnload() {
    instance.unsubscribe?.();
  },

  refresh() {
    this.setData({ addresses: addressService.list() });
  },

  onAdd() {
    const role = this.data.selecting ? `&role=${this.data.role}` : "";
    wx.navigateTo({ url: `/packages/delivery/pages/address-edit/index?from=addresses${role}` });
  },

  onChoose(e: any) {
    if (!this.data.selecting) return;
    const address = this.data.addresses.find((a) => a.id === e.currentTarget.dataset.id);
    if (!address) return;
    this.getOpenerEventChannel().emit("addressSelected", { role: this.data.role, address });
    wx.navigateBack();
  },

  onEdit(e: any) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/packages/delivery/pages/address-edit/index?id=${id}&from=addresses` });
  },

  onCardTap(e: any) {
    if (this.data.selecting) this.onChoose(e);
    else this.onEdit(e);
  },

  onSetDefaultSender(e: any) {
    const id = e.currentTarget.dataset.id;
    const a = this.data.addresses.find((x) => x.id === id);
    if (!a) return;
    addressService.save({ ...a, isDefaultSender: !a.isDefaultSender });
  },

  onSetDefaultReceiver(e: any) {
    const id = e.currentTarget.dataset.id;
    const a = this.data.addresses.find((x) => x.id === id);
    if (!a) return;
    addressService.save({ ...a, isDefaultReceiver: !a.isDefaultReceiver });
  },
}));
