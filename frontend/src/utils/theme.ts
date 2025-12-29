export const toggleTheme = (): void => {
  const htmlElement = document.documentElement;
  htmlElement.classList.toggle("dark");
  
  const isDark = htmlElement.classList.contains("dark");
  localStorage.setItem("theme", isDark ? "dark" : "light");
};

export const loadTheme = (): void => {
  const htmlElement = document.documentElement;
  const savedTheme = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

  if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
    htmlElement.classList.add("dark");
  } else {
    htmlElement.classList.remove("dark");
  }
};
