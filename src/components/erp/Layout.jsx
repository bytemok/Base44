import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import TopBar from "./TopBar";
import BottomTabBar from "./BottomTabBar";

export default function Layout() {
  const location = useLocation();
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="hidden md:block">
        <TopBar />
      </div>
      <main className="safe-top mx-auto max-w-[1600px] px-4 pb-24 pt-4 sm:px-6 md:pb-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      <BottomTabBar />
    </div>
  );
}