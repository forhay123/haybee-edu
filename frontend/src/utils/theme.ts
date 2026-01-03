export const toggleTheme = (): void => {
  const htmlElement = document.documentElement;
  htmlElement.classList.toggle("dark");
  
  const isDark = htmlElement.classList.contains("dark");
  localStorage.setItem("theme", isDark ? "dark" : "light");
};

export const loadTheme = (): void => {
  const htmlElement = document.documentElement;
  const savedTheme = localStorage.getItem("theme");

  // ✅ FIXED: Only apply dark theme if explicitly saved
  // Default to light theme - no system preference check
  if (savedTheme === "dark") {
    htmlElement.classList.add("dark");
  } else {
    htmlElement.classList.remove("dark");
    // Explicitly set light theme in storage if not set
    if (!savedTheme) {
      localStorage.setItem("theme", "light");
    }
  }
};

// Optional: Function to explicitly set theme
export const setTheme = (theme: "light" | "dark"): void => {
  const htmlElement = document.documentElement;
  
  if (theme === "dark") {
    htmlElement.classList.add("dark");
  } else {
    htmlElement.classList.remove("dark");
  }
  
  localStorage.setItem("theme", theme);
};

// Optional: Get current theme
export const getCurrentTheme = (): "light" | "dark" => {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
};