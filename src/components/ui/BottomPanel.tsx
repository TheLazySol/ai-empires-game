"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronDown, ChevronUp } from "lucide-react";
import OverviewTab from "@/components/panels/OverviewTab";
import ProductionTab from "@/components/panels/ProductionTab";

export default function BottomPanel() {
  const [isMinimized, setIsMinimized] = useState(false);
  const panelHeight = "30vh"; // 30% of viewport height

  return (
    <AnimatePresence>
      <motion.div
        initial={false}
        animate={{
          height: isMinimized ? 0 : panelHeight,
          opacity: isMinimized ? 0 : 1,
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg overflow-hidden"
        style={{ height: isMinimized ? 0 : panelHeight }}
      >
        <div className="relative h-full flex flex-col">
          {/* Minimize button */}
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="absolute top-2 right-2 z-50 p-1 rounded hover:bg-gray-100 transition-colors"
            aria-label={isMinimized ? "Expand panel" : "Minimize panel"}
          >
            {isMinimized ? (
              <ChevronUp className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-600" />
            )}
          </button>

          {/* Tabs */}
          <Tabs defaultValue="overview" className="h-full flex flex-col">
            <TabsList className="w-full justify-start border-b px-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="production">Production</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-auto p-4">
              <TabsContent value="overview" className="mt-0 h-full">
                <OverviewTab />
              </TabsContent>
              <TabsContent value="production" className="mt-0 h-full">
                <ProductionTab />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

