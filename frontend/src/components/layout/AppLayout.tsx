// frontend/src/components/layout/AppLayout.tsx

import React from "react";
import Navbar from "./Navbar";
import ConditionalSidebar from "./ConditionalSidebar"; // ✅ Use ConditionalSidebar

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* 🧭 Conditional Sidebar */}
      <ConditionalSidebar />

      {/* 🌐 Main Content Area */}
      <div className="flex flex-1 flex-col w-full">
        {/* 🧱 Fixed Navbar */}
        <div className="fixed top-0 left-0 md:left-64 w-full md:w-[calc(100%-16rem)] z-50">
          <Navbar />
        </div>

        {/* 📄 Page Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 mt-16">
          {/* 👆 mt-16 ensures content starts below the navbar height */}
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;