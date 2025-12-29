import React, { useState } from "react";
import { useSelector } from "react-redux";
import { NavLink } from "react-router-dom";
import { RootState } from "../../store/store";
import { toggleTheme } from "../../utils/theme";
import { useAuth } from "../../features/auth/useAuth";
import { FiMenu, FiX } from "react-icons/fi";
import { RefreshCw } from "lucide-react"; // ✅ Added

type Role = "ADMIN" | "TEACHER" | "STUDENT" | "PARENT";

interface NavLinkItem {
  name: string;
  path: string;
  icon: any;
}

interface NavSection {
  title: string;
  links: NavLinkItem[];
  collapsible?: boolean;
}

/** ✅ Role-based Sidebar Navigation */
const links: Record<Role, NavSection[]> = {
  ADMIN: [
    {
      title: "Core",
      links: [
        { name: "Dashboard", path: "/dashboard", icon: "🏠" },
        { name: "Notifications", path: "/notifications", icon: "🔔" },
        { name: "Messages", path: "/chat", icon: "💬" },
        { name: "Manage Announcements", path: "/admin/announcements", icon: "📢" },
      ],
    },
    // 🆕 ADD THIS NEW SECTION
    {
      title: "Learning Resources",
      collapsible: true,
      links: [
        { name: "Video Library", path: "/videos", icon: "🎥" },
        { name: "Live Sessions", path: "/live-sessions", icon: "📺" },
        { name: "Video Analytics", path: "/admin/video-analytics", icon: "📊" },
        { name: "Upload Video", path: "/videos/upload", icon: "⬆️" },
        { name: "Create Session", path: "/live-sessions/create", icon: "➕" },
      ],
    },
    {
      title: "Academic Management",
      collapsible: true,
      links: [
        { name: "Manage Departments", path: "/departments/admin", icon: "🏢" },
        { name: "Manage Classes", path: "/classes/admin", icon: "🏫" },
        { name: "Manage Subjects", path: "/subjects/admin", icon: "📘" },
        { name: "Subject Lessons", path: "/subjects/admin", icon: "📖" },
        { name: "Lesson Topics", path: "/lesson-topics/admin", icon: "🗂️" },
        { name: "AI Questions", path: "/ai-questions", icon: "🤖" },
        { name: "Sessions", path: "/sessions/admin", icon: "📚" },
        { name: "Terms", path: "/terms/admin", icon: "📅" },
        { name: "Enrollments", path: "/enrollments/admin", icon: "🎓" },
        { name: "Student Profiles", path: "/student-profiles/admin", icon: "🧑‍🎓" },
        { name: "Teacher Profiles", path: "/teacher-profiles/admin", icon: "👨‍🏫" },
        { name: "Schedule Management", path: "/schedules/admin", icon: "📋" },
        { name: "Schedule Generation", path: "/admin/schedule-generation", icon: <RefreshCw className="w-5 h-5" /> },
      ],
    },
    {
      title: "Assessments",
      collapsible: true,
      links: [
        { name: "Assessment Dashboard", path: "/admin/assessments/dashboard", icon: "📊" },
        { name: "All Assessments", path: "/assessments/admin", icon: "📝" },
        { name: "Students Overview", path: "/admin/assessments/students-overview", icon: "👥" },
        { name: "Subjects Overview", path: "/admin/assessments/subjects-overview", icon: "📘" },
        { name: "Student Performance", path: "/admin/assessments/student/:studentId/performance", icon: "📈" },
        { name: "Subject Breakdown", path: "/admin/assessments/subject/:subjectId/breakdown", icon: "📊" },
        { name: "Pending Grading", path: "/admin/pending-grading", icon: "⏳" },
        { name: "Question Bank", path: "/assessments/question-bank", icon: "📚" },
        { name: "Results", path: "/assessments/results", icon: "📊" },
      ],
    },
    {
      title: "User Management",
      collapsible: true,
      links: [
        { name: "Manage Users", path: "/users/admin", icon: "👥" },
        { name: "Settings", path: "/settings", icon: "⚙️" },
      ],
    },
  ],

  TEACHER: [
    {
      title: "Teacher Portal",
      collapsible: true,
      links: [
        { name: "Dashboard", path: "/dashboard", icon: "🏠" },
        { name: "Notifications", path: "/notifications", icon: "🔔" },
        { name: "Messages", path: "/chat", icon: "💬" },
        { name: "Announcements", path: "/announcements", icon: "📢" },
        { name: "My Profile", path: "/teacher/profile", icon: "👨‍🏫" },
        { name: "My Students", path: "/teacher/students", icon: "👨‍🎓" },
        { name: "My Departments", path: "/departments/teacher", icon: "🏢" },
        { name: "My Classes", path: "/classes/teacher", icon: "🏫" },
        { name: "My Subjects", path: "/subjects/teacher", icon: "📚" },
        { name: "Subject Lessons", path: "/subjects/teacher", icon: "📖" },
        { name: "Lesson Topics", path: "/lesson-topics/teacher", icon: "🗂️" },
        { name: "Create Assessments", path: "/lesson-topics/teacher", icon: "📝" },
        { name: "AI Questions", path: "/ai-questions", icon: "🤖" },
        { name: "Sessions", path: "/sessions/teacher", icon: "📚" },
        { name: "Terms", path: "/terms/teacher", icon: "📅" },
        { name: "Enrollments", path: "/enrollments/teacher", icon: "🎓" },
        { name: "Student Profiles", path: "/student-profiles/teacher", icon: "🧑‍🎓" },
        { name: "Schedule Lessons", path: "/schedules/teacher", icon: "📋" },
        { name: "Pending Grading", path: "/teacher/pending-grading", icon: "⏳" },
      ],
    },
    // 🆕 ADD THIS NEW SECTION
    {
      title: "Teaching Tools",
      collapsible: true,
      links: [
        { name: "Video Library", path: "/videos", icon: "🎥" },
        { name: "Upload Video", path: "/videos/upload", icon: "⬆️" },
        { name: "Video Analytics", path: "/videos/analytics", icon: "📊" },
        { name: "Live Sessions", path: "/live-sessions", icon: "📺" },
        { name: "Create Session", path: "/live-sessions/create", icon: "➕" },
      ],
    },
    {
      title: "Assessments",
      collapsible: true,
      links: [
        { name: "My Old Assessments", path: "/assessments/teacher/onit", icon: "📝" },
        { name: "My Assessments", path: "/assessments/teacher", icon: "📝" },
        { name: "Create Assessment", path: "/assessments/create", icon: "➕" },
        { name: "Question Bank", path: "/assessments/question-bank", icon: "📚" },
      ],
    },
  ],

  STUDENT: [
    {
      title: "Student Hub",
      collapsible: true,
      links: [
        { name: "Dashboard", path: "/dashboard", icon: "🏠" },
        { name: "Notifications", path: "/notifications", icon: "🔔" },
        { name: "Messages", path: "/chat", icon: "💬" },
        { name: "Announcements", path: "/announcements", icon: "📢" },
        { name: "My Subjects", path: "/subjects/student", icon: "📖" },
        { name: "Subject Lessons", path: "/subjects/student", icon: "📚" },
        { name: "Lesson Topics", path: "/lesson-topics/student", icon: "🗂️" },
        { name: "AI Questions", path: "/ai-questions", icon: "🤖" },
        { name: "Enrollments", path: "/enrollments/student", icon: "🎓" },
        { name: "Student Profile", path: "/student-profiles/student", icon: "🧑‍🎓" },
      ],
    },
    // 🆕 ADD THIS NEW SECTION FOR INDIVIDUAL STUDENTS
    {
      title: "Individual Learning",
      collapsible: true,
      links: [
        { name: "My Dashboard", path: "/individual/dashboard", icon: "📊" },
        { name: "Upload Files", path: "/individual/uploads", icon: "📤" },
        { name: "My Schedule", path: "/individual/schedule", icon: "📅" },
        { name: "My Lessons", path: "/individual/lessons", icon: "📚" },
      ],
    },
    // 🆕 ADD THIS NEW SECTION
    {
      title: "Learning",
      collapsible: true,
      links: [
        { name: "Video Library", path: "/videos", icon: "🎥" },
        { name: "Live Sessions", path: "/live-sessions", icon: "📺" },
      ],
    },
    {
      title: "Assessments",
      collapsible: true,
      links: [
        { name: "Take Assessment", path: "/assessments/student", icon: "🧾" },
        { name: "Results", path: "/assessments/results", icon: "📊" },
        { name: "My Results", path: "/student/assessment-results", icon: "📊" },
      ],
    },
    {
      title: "Progress Tracking",
      collapsible: true,
      links: [
        { name: "Daily Planner", path: "/progress/daily", icon: "📅" },
        { name: "Progress History", path: "/progress/history", icon: "📈" },
      ],
    },
  ],

  PARENT: [
    {
      title: "Parent View",
      collapsible: true,
      links: [
        { name: "Dashboard", path: "/dashboard", icon: "🏠" },
        { name: "Messages", path: "/chat", icon: "💬" },
        { name: "Announcements", path: "/announcements", icon: "📢" },
        { name: "Child Departments", path: "/departments/parent", icon: "🏢" },
        { name: "Child Classes", path: "/classes/parent", icon: "🏫" },
        { name: "Child Subjects", path: "/subjects/parent", icon: "📗" },
        { name: "Children", path: "/users/parent", icon: "👥" },
        { name: "Enrollments", path: "/enrollments/parent", icon: "🎓" },
        { name: "Student Profiles", path: "/student-profiles/parent", icon: "🧑‍🎓" },
        { name: "Child Assessments", path: "/assessments/parent", icon: "🧾" },
        { name: "Child Progress", path: "/child-progress", icon: "📈" },
        { name: "Messages", path: "/messages", icon: "💬" },
      ],
    },
    // 🆕 ADD THIS NEW SECTION (optional for parents)
    {
      title: "Learning Resources",
      collapsible: true,
      links: [
        { name: "Video Library", path: "/videos", icon: "🎥" },
        { name: "Live Sessions", path: "/live-sessions", icon: "📺" },
      ],
    },
  ],
};

