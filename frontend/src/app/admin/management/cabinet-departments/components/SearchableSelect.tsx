"use client";

import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Search, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Option {
  value: string;
  label: string;
  subLabel?: string;
}

interface SearchableSelectProps {
  label: string;
  placeholder?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: Option[];
  loading?: boolean;
  required?: boolean;
  onSearch?: (keyword: string) => void;
  searchPlaceholder?: string;
  initialDisplay?: { label: string; subLabel?: string };
  disabled?: boolean;
  /** ส่ง ref ของ container ใน modal เพื่อให้ dropdown ไปโผล่ด้านนอก (scroll ได้ปกติ) */
  portalTargetRef?: React.RefObject<HTMLElement | null>;
  /**
   * inline = วางใต้ trigger แบบ absolute
   * flow = เปิดรายการในเลย์เอาต์ปกติ (ใช้ใน Dialog — ไม่โดน overlay แย่งคลิก)
   * floating = portal ไป body + fixed
   */
  positionMode?: "inline" | "flow" | "floating";
  /** แสดงแถวล้างค่าในรายการ (เมื่อมีค่าแล้ว) เพื่อให้เปลี่ยนใจไม่เลือกได้ */
  allowClear?: boolean;
  clearLabel?: string;
  /** เมื่อ disabled และไม่มี value — แสดงข้อความนี้แทน placeholder (เช่น แผนกที่ผูก ACTIVE อยู่แล้ว) */
  disabledDisplay?: { label: string; subLabel?: string };
}

