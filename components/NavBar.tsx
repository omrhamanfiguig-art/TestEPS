// Fix: Provide implementation for the NavBar component.
import React from 'react';
import { Cog6ToothIcon } from './Icons';

interface NavBarProps {
    activeScreen: 'vma-test' | 'evaluation' | 'settings' | 'physical-tests';
    setActiveScreen: (screen: 'vma-test' | 'evaluation' | 'settings' | 'physical-tests') => void;
}

export const NavBar: React.FC<NavBarProps> = ({ activeScreen, setActiveScreen }) => {
    const linkClasses = "px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2";
    const activeClasses = "bg-indigo-700 text-white";
    const inactiveClasses = "text-gray-300 hover:bg-indigo-500 hover:text-white";

    return (
        <nav className="bg-indigo-600 shadow-lg">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex-shrink-0 text-white text-xl font-bold flex items-center gap-2">
                        <span>VMA Test Tool</span>
                    </div>
                    <div className="hidden md:block">
                        <div className="ml-10 flex items-baseline space-x-4">
                            <button
                                onClick={() => setActiveScreen('vma-test')}
                                className={`${linkClasses} ${activeScreen === 'vma-test' ? activeClasses : inactiveClasses}`}
                            >
                                اختبار VMA
                            </button>
                            <button
                                onClick={() => setActiveScreen('evaluation')}
                                className={`${linkClasses} ${activeScreen === 'evaluation' ? activeClasses : inactiveClasses}`}
                            >
                                تقييم التحمل
                            </button>
                            <button
                                onClick={() => setActiveScreen('physical-tests')}
                                className={`${linkClasses} ${activeScreen === 'physical-tests' ? activeClasses : inactiveClasses}`}
                            >
                                الاختبارات البدنية
                            </button>
                            <button
                                onClick={() => setActiveScreen('settings')}
                                className={`${linkClasses} ${activeScreen === 'settings' ? activeClasses : inactiveClasses}`}
                                aria-label="الإعدادات"
                            >
                                <Cog6ToothIcon className="h-5 w-5" />
                                <span className="hidden lg:inline">الإعدادات</span>
                            </button>
                        </div>
                    </div>
                    {/* Mobile menu button could go here, for now using simple layout */}
                    <div className="md:hidden flex space-x-2">
                        <button
                            onClick={() => setActiveScreen('settings')}
                            className="p-2 rounded-md text-gray-300 hover:text-white hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                        >
                            <Cog6ToothIcon className="h-6 w-6" />
                        </button>
                    </div>
                </div>
            </div>
            {/* Mobile simplified nav */}
            <div className="md:hidden flex justify-center space-x-4 space-x-reverse pb-2">
                <button
                    onClick={() => setActiveScreen('vma-test')}
                    className={`text-xs ${activeScreen === 'vma-test' ? 'text-white font-bold' : 'text-indigo-200'}`}
                >
                    اختبار VMA
                </button>
                <button
                    onClick={() => setActiveScreen('evaluation')}
                    className={`text-xs ${activeScreen === 'evaluation' ? 'text-white font-bold' : 'text-indigo-200'}`}
                >
                    تقييم التحمل
                </button>
                <button
                    onClick={() => setActiveScreen('physical-tests')}
                    className={`text-xs ${activeScreen === 'physical-tests' ? 'text-white font-bold' : 'text-indigo-200'}`}
                >
                    الاختبارات البدنية
                </button>
            </div>
        </nav>
    );
};