import React, { useState, useEffect } from "react";
import { useAuth } from "./useAuth";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";

const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [userType, setUserType] = useState("STUDENT");
  const [studentType, setStudentType] = useState("SCHOOL");
  const [preferredClass, setPreferredClass] = useState("");
  const [preferredDepartment, setPreferredDepartment] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Reset class and department when student type changes
  useEffect(() => {
    if (studentType === "ASPIRANT") {
      setPreferredClass("");
      setPreferredDepartment("");
    }
  }, [studentType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload: any = { fullName, email, password, phone, userType };
      
      if (userType === "STUDENT") {
        payload.studentType = studentType;
        
        // Only include class and department for non-ASPIRANT students
        if (studentType !== "ASPIRANT") {
          if (preferredClass) payload.preferredClass = preferredClass;
          if (preferredDepartment) payload.preferredDepartment = preferredDepartment;
        }
      }
      
      await register(payload);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const getStudentTypeDescription = (type: string): string => {
    switch (type) {
      case "SCHOOL":
        return "Students enrolled in physical schools following standard curriculum";
      case "HOME":
        return "Home-schooled students with flexible learning schedules";
      case "ASPIRANT":
        return "Students preparing for WAEC, NECO, JAMB, or GCE exams";
      case "INDIVIDUAL":
        return "Students in other schools using the platform after school hours (Mon-Fri 4-6pm, Sat 12-3pm)";
      default:
        return "";
    }
  };

  // Common classes for Nigerian secondary schools
  const classOptions = [
    "JSS 1", "JSS 2", "JSS 3",
    "SS 1", "SS 2", "SS 3"
  ];

  // Common departments for senior secondary
  const departmentOptions = [
    "Science",
    "Commercial",
    "Arts"
  ];

  const showClassAndDepartment = userType === "STUDENT" && studentType !== "ASPIRANT";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-8">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-900 dark:text-white">
          Create Your Account
        </h1>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <span className="text-red-600 dark:text-red-400 text-sm">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Full Name
            </label>
            <input
              type="text"
              placeholder="Enter your full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Password
            </label>
            <input
              type="password"
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              placeholder="Enter your phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* User Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              I am a
            </label>
            <select
              value={userType}
              onChange={(e) => setUserType(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="STUDENT">Student</option>
              <option value="PARENT">Parent</option>
            </select>
          </div>

          {/* Student Type */}
          {userType === "STUDENT" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Student Type
              </label>
              <select
                value={studentType}
                onChange={(e) => setStudentType(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="SCHOOL">School Student</option>
                <option value="HOME">Home-Schooled</option>
                <option value="ASPIRANT">Exam Aspirant</option>
                <option value="INDIVIDUAL">Individual Learner</option>
              </select>

              <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-xs text-blue-800 dark:text-blue-300">
                  {getStudentTypeDescription(studentType)}
                </p>
              </div>

              {studentType === "INDIVIDUAL" && (
                <div className="mt-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg">
                  <p className="text-xs font-semibold text-indigo-900 dark:text-indigo-300 mb-1">
                    📅 Your Learning Hours:
                  </p>
                  <ul className="text-xs text-indigo-800 dark:text-indigo-300 space-y-0.5 ml-4 list-disc">
                    <li>Monday - Friday: 4:00 PM - 6:00 PM</li>
                    <li>Saturday: 12:00 PM - 3:00 PM</li>
                    <li>Sunday: Rest Day</li>
                  </ul>
                  <p className="text-xs text-indigo-700 dark:text-indigo-400 mt-2">
                    You'll upload your school timetable and schemes after registration.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Class Selection - Only for non-ASPIRANT students */}
          {showClassAndDepartment && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Current Class
                  <span className="text-gray-500 text-xs ml-1">(Optional)</span>
                </label>
                <select
                  value={preferredClass}
                  onChange={(e) => setPreferredClass(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select your class</option>
                  {classOptions.map((cls) => (
                    <option key={cls} value={cls}>
                      {cls}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  This helps admin assign you to the correct class
                </p>
              </div>

              {/* Department Selection - Only show for Senior Secondary */}
              {(preferredClass?.startsWith("SS") || preferredClass === "") && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Department
                    <span className="text-gray-500 text-xs ml-1">(Optional, for SS students)</span>
                  </label>
                  <select
                    value={preferredDepartment}
                    onChange={(e) => setPreferredDepartment(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select your department</option>
                    {departmentOptions.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    This helps admin assign you to the correct department
                  </p>
                </div>
              )}

              <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  💡 <strong>Note:</strong> These preferences help the admin set up your profile correctly. 
                  The admin will finalize your class and department assignment.
                </p>
              </div>
            </>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed mt-6"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Registering...
              </span>
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        {/* Login Link */}
        <p className="mt-6 text-center text-gray-600 dark:text-gray-300 text-sm">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-blue-600 dark:text-blue-400 font-medium hover:underline"
          >
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;