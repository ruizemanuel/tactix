"use client";

declare global {
  interface Window {
    ethereum?: {
      isMiniPay?: boolean;
    };
  }
}

/** True when running inside the MiniPay in-app browser (it injects window.ethereum.isMiniPay). */
export function isMiniPay(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.ethereum?.isMiniPay);
}
