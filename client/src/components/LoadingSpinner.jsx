import React from 'react';

const LoadingSpinner = () => {
    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
            <div className="relative w-12 h-12">
                <div className="absolute top-0 left-0 w-full h-full border-4 border-slate-200 dark:border-slate-700 rounded-full"></div>
                <div className="absolute top-0 left-0 w-full h-full border-4 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
            <span className="sr-only">Loading...</span>
        </div>
    );
};

export default LoadingSpinner;