export default function SearchableSelect({
  label,
  placeholder = "เลือก...",
  value,
  onValueChange,
  options,
  loading = false,
  required = false,
  onSearch,
  searchPlaceholder = "ค้นหา...",
  initialDisplay,
  disabled = false,
  portalTargetRef,
  positionMode = "inline",
  allowClear = false,
  clearLabel = "ล้างการเลือก (ว่างช่องนี้)",
  disabledDisplay,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  type PositionState = {
    top?: number;
    bottom?: number;
    left: number;
    width: number;
    isFixed?: boolean;
    /** ในโหมด portal: จำกัดความสูง + inset จากขอบ modal */
    maxHeight?: number;
  };
  const [position, setPosition] = useState<PositionState | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const initialLoadDone = useRef(false);
  const onSearchRef = useRef(onSearch);
  onSearchRef.current = onSearch;
  /** จำ label ของตัวเลือกที่ user เลือกล่าสุด — แสดงบน trigger เมื่อ options จาก API เปลี่ยน */
  const lastSelectedRef = useRef<Option | null>(null);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const tr = triggerRef.current.getBoundingClientRect();
    // floating ก่อน — ถ้าส่งทั้ง floating + portalTargetRef ให้ลอยไป body (เลเยอร์บนสุด)
    if (positionMode === "floating") {
      const gap = 4;
      const pad = 8;
      const spaceBelow = window.innerHeight - tr.bottom - gap - pad;
      const maxH = Math.max(100, Math.min(320, spaceBelow));
      const width = Math.max(tr.width, 200);
      let left = tr.left;
      if (left + width > window.innerWidth - pad) {
        left = Math.max(pad, window.innerWidth - pad - width);
      }
      setPosition({
        top: tr.bottom + gap,
        left,
        width,
        isFixed: true,
        maxHeight: maxH,
      });
      return;
    }
    if (portalTargetRef?.current) {
      const scrollEl = portalTargetRef.current;
      const cr = scrollEl.getBoundingClientRect();
      const st = scrollEl.scrollTop;
      const sl = scrollEl.scrollLeft;
      const inset = 12;
      const gap = 6;
      /** พิกัด absolute ภายใน scroll container ต้องรวม scroll — ไม่งั้นเมนูลอยทับ trigger */
      const relLeft = tr.left - cr.left + sl;
      const clientW = scrollEl.clientWidth;
      let width = Math.min(tr.width, clientW - inset * 2);
      let left = relLeft;
      if (left + width > clientW - inset) {
        left = Math.max(inset, clientW - inset - width);
      }
      if (left < inset) {
        left = inset;
      }
      width = Math.min(width, clientW - left - inset);
      const top = tr.bottom - cr.top + st + gap;
      const spaceBelow = cr.bottom - tr.bottom - gap - inset;
      const maxHeight = Math.max(160, Math.min(300, spaceBelow));
      setPosition({
        top,
        left,
        width,
        maxHeight,
      });
      return;
    }
  };

  /** มี portal ref (แม้ .current ยังว่าง) หรือโหมดลอย body — ต้องคำนวณพิกัด */
  const useFloatingLayout =
    positionMode === "floating" || portalTargetRef != null;

  useLayoutEffect(() => {
    if (!isOpen) {
      setPosition(null);
      return;
    }
    if (!useFloatingLayout) {
      setPosition(null);
      return;
    }
    let cancelled = false;
    let rafId = 0;
    let attempts = 0;
    const run = () => {
      if (cancelled) return;
      if (
        positionMode !== "floating" &&
        portalTargetRef != null &&
        !portalTargetRef.current
      ) {
        attempts += 1;
        if (attempts < 30) {
          rafId = requestAnimationFrame(run);
        }
        return;
      }
      updatePosition();
    };
    run();
    const onScrollOrResize = () => updatePosition();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    const portalScrollEl =
      portalTargetRef != null && positionMode !== "floating"
        ? portalTargetRef.current
        : null;
    portalScrollEl?.addEventListener("scroll", onScrollOrResize, { passive: true });
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
      portalScrollEl?.removeEventListener("scroll", onScrollOrResize);
    };
  }, [isOpen, useFloatingLayout, positionMode]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const inTrigger = dropdownRef.current?.contains(target);
      const inPortal = portalRef.current?.contains(target);
      if (!inTrigger && !inPortal) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset initial load flag when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      initialLoadDone.current = false;
    }
  }, [isOpen]);

  // เปิดครั้งแรกโหลดทันที — ค้นหาว่างโหลดทันที — มีข้อความค้นหา debounce 300ms
  useEffect(() => {
    const search = onSearchRef.current;
    if (!isOpen || !search) return;

    if (!initialLoadDone.current) {
      search("");
      initialLoadDone.current = true;
      return;
    }

    const trimmed = searchTerm.trim();
    if (trimmed === "") {
      search("");
      return;
    }

    const debounce = setTimeout(() => {
      search(searchTerm);
    }, 300);

    return () => clearTimeout(debounce);
  }, [searchTerm, isOpen]);

  const q = searchTerm.trim().toLowerCase();
  const trimmedValue = value?.trim() ?? "";

  const selectedOption = options.find((opt) => opt.value === trimmedValue);
  if (selectedOption) {
    lastSelectedRef.current = selectedOption;
  } else if (
    trimmedValue &&
    (initialDisplay?.label || initialDisplay?.subLabel)
  ) {
    lastSelectedRef.current = {
      value: trimmedValue,
      label: initialDisplay.label || "—",
      subLabel: initialDisplay.subLabel,
    };
  }

  const matchesLocalQuery = (opt: Option): boolean => {
    if (!q) return true;
    return (
      opt.label.toLowerCase().includes(q) ||
      (opt.subLabel?.toLowerCase().includes(q) ?? false) ||
      opt.value.toLowerCase().includes(q)
    );
  };

  /** มี onSearch = รายการมาจาก API แล้ว — ตอนพิมพ์ค้นหาใช้ผลจาก server โดยตรง (ซ่อนแค่ "ทั้งหมด") */
  const filteredOptions = onSearch
    ? q
      ? options.filter((opt) => opt.value !== "")
      : options
    : options.filter(matchesLocalQuery);

  /** ตอนกำลังค้นหาไม่ pin ค่าเดิม — ตอนไม่ค้นหา pin ถ้าค่าที่เลือกไม่อยู่ใน list ปัจจุบัน */
  const pinnedSelectedOption: Option | null =
    !q &&
    trimmedValue &&
    !filteredOptions.some((o) => o.value === trimmedValue)
      ? selectedOption ??
        lastSelectedRef.current ??
        (trimmedValue ? { value: trimmedValue, label: trimmedValue } : null)
      : null;

  const listOptions: Option[] = pinnedSelectedOption
    ? [
        pinnedSelectedOption,
        ...filteredOptions.filter((o) => o.value !== pinnedSelectedOption.value),
      ]
    : filteredOptions;

  // แสดงรายการที่เลือกใน trigger: จาก options → initialDisplay → อย่างน้อยแสดงค่า value
  // เมื่อค่าว่าง (ถูกล้าง) ต้องไม่ค้างค่าที่เคยเลือกไว้ (lastSelectedRef) — ให้แสดง placeholder
  const displayValue = trimmedValue
    ? selectedOption ||
      (lastSelectedRef.current && lastSelectedRef.current.value === trimmedValue
        ? lastSelectedRef.current
        : null) ||
      ((initialDisplay?.label || initialDisplay?.subLabel) ? initialDisplay : { label: trimmedValue })
    : disabled && disabledDisplay && (disabledDisplay.label || disabledDisplay.subLabel)
      ? disabledDisplay
      : null;

  const panelMaxHeight = position?.maxHeight ?? 300;
  const listMaxHeight =
    position?.maxHeight != null ? Math.max(72, panelMaxHeight - 56) : 240;

  const optionsBlock = loading ? (
    <div className="flex items-center justify-center py-6">
      <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
      <span className="ml-2 text-sm text-slate-500">กำลังโหลด...</span>
    </div>
  ) : (
    <>
      {allowClear && value.trim() ? (
        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onValueChange("");
            setIsOpen(false);
            setSearchTerm("");
          }}
          className={cn(
            "w-full border-b border-amber-100 bg-amber-50/80 px-3 py-2.5 text-left text-sm text-amber-900",
            "hover:bg-amber-100/90 focus:bg-amber-100/90 focus:outline-none",
          )}
        >
          {clearLabel}
        </button>
      ) : null}
      {listOptions.length === 0 ? (
        <div className="py-6 text-center text-sm text-slate-500">ไม่พบข้อมูล</div>
      ) : (
        listOptions.map((option, idx) => (
          <button
            key={`opt-${option.value}-${idx}`}
            type="button"
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              lastSelectedRef.current = option;
              onValueChange(option.value);
              setIsOpen(false);
              setSearchTerm("");
            }}
            className={cn(
              "w-full text-left px-3 py-2.5 text-sm transition-colors border-b border-slate-50 last:border-0",
              "hover:bg-slate-50 focus:bg-slate-50 focus:outline-none",
              option.value === value && "bg-blue-50 text-blue-700 font-medium",
            )}
          >
            <div className="flex flex-col gap-0.5">
              <span className="font-medium">{option.label || "—"}</span>
              {option.subLabel != null && option.subLabel !== "" && (
                <span className="text-xs text-slate-500">{option.subLabel}</span>
              )}
            </div>
          </button>
        ))
      )}
    </>
  );

  const searchHeader = (
    <div className="border-b border-slate-100 bg-slate-50/50 p-2 shrink-0">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder={searchPlaceholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-9 border-slate-200 bg-white pl-8 text-sm"
          autoFocus
        />
      </div>
    </div>
  );

  const showFlowPanel = isOpen && positionMode === "flow" && !useFloatingLayout;
  const showInlinePanel = isOpen && !useFloatingLayout && !showFlowPanel;

  const dropdownContent = position ? (
    <div
      ref={portalRef}
      data-searchable-select-portal=""
      className={cn(
        "overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl ring-1 ring-slate-900/5",
        position.maxHeight == null && "max-h-[300px]",
      )}
      style={{
        position: position.isFixed ? "fixed" : "absolute",
        zIndex: position.isFixed ? 100_002 : 10_000,
        pointerEvents: "auto",
        left: position.left,
        width: position.width,
        minWidth: 200,
        maxHeight: panelMaxHeight,
        ...(position.isFixed && position.bottom != null
          ? { bottom: position.bottom }
          : { top: position.top ?? 0 }),
      }}
    >
      {searchHeader}
      <div
        className="overflow-y-auto overscroll-contain"
        style={{ maxHeight: listMaxHeight }}
      >
        {optionsBlock}
      </div>
    </div>
  ) : null;

  return (
    <div className="min-w-0 w-full space-y-2" ref={dropdownRef}>
      <Label>
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <div
        className={cn(
          "relative",
          showInlinePanel && "z-[10000]",
        )}
      >
        <button
          ref={triggerRef}
          type="button"
          onClick={() => {
            if (disabled) return;
            setIsOpen(!isOpen);
            if (!isOpen) {
              setSearchTerm("");
            }
          }}
          disabled={disabled}
          className={cn(
            "w-full flex items-center justify-between px-3 py-2 text-sm border rounded-md bg-white transition-colors",
            disabled && displayValue && "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-800",
            disabled && !displayValue && "cursor-not-allowed bg-gray-100 text-gray-400",
            !disabled && "hover:bg-gray-50",
            !displayValue && !disabled && "text-gray-500",
          )}
        >
          <span className="truncate">
            {displayValue ? (
              <span>
                {displayValue.label || "—"}
                {displayValue.subLabel != null && displayValue.subLabel !== "" && (
                  <span className="text-slate-500 ml-2">- {displayValue.subLabel}</span>
                )}
              </span>
            ) : (
              placeholder
            )}
          </span>
          <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "transform rotate-180")} />
        </button>

        {showInlinePanel && (
          <div
            className={cn(
              "absolute left-0 right-0 top-full z-[10001] mt-1 flex max-h-[min(300px,50vh)] flex-col overflow-hidden",
              "rounded-lg border border-slate-200 bg-white shadow-xl ring-1 ring-slate-900/5",
            )}
          >
            {searchHeader}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{optionsBlock}</div>
          </div>
        )}

        {showFlowPanel && (
          <div
            className={cn(
              "relative z-10 mt-1 flex max-h-60 flex-col overflow-hidden",
              "rounded-lg border border-slate-200 bg-white shadow-sm ring-1 ring-slate-900/5",
            )}
          >
            {searchHeader}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{optionsBlock}</div>
          </div>
        )}

        {useFloatingLayout &&
          dropdownContent &&
          typeof document !== "undefined" &&
          (() => {
            const target = position?.isFixed ? document.body : portalTargetRef?.current;
            return target ? createPortal(dropdownContent, target) : null;
          })()}
      </div>
    </div>
  );
}
