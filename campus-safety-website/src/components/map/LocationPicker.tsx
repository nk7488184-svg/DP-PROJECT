"use client";

import dynamic from "next/dynamic";

const LocationPickerInner = dynamic(() => import("./LocationPickerInner"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[300px] bg-gray-100 animate-pulse rounded-xl flex items-center justify-center">
      <p className="text-muted text-sm">Loading map…</p>
    </div>
  ),
});

export default function LocationPicker({
  value,
  address,
  onChange,
  onAddressChange,
}: {
  value: { lat: number; lng: number } | null;
  address?: string;
  onChange: (val: { lat: number; lng: number }) => void;
  onAddressChange?: (addr: string) => void;
}) {
  return (
    <LocationPickerInner
      value={value}
      address={address}
      onChange={onChange}
      onAddressChange={onAddressChange}
    />
  );
}
