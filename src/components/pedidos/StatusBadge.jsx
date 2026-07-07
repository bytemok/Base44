import React from "react";

const STATUS_CONFIG = {
  "Nuevo": {
    bg: "bg-blue-50",
    text: "text-blue-700",
    dot: "bg-blue-500",
    ring: "ring-blue-200"
  },
  "En proceso": {
    bg: "bg-amber-50",
    text: "text-amber-700",
    dot: "bg-amber-500",
    ring: "ring-amber-200"
  },
  "Enviado": {
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    dot: "bg-indigo-500",
    ring: "ring-indigo-200"
  },
  "Entregado": {
    bg: "bg-green-50",
    text: "text-green-700",
    dot: "bg-green-500",
    ring: "ring-green-200"
  }
};

const STATUS_ORDER = ["Nuevo", "En proceso", "Enviado", "Entregado"];

export default function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG["Nuevo"];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${config.bg} ${config.text} ring-1 ring-inset ${config.ring}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`}></span>
      {status}
    </span>
  );
}

export { STATUS_CONFIG, STATUS_ORDER };