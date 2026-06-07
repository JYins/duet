"use client";

import type { ReactNode } from "react";
import { Camera } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import { cn } from "@/lib/utils";

interface ToolItem {
  id: string;
  label: string;
  value?: string;
  icon: ReactNode;
  active?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}

interface BottomControlDockProps {
  tools: ToolItem[];
  onShutter: () => void;
  shutterDisabled?: boolean;
  footer?: ReactNode;
}

export default function BottomControlDock({
  tools,
  onShutter,
  shutterDisabled,
  footer,
}: BottomControlDockProps) {
  const { t } = useLocale();
  const before = tools.slice(0, 2);
  const after = tools.slice(2, 4);

  return (
    <div className="booth-dock">
      <div className="grid grid-cols-[1fr_1fr_6rem_1fr_1fr] items-center gap-3">
        {before.map((tool) => (
          <Tool key={tool.id} item={tool} />
        ))}
        <button
          type="button"
          onClick={onShutter}
          disabled={shutterDisabled}
          className="shutter-button"
          aria-label={t("booth.capture")}
        >
          <Camera size={24} strokeWidth={1.5} />
        </button>
        {after.map((tool) => (
          <Tool key={tool.id} item={tool} />
        ))}
      </div>
      {footer && <div className="pt-5">{footer}</div>}
    </div>
  );
}

function Tool({ item }: { item: ToolItem }) {
  return (
    <button
      type="button"
      onClick={item.onClick}
      disabled={item.disabled}
      className={cn("dock-tool", item.active && "dock-tool-active")}
    >
      <span className="dock-icon">{item.icon}</span>
      <span className="dock-label">{item.label}</span>
      {item.value && <span className="dock-value">{item.value}</span>}
    </button>
  );
}
