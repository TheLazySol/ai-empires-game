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
    <div className="fixed bottom-0 left-0 right-0 z-40">
      {/* Minimize button - always visible */}
      <button
        onClick={() => setIsMinimized(!isMinimized)}
        className="absolute bottom-0 right-2 z-50 p-1 rounded-t hover:bg-gray-100 transition-colors bg-white border-t border-l border-r border-gray-200 shadow-lg"
        aria-label={isMinimized ? "Expand panel" : "Minimize panel"}
        style={{ 
          bottom: isMinimized ? 0 : panelHeight,
          transition: "bottom 0.3s ease-in-out"
        }}
      >
        {isMinimized ? (
          <ChevronUp className="w-5 h-5 text-black" />
        ) : (
          <ChevronDown className="w-5 h-5 text-black" />
        )}
      </button>

      {/* Collapsible panel content */}
      <AnimatePresence>
        {!isMinimized && (
          <motion.div
            initial={false}
            animate={{
              height: panelHeight,
              opacity: 1,
            }}
            exit={{
              height: 0,
              opacity: 0,
            }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="bg-white border-t border-gray-200 shadow-lg overflow-hidden"
            style={{ height: panelHeight }}
          >
            <div className="relative h-full flex flex-col">
              {/* Tabs */}
              <Tabs defaultValue="overview" className="h-full flex flex-col">
                <TabsList className="w-full justify-start border-b px-4 text-black">
                  <TabsTrigger value="overview" className="text-black data-[state=active]:bg-black data-[state=active]:text-white">Overview</TabsTrigger>
                  <TabsTrigger value="production" className="text-black data-[state=active]:bg-black data-[state=active]:text-white">Production</TabsTrigger>
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
        )}
      </AnimatePresence>
    </div>
  );
}

