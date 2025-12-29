import React from "react";
// Assuming you have a default styling for input/select in your main CSS or using utility classes
const formInputClass =
  "w-full border border-input rounded-lg p-2.5 bg-background transition duration-150 focus:border-primary focus:ring-1 focus:ring-primary outline-none text-foreground shadow-sm";

interface UserFormProps<T> {
  onSubmit: (data: T) => void;
  isSubmitting?: boolean;
}

function UserForm<T>({ onSubmit, isSubmitting }: UserFormProps<T>) {
  // Example: form fields
  const [email, setEmail] = React.useState("");
  const [fullName, setFullName] = React.useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ email, fullName } as T);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-card rounded-xl border border-border shadow-md">
      <div>
        <label className="block text-sm font-medium mb-1 text-foreground">Full Name</label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="e.g. Jane Doe"
          className={formInputClass}
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1 text-foreground">Email Address</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="e.g. jane.doe@school.edu"
          className={formInputClass}
          required
        />
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          <>
            <span className="animate-spin mr-2">⏳</span> Creating User...
          </>
        ) : (
          "➕ Create User Account"
        )}
      </button>
    </form>
  );
}

export default UserForm;