const Sidebar: React.FC = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const { logoutUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [sectionStates, setSectionStates] = useState<Record<string, boolean>>({});

  if (!user) return null;

  const primaryRole: Role =
    (["ADMIN", "TEACHER", "STUDENT", "PARENT"].find((r) => user.roles.includes(r)) as Role) ||
    "STUDENT";
  const navSections = links[primaryRole] || [];

  const toggleSection = (title: string) => {
    setSectionStates((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const isSectionOpen = (title: string, collapsible?: boolean) =>
    !collapsible || sectionStates[title] || true;

  const renderLink = (link: NavLinkItem) => (
    <NavLink
      key={link.name}
      to={link.path}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all ${
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground hover:bg-sidebar-accent/50"
        }`
      }
      onClick={() => setIsOpen(false)}
    >
      <span className="text-lg">{link.icon}</span>
      <span>{link.name}</span>
    </NavLink>
  );

  return (
    <>
      {/* 📱 Mobile toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-[100] p-2 rounded-md 
          bg-white dark:bg-gray-800 text-gray-900 dark:text-white
          border border-gray-300 dark:border-gray-600 shadow-lg
          md:hidden flex items-center justify-center
          focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
        aria-label="Toggle sidebar"
      >
        {isOpen ? <FiX size={28} /> : <FiMenu size={28} />}
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-sidebar border-r border-sidebar-border z-50
          transform transition-transform duration-300 overflow-y-auto
          md:sticky md:translate-x-0
          ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="p-4 border-b border-sidebar-border">
          <h2 className="text-xl font-heading font-bold text-sidebar-foreground">
            EduPlatform
          </h2>
          <p className="text-xs text-sidebar-foreground/70 mt-1">
            {primaryRole.charAt(0) + primaryRole.slice(1).toLowerCase()} Panel
          </p>
        </div>

        <nav className="flex-1 p-4 space-y-6">
          {navSections.map((section) => {
            const open = isSectionOpen(section.title, section.collapsible);
            return (
              <div key={section.title} className="space-y-2">
                <div className="flex justify-between items-center px-3">
                  <span className="text-xs font-semibold uppercase text-sidebar-foreground/70">
                    {section.title}
                  </span>
                  {section.collapsible && (
                    <button
                      onClick={() => toggleSection(section.title)}
                      className="p-1 rounded hover:bg-sidebar-accent/50 transition-colors"
                      aria-expanded={open}
                      aria-controls={`collapse-${section.title.replace(/\s/g, "-")}`}
                    >
                      <span className="text-xs text-sidebar-foreground/70">
                        {open ? "▲" : "▼"}
                      </span>
                    </button>
                  )}
                </div>

                <div
                  className={`space-y-1 overflow-visible transition-all duration-300 ${
                    open ? "max-h-full opacity-100" : "max-h-0 opacity-0"
                  }`}
                  id={`collapse-${section.title.replace(/\s/g, "-")}`}
                >
                  {section.links.map(renderLink)}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border space-y-3">
          <button
            onClick={toggleTheme}
            className="w-full py-2.5 px-4 rounded-md bg-sidebar-accent hover:bg-sidebar-accent/70 text-sidebar-accent-foreground transition-colors flex items-center justify-center gap-2 font-medium"
          >
            <span className="text-lg">🎨</span>
            <span>Toggle Theme</span>
          </button>

          <button
            onClick={logoutUser}
            className="w-full py-2.5 px-4 rounded-md bg-destructive hover:bg-destructive/90 text-destructive-foreground transition-colors flex items-center justify-center gap-2 font-medium"
          >
            <span className="text-lg">🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
