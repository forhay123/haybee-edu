import React, { useState, useEffect } from "react";
import { useAuth } from "./useAuth";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, ChevronLeft, ChevronRight, Check } from "lucide-react";

const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  // Form state
  const [currentStep, setCurrentStep] = useState(1);
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

  // Calculate total steps dynamically
  const getTotalSteps = () => {
    if (userType !== "STUDENT") return 3;
    if (studentType === "ASPIRANT") return 3;
    return 4;
  };

  const totalSteps = getTotalSteps();

  // Reset class and department when student type changes
  useEffect(() => {
    if (studentType === "ASPIRANT") {
      setPreferredClass("");
      setPreferredDepartment("");
    }
  }, [studentType]);

  // Reset to appropriate step when user type changes
  useEffect(() => {
    if (currentStep > getTotalSteps()) {
      setCurrentStep(getTotalSteps());
    }
  }, [userType, studentType]);

  const handleSubmit = async () => {
    setLoading(true);
    setError("");

    try {
      const payload: any = { fullName, email, password, phone, userType };
      
      if (userType === "STUDENT") {
        payload.studentType = studentType;
        
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
        return "Students in other schools using the platform after school hours";
      default:
        return "";
    }
  };

  const classOptions = ["JSS 1", "JSS 2", "JSS 3", "SS 1", "SS 2", "SS 3"];
  const departmentOptions = ["Science", "Commercial", "Arts"];

  // Validation for each step
  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return fullName.trim() && email.trim() && password.length >= 6;
      case 2:
        return phone.trim();
      case 3:
        return userType === "STUDENT" ? studentType : true;
      case 4:
        return true; // Class and department are optional
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (canProceed()) {
      if (currentStep === totalSteps) {
        handleSubmit();
      } else {
        setCurrentStep(prev => prev + 1);
        setError("");
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      setError("");
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1:
        return "Personal Information";
      case 2:
        return "Contact Details";
      case 3:
        return "Account Type";
      case 4:
        return "Academic Information";
      default:
        return "";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4 py-8">
      <div className="w-full max-w-2xl">
        {/* Progress Stepper */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
              <React.Fragment key={step}>
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all duration-300 ${
                      step < currentStep
                        ? "bg-green-500 text-white"
                        : step === currentStep
                        ? "bg-blue-600 text-white ring-4 ring-blue-200 dark:ring-blue-900"
                        : "bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    {step < currentStep ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      step
                    )}
                  </div>
                  <span className="text-xs mt-1 text-gray-600 dark:text-gray-400 hidden sm:block">
                    Step {step}
                  </span>
                </div>
                {step < totalSteps && (
                  <div
                    className={`flex-1 h-1 mx-2 transition-all duration-300 ${
                      step < currentStep
                        ? "bg-green-500"
                        : "bg-gray-300 dark:bg-gray-700"
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Create Your Account
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {getStepTitle()}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3 animate-in slide-in-from-top">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <span className="text-red-600 dark:text-red-400 text-sm">{error}</span>
            </div>
          )}

          {/* Step Content */}
          <div className="min-h-[300px]">
            {/* Step 1: Personal Information */}
            {currentStep === 1 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right duration-300">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Password *
                  </label>
                  <input
                    type="password"
                    placeholder="Minimum 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={6}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Must be at least 6 characters long
                  </p>
                </div>
              </div>
            )}

            {/* Step 2: Contact Details */}
            {currentStep === 2 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right duration-300">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    placeholder="Enter your phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    autoFocus
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    We'll use this to contact you about your account
                  </p>
                </div>
              </div>
            )}

            {/* Step 3: Account Type */}
            {currentStep === 3 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right duration-300">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    I am a *
                  </label>
                  <select
                    value={userType}
                    onChange={(e) => setUserType(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    autoFocus
                  >
                    <option value="STUDENT">Student</option>
                    {/* TODO: Uncomment when Parent portal is ready */}
                    {/* <option value="PARENT">Parent</option> */}
                  </select>
                </div>

                {userType === "STUDENT" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Student Type *
                      </label>
                      <select
                        value={studentType}
                        onChange={(e) => setStudentType(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      >
                        <option value="SCHOOL">School Student</option>
                        <option value="HOME">Home-Schooled</option>
                        <option value="ASPIRANT">Exam Aspirant</option>
                        <option value="INDIVIDUAL">Individual Learner</option>
                      </select>
                    </div>

                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <p className="text-sm text-blue-800 dark:text-blue-300">
                        {getStudentTypeDescription(studentType)}
                      </p>
                    </div>

                    {studentType === "INDIVIDUAL" && (
                      <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg">
                        <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-300 mb-2">
                          📅 Your Learning Hours:
                        </p>
                        <ul className="text-sm text-indigo-800 dark:text-indigo-300 space-y-1 ml-5 list-disc">
                          <li>Monday - Friday: 4:00 PM - 6:00 PM</li>
                          <li>Saturday: 12:00 PM - 3:00 PM</li>
                          <li>Sunday: Rest Day</li>
                        </ul>
                        <p className="text-sm text-indigo-700 dark:text-indigo-400 mt-2">
                          You'll upload your school timetable and schemes after registration.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Step 4: Academic Information */}
            {currentStep === 4 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right duration-300">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Current Class
                    <span className="text-gray-500 text-xs ml-1">(Optional)</span>
                  </label>
                  <select
                    value={preferredClass}
                    onChange={(e) => setPreferredClass(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    autoFocus
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

                {(preferredClass?.startsWith("SS") || preferredClass === "") && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Department
                      <span className="text-gray-500 text-xs ml-1">(Optional, for SS students)</span>
                    </label>
                    <select
                      value={preferredDepartment}
                      onChange={(e) => setPreferredDepartment(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
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

                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-sm text-amber-800 dark:text-amber-300">
                    💡 <strong>Note:</strong> These preferences help the admin set up your profile correctly. 
                    The admin will finalize your class and department assignment.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="flex items-center gap-2 px-6 py-3 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              <ChevronLeft className="w-5 h-5" />
              Back
            </button>

            <div className="text-sm text-gray-500 dark:text-gray-400">
              Step {currentStep} of {totalSteps}
            </div>

            <button
              type="button"
              onClick={nextStep}
              disabled={!canProceed() || loading}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? (
                <>
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
                  Creating...
                </>
              ) : currentStep === totalSteps ? (
                <>
                  Create Account
                  <Check className="w-5 h-5" />
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Login Link */}
        <p className="mt-6 text-center text-gray-600 dark:text-gray-300 text-sm">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
          >
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;