
import React from "react";
import { Link } from "react-router-dom";
import AuthForm from "@/components/AuthForm";
import Logo from "@/components/Logo";

const AuthPage = () => {
  return (
    <div className="min-h-screen flex flex-col bg-isn-light pattern-bg">
      {/* Simple header with just logo */}
      <header className="bg-white shadow-md py-4">
        <div className="container mx-auto px-4">
          <Link to="/">
            <Logo />
          </Link>
        </div>
      </header>
      
      {/* Main content */}
      <main className="flex-1 flex items-center justify-center py-12">
        <div className="w-full max-w-md">
          <AuthForm />
        </div>
      </main>
      
      {/* Simple footer */}
      <footer className="bg-white shadow-inner py-6">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <Logo size="sm" />
            <p className="text-gray-600 text-sm mt-4 md:mt-0">
              Connecting Indian Families &copy; {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AuthPage;
