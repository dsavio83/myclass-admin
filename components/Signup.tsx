import React, { useState, useEffect } from 'react';
import * as api from '../services/api';
import { useSession } from '../context/SessionContext';
import { AnimatedBackground } from './AnimatedBackground';
import Swal from 'sweetalert2';

interface SignupProps {
    onLoginClick: () => void;
}

// Kerala Districts and their Sub-districts (Taluks)
const KERALA_LOCATIONS: { [key: string]: string[] } = {
    "Thiruvananthapuram": ["Neyyattinkara", "Kattakada", "Nedumangad", "Thiruvananthapuram", "Chirayinkeezhu", "Varkala"],
    "Kollam": ["Kollam", "Karunagappally", "Kunnathur", "Kottarakkara", "Punalur", "Pathanapuram"],
    "Pathanamthitta": ["Thiruvalla", "Mallappally", "Ranni", "Kozhencherry", "Konni", "Adoor"],
    "Alappuzha": ["Cherthala", "Ambalapuzha", "Kuttanad", "Karthikappally", "Chengannur", "Mavelikkara"],
    "Kottayam": ["Meenachil", "Vaikom", "Kottayam", "Changanassery", "Kanjirappally"],
    "Idukki": ["Devikulam", "Udumbanchola", "Thodupuzha", "Peerumade", "Idukki"],
    "Ernakulam": ["Paravur", "Aluva", "Kunnathunad", "Muvattupuzha", "Kothamangalam", "Kanayannur", "Kochi"],
    "Thrissur": ["Thrissur", "Mukundapuram", "Kodungallur", "Chavakkad", "Thalapilly", "Chalakudy", "Kunnamkulam"],
    "Palakkad": ["Alathur", "Chittur", "Palakkad", "Pattambi", "Ottapalam", "Mannarkkad"],
    "Malappuram": ["Ernad", "Tirur", "Tirurangadi", "Ponnani", "Perinthalmanna", "Nilambur", "Kondotty"],
    "Kozhikode": ["Kozhikode", "Thamarassery", "Koyilandy", "Vatakara"],
    "Wayanad": ["Mananthavady", "Sulthan Bathery", "Vythiri"],
    "Kannur": ["Taliparamba", "Kannur", "Thalassery", "Iritty", "Payyanur"],
    "Kasaragod": ["Kasaragod", "Hosdurg", "Vellarikundu", "Manjeshwaram"]
};

