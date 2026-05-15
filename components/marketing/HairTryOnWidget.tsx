"use client";

import { Sparkles } from "lucide-react";
import { useState } from "react";
import { HairTryOnModal } from "@/components/marketing/HairTryOnModal";

export function HairTryOnWidget() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-5 z-40 flex h-14 items-center gap-2 rounded-full bg-[#0057ff] px-4 font-black text-white shadow-soft"
      >
        <Sparkles size={20} />
        Prueba tu look
      </button>
      <HairTryOnModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
