// src/features/home/HomePage.tsx
import React from "react";
import { Link } from "react-router-dom";

const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white px-4">
      <header className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Welcome to EduPlatform</h1>
        <p className="text-lg max-w-xl mx-auto">
          Personalized learning for every student type: School, Home, and Exam Aspirants.
        </p>
      </header>

      <div className="flex space-x-4">
        <Link
          to="/register"
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Get Started
        </Link>
        <Link
          to="/login"
          className="px-6 py-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-800 transition"
        >
          Login
        </Link>
      </div>

      <footer className="mt-20 text-sm text-gray-500 dark:text-gray-400">
        &copy; {new Date().getFullYear()} EduPlatform. All rights reserved.
      </footer>
    </div>
  );
};

export default HomePage;