export const Signup: React.FC<SignupProps> = ({ onLoginClick }) => {
    const { login } = useSession();
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        name: '',
        email: '',
        mobileNumber: '',
        class: '',
        schoolName: '',
        district: '',
        subDistrict: ''
    });

    // Derived state for sub-districts based on selected district
    const [availableSubDistricts, setAvailableSubDistricts] = useState<string[]>([]);

    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isTeacher, setIsTeacher] = useState(false);

    // Alternating Title State
    const [titleIndex, setTitleIndex] = useState(0);
    const titles = ["Tamil Vizuthukal", "தமிழ் விழுதுகள்"];

    useEffect(() => {
        const interval = setInterval(() => {
            setTitleIndex((prev) => (prev + 1) % titles.length);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    // Update available sub-districts when district changes
    useEffect(() => {
        if (formData.district && KERALA_LOCATIONS[formData.district]) {
            setAvailableSubDistricts(KERALA_LOCATIONS[formData.district]);
        } else {
            setAvailableSubDistricts([]);
        }
    }, [formData.district]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { id, value } = e.target;

        // If district changes, reset subDistrict
        if (id === 'district') {
            setFormData({
                ...formData,
                district: value,
                subDistrict: '' // Reset sub-district
            });
        } else {
            setFormData({
                ...formData,
                [id]: value
            });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        // Required fields validation
        if (!formData.username || !formData.password || !formData.name || !formData.email || !formData.mobileNumber || !formData.class || !formData.schoolName || !formData.district || !formData.subDistrict) {
            Swal.fire({
                icon: 'warning',
                title: 'Missing Details',
                text: 'Please fill in all required fields.',
                confirmButtonColor: '#3b82f6'
            });
            setIsLoading(false);
            return;
        }

        try {
            const signupData = {
                ...formData,
                role: isTeacher ? 'teacher' : 'student'
            };
            const sessionData = await api.signupUser(signupData);

            // Success Alert
            await Swal.fire({
                icon: 'success',
                title: 'Account Created!',
                text: 'Welcome to Tamil Vizuthukal.',
                timer: 2000,
                showConfirmButton: false
            });

            login(sessionData);
        } catch (err: any) {
            let errorMessage = 'An unknown error occurred.';

            if (err instanceof Error) {
                errorMessage = err.message;
            }

            // Handle Duplicate Key Error specifically
            if (errorMessage.includes('E11000') || errorMessage.includes('duplicate key')) {
                if (errorMessage.includes('email')) {
                    errorMessage = 'This email address is already registered. Please use a different email or sign in.';
                } else if (errorMessage.includes('username')) {
                    errorMessage = 'This username is already taken. Please choose another one.';
                } else {
                    errorMessage = 'Account already exists with these details.';
                }
            }

            Swal.fire({
                icon: 'error',
                title: 'Registration Failed',
                text: errorMessage,
                confirmButtonColor: '#ef4444'
            });
        } finally {
            setIsLoading(false);
        }
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const classOptions = Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`);

    return (
        <div className="relative flex items-center justify-center min-h-screen p-4 sm:p-6 lg:p-8 overflow-hidden">
            {/* Animated Background */}
            <AnimatedBackground />

            {/* Signup Form Container */}
            <div className="relative z-10 w-full max-w-md p-8 sm:p-10 space-y-8 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 mx-auto transform transition-all hover:scale-[1.01] duration-500">

                {/* Header Section */}
                <div className="text-center space-y-2">
                    <div className="h-10 flex items-center justify-center">
                        <span
                            key={titleIndex}
                            className={`text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 animate-fade-in-up transition-all duration-500 ${titleIndex === 1 ? 'font-tau-marutham-bold' : ''}`}
                        >
                            {titles[titleIndex]}
                        </span>
                    </div>

                    <p className="text-gray-600 dark:text-gray-300 font-medium pt-2">
                        Create your account to get started
                    </p>
                </div>

                <form className="space-y-5" onSubmit={handleSubmit}>

                    <div className="space-y-4">
                        <div className="group relative">
                            <input
                                id="name"
                                type="text"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                className="peer w-full px-5 py-3 text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-0 transition-colors placeholder-transparent"
                                placeholder="Full Name"
                            />
                            <label htmlFor="name" className="absolute left-5 -top-2.5 text-xs text-blue-500 bg-white dark:bg-gray-900 px-1 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3.5 peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-blue-500">
                                Full Name
                            </label>
                        </div>

                        <div className="group relative">
                            <select
                                id="class"
                                value={formData.class}
                                onChange={handleChange}
                                required
                                className="peer w-full px-5 py-3 text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-0 transition-colors appearance-none"
                            >
                                <option value="" disabled hidden>Select Class</option>
                                {classOptions.map((className) => (
                                    <option key={className} value={className}>{className}</option>
                                ))}
                            </select>
                            <label htmlFor="class" className="absolute left-5 -top-2.5 text-xs text-blue-500 bg-white dark:bg-gray-900 px-1">
                                Class
                            </label>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                        </div>

                        <div className="group relative">
                            <input
                                id="schoolName"
                                type="text"
                                value={formData.schoolName}
                                onChange={handleChange}
                                required
                                className="peer w-full px-5 py-3 text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-0 transition-colors placeholder-transparent"
                                placeholder="School Name"
                            />
                            <label htmlFor="schoolName" className="absolute left-5 -top-2.5 text-xs text-blue-500 bg-white dark:bg-gray-900 px-1 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3.5 peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-blue-500">
                                School Name
                            </label>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="group relative">
                                <select
                                    id="district"
                                    value={formData.district}
                                    onChange={handleChange}
                                    required
                                    className="peer w-full px-5 py-3 text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-0 transition-colors appearance-none"
                                >
                                    <option value="" disabled hidden>Select District</option>
                                    {Object.keys(KERALA_LOCATIONS).sort().map((district) => (
                                        <option key={district} value={district}>{district}</option>
                                    ))}
                                </select>
                                <label htmlFor="district" className="absolute left-5 -top-2.5 text-xs text-blue-500 bg-white dark:bg-gray-900 px-1">
                                    District
                                </label>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                </div>
                            </div>

                            <div className="group relative">
                                <select
                                    id="subDistrict"
                                    value={formData.subDistrict}
                                    onChange={handleChange}
                                    required
                                    disabled={!formData.district}
                                    className="peer w-full px-5 py-3 text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-0 transition-colors appearance-none disabled:bg-gray-100 disabled:dark:bg-gray-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                                >
                                    <option value="" disabled hidden>Select Sub-district</option>
                                    {availableSubDistricts.sort().map((sub) => (
                                        <option key={sub} value={sub}>{sub}</option>
                                    ))}
                                </select>
                                <label htmlFor="subDistrict" className="absolute left-5 -top-2.5 text-xs text-blue-500 bg-white dark:bg-gray-900 px-1">
                                    Sub District
                                </label>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                </div>
                            </div>
                        </div>

                        <div className="group relative">
                            <input
                                id="username"
                                type="text"
                                value={formData.username}
                                onChange={handleChange}
                                required
                                className="peer w-full px-5 py-3 text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-0 transition-colors placeholder-transparent"
                                placeholder="Username"
                                autoComplete="username"
                            />
                            <label htmlFor="username" className="absolute left-5 -top-2.5 text-xs text-blue-500 bg-white dark:bg-gray-900 px-1 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3.5 peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-blue-500">
                                Username
                            </label>
                        </div>

                        <div className="group relative">
                            <input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                className="peer w-full px-5 py-3 text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-0 transition-colors placeholder-transparent"
                                placeholder="Email Address"
                                autoComplete="email"
                            />
                            <label htmlFor="email" className="absolute left-5 -top-2.5 text-xs text-blue-500 bg-white dark:bg-gray-900 px-1 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3.5 peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-blue-500">
                                Email Address
                            </label>
                        </div>

                        <div className="group relative">
                            <input
                                id="mobileNumber"
                                type="tel"
                                value={formData.mobileNumber}
                                onChange={handleChange}
                                required
                                className="peer w-full px-5 py-3 text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-0 transition-colors placeholder-transparent"
                                placeholder="Mobile Number"
                            />
                            <label htmlFor="mobileNumber" className="absolute left-5 -top-2.5 text-xs text-blue-500 bg-white dark:bg-gray-900 px-1 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3.5 peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-blue-500">
                                Mobile Number
                            </label>
                        </div>

                        <div className="group relative">
                            <input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                value={formData.password}
                                onChange={handleChange}
                                required
                                className="peer w-full px-5 py-3 text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-0 transition-colors placeholder-transparent pr-12"
                                placeholder="Password"
                                autoComplete="new-password"
                            />
                            <label htmlFor="password" className="absolute left-5 -top-2.5 text-xs text-blue-500 bg-white dark:bg-gray-900 px-1 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3.5 peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-blue-500">
                                Password
                            </label>
                            <button
                                type="button"
                                onClick={togglePasswordVisibility}
                                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors"
                                aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                                {showPassword ? (
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                                    </svg>
                                ) : (
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                )}
                            </button>
                        </div>

                        <div className="flex items-center">
                            <input
                                id="isTeacher"
                                type="checkbox"
                                checked={isTeacher}
                                onChange={(e) => setIsTeacher(e.target.checked)}
                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                            <label htmlFor="isTeacher" className="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300">
                                I am a Teacher (Request teacher access)
                            </label>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-4 text-lg font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-500/30 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                    >
                        {isLoading ? (
                            <div className="flex items-center justify-center space-x-2">
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>Creating Account...</span>
                            </div>
                        ) : 'Sign Up'}
                    </button>
                </form>

                <div className="text-center pt-2">
                    <p className="text-gray-500 dark:text-gray-400">
                        Already have an account?{' '}
                        <button
                            onClick={onLoginClick}
                            className="font-bold text-blue-600 hover:text-blue-500 hover:underline transition-colors focus:outline-none"
                        >
                            Sign In
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};
