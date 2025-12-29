import React, { Suspense } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";

// Lazy-loaded components for better performance
const AdminWidget = React.lazy(() => import("./widgets/AdminWidget"));
const TeacherWidget = React.lazy(() => import("./widgets/TeacherWidget"));
const StudentWidget = React.lazy(() => import("./widgets/StudentWidget"));
const ParentWidget = React.lazy(() => import("./widgets/ParentWidget"));

// ---
// Component for Dashboard Page
// ---
const DashboardPage: React.FC = () => {
  const user = useSelector((state: RootState) => state.auth.user);

  if (!user) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Please log in to view your dashboard.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* 📄 Header Section */}
      <div className="pb-4 border-b border-border">
        <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground">
          Dashboard
        </h1>
        <p className="mt-1 text-sm md:text-base text-muted-foreground">
          Welcome, <span className="font-semibold text-foreground">{user.name}</span>! 
          Your roles: <span className="text-primary font-medium">{user.roles.join(", ")}</span>
        </p>
      </div>

      {/* 🧩 Widget Layout Section */}
      
      {/* The grid is defined with sm:grid-cols-2. To make a widget full-width, 
          it must be wrapped in a div with col-span-full. 
      */}
      <div className="grid grid-cols-1 gap-4 md:gap-6 sm:grid-cols-2">
        
        {user.roles.includes("STUDENT") && (
          <Suspense fallback={<WidgetSkeleton />}>
            {/* Forces full width */}
            <div className="col-span-full">
              <StudentWidget />
            </div>
          </Suspense>
        )}
        
        {user.roles.includes("ADMIN") && (
          <Suspense fallback={<WidgetSkeleton />}>
            {/* Apply col-span-full for full width display */}
            <div className="col-span-full"> 
              <AdminWidget />
            </div>
          </Suspense>
        )}

        {user.roles.includes("TEACHER") && (
          <Suspense fallback={<WidgetSkeleton />}>
            {/* ✅ FIX: Apply col-span-full for full width display */}
            <div className="col-span-full"> 
              <TeacherWidget />
            </div>
          </Suspense>
        )}

        {user.roles.includes("PARENT") && (
          <Suspense fallback={<WidgetSkeleton />}>
            {/* Apply col-span-full for full width display */}
            <div className="col-span-full"> 
              <ParentWidget />
            </div>
          </Suspense>
        )}
      </div>
    </div>
  );
};

// ---
// Skeleton Loading Component
// ---
const WidgetSkeleton = () => (
  <div className="p-6 bg-card rounded-lg shadow border border-border h-32 flex items-center justify-center">
    <div className="animate-pulse text-muted-foreground">Loading...</div>
  </div>
);

export default DashboardPage;