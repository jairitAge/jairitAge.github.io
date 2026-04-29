'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import {
    EnvelopeIcon,
    AcademicCapIcon,
    HeartIcon,
    MapPinIcon
} from '@heroicons/react/24/outline';
import { MapPinIcon as MapPinSolidIcon, EnvelopeIcon as EnvelopeSolidIcon } from '@heroicons/react/24/solid';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import { Github, Linkedin, Pin } from 'lucide-react';
import type { SiteConfig } from '@/lib/config';
import { useMessages } from '@/lib/i18n/useMessages';

// Custom ORCID icon component
const OrcidIcon = ({ className }: { className?: string }) => (
    <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
        xmlns="http://www.w3.org/2000/svg"
    >
        <path d="M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zM7.369 4.378c.525 0 .947.431.947.947s-.422.947-.947.947a.95.95 0 0 1-.947-.947c0-.525.422-.947.947-.947zm-.722 3.038h1.444v10.041H6.647V7.416zm3.562 0h3.9c3.712 0 5.344 2.653 5.344 5.025 0 2.578-2.016 5.025-5.325 5.025h-3.919V7.416zm1.444 1.303v7.444h2.297c3.272 0 4.022-2.484 4.022-3.722 0-2.016-1.284-3.722-4.097-3.722h-2.222z" />
    </svg>
);

// Custom WeChat icon component
const WeChatIcon = ({ className }: { className?: string }) => (
    <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
        xmlns="http://www.w3.org/2000/svg"
    >
        <path d="M9.5 4C5.36 4 2 6.91 2 10.5c0 2.06 1.13 3.89 2.86 5.07L4 18l3.16-1.45c.74.18 1.52.28 2.34.28.18 0 .35 0 .53-.02-.13-.42-.21-.86-.21-1.31 0-3.04 2.91-5.5 6.5-5.5.18 0 .35.01.53.03C16.31 7.39 13.21 4 9.5 4zM7 9c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm5 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm10 6.5c0-2.49-2.46-4.5-5.5-4.5-3.04 0-5.5 2.01-5.5 4.5s2.46 4.5 5.5 4.5c.6 0 1.18-.08 1.72-.22L20.5 21l-.86-2.27C21.05 17.81 22 16.74 22 15.5zM15 14.5c-.41 0-.75-.34-.75-.75s.34-.75.75-.75.75.34.75.75-.34.75-.75.75zm3.5 0c-.41 0-.75-.34-.75-.75s.34-.75.75-.75.75.34.75.75-.34.75-.75.75z" />
    </svg>
);

interface ProfileProps {
    author: SiteConfig['author'];
    social: SiteConfig['social'];
    features: SiteConfig['features'];
    researchInterests?: string[];
}

export default function Profile({ author, social, features, researchInterests }: ProfileProps) {
    const messages = useMessages();

    const [hasLiked, setHasLiked] = useState(false);
    const [showThanks, setShowThanks] = useState(false);
    const [showAddress, setShowAddress] = useState(false);
    const [isAddressPinned, setIsAddressPinned] = useState(false);
    const [showEmail, setShowEmail] = useState(false);
    const [isEmailPinned, setIsEmailPinned] = useState(false);
    const [showWechat, setShowWechat] = useState(false);
    const [isWechatPinned, setIsWechatPinned] = useState(false);
    const [lastClickedTooltip, setLastClickedTooltip] = useState<'email' | 'address' | 'wechat' | null>(null);

    // Refs mirror the latest pinned values so onMouseLeave handlers don't
    // close over stale state right after a click toggles the pin.
    const isAddressPinnedRef = useRef(isAddressPinned);
    const isEmailPinnedRef = useRef(isEmailPinned);
    const isWechatPinnedRef = useRef(isWechatPinned);
    isAddressPinnedRef.current = isAddressPinned;
    isEmailPinnedRef.current = isEmailPinned;
    isWechatPinnedRef.current = isWechatPinned;

    // Check local storage for user's like status
    useEffect(() => {
        if (!features.enable_likes) return;

        const userHasLiked = localStorage.getItem('jiale-website-user-liked');
        if (userHasLiked === 'true') {
            setHasLiked(true);
        }
    }, [features.enable_likes]);

    const handleLike = () => {
        const newLikedState = !hasLiked;
        setHasLiked(newLikedState);

        if (newLikedState) {
            localStorage.setItem('jiale-website-user-liked', 'true');
            setShowThanks(true);
            setTimeout(() => setShowThanks(false), 2000);
        } else {
            localStorage.removeItem('jiale-website-user-liked');
            setShowThanks(false);
        }
    };

    const socialLinks = [
        ...(social.email ? [{
            name: messages.profile.email,
            href: `mailto:${social.email}`,
            icon: EnvelopeIcon,
            isEmail: true,
        }] : []),
        ...(social.wechat_qr ? [{
            name: 'WeChat',
            href: '#',
            icon: WeChatIcon,
            isWechat: true,
        }] : []),
        ...(social.location || social.location_details ? [{
            name: messages.profile.location,
            href: social.location_url || '#',
            icon: MapPinIcon,
            isLocation: true,
        }] : []),
        ...(social.google_scholar ? [{
            name: 'Google Scholar',
            href: social.google_scholar,
            icon: AcademicCapIcon,
        }] : []),
        ...(social.orcid ? [{
            name: 'ORCID',
            href: social.orcid,
            icon: OrcidIcon,
        }] : []),
        ...(social.github ? [{
            name: 'GitHub',
            href: social.github,
            icon: Github,
        }] : []),
        ...(social.linkedin ? [{
            name: 'LinkedIn',
            href: social.linkedin,
            icon: Linkedin,
        }] : []),
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="sticky top-8"
        >
            {/* Profile Image */}
            <div className="w-64 h-64 mx-auto mb-6 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105">
                <Image
                    src={author.avatar}
                    alt={author.name}
                    width={256}
                    height={256}
                    className="w-full h-full object-cover object-[32%_center]"
                    priority
                />
            </div>

            {/* Name and Title */}
            <div className="text-center mb-6">
                <h1 className="text-3xl font-serif font-bold text-primary mb-2">
                    {author.name}
                </h1>
                <p className="text-lg text-accent font-medium mb-1">
                    {author.title}
                </p>
                <p className="text-neutral-600 mb-2">
                    {author.institution}
                </p>
            </div>

            {/* Contact Links */}
            <div className="flex flex-wrap justify-center gap-3 sm:gap-4 mb-6 relative px-2">
                {socialLinks.map((link) => {
                    const IconComponent = link.icon;
                    if (link.isLocation) {
                        return (
                            <div key={link.name} className="relative">
                                <button
                                    onMouseEnter={() => {
                                        if (!isAddressPinned) setShowAddress(true);
                                        setLastClickedTooltip('address');
                                    }}
                                    onMouseLeave={() => !isAddressPinnedRef.current && setShowAddress(false)}
                                    onClick={() => {
                                        setIsAddressPinned(!isAddressPinned);
                                        setShowAddress(!isAddressPinned);
                                        setLastClickedTooltip('address');
                                    }}
                                    className={`p-2 sm:p-2 transition-colors duration-200 ${isAddressPinned
                                        ? 'text-accent'
                                        : 'text-neutral-600 dark:text-neutral-400 hover:text-accent'
                                        }`}
                                    aria-label={link.name}
                                >
                                    {isAddressPinned ? (
                                        <MapPinSolidIcon className="h-5 w-5" />
                                    ) : (
                                        <MapPinIcon className="h-5 w-5" />
                                    )}
                                </button>

                                {/* Address tooltip */}
                                <AnimatePresence>
                                    {(showAddress || isAddressPinned) && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.8 }}
                                            animate={{ opacity: 1, y: -10, scale: 1 }}
                                            exit={{ opacity: 0, y: -20, scale: 0.8 }}
                                            className={`absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full bg-neutral-800 text-white px-4 py-3 rounded-lg text-sm font-medium shadow-lg max-w-[calc(100vw-2rem)] sm:max-w-none sm:whitespace-nowrap ${lastClickedTooltip === 'address' ? 'z-20' : 'z-10'
                                                }`}
                                            onMouseEnter={() => {
                                                if (!isAddressPinned) setShowAddress(true);
                                                setLastClickedTooltip('address');
                                            }}
                                            onMouseLeave={() => !isAddressPinnedRef.current && setShowAddress(false)}
                                        >
                                            <div className="text-center">
                                                <div className="flex items-center justify-center space-x-2 mb-1">
                                                    <p className="font-semibold">{messages.profile.workAddress}</p>
                                                    {!isAddressPinned && (
                                                        <div className="flex items-center space-x-0.5 text-xs text-neutral-400 opacity-60">
                                                            <Pin className="h-2.5 w-2.5" />
                                                            <span className="hidden sm:inline">{messages.profile.click}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                {social.location_details?.map((line, i) => (
                                                    <p key={i} className="break-words">{line}</p>
                                                ))}
                                                <div className="mt-2 flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2 justify-center">
                                                    {social.location_url && (
                                                        <a
                                                            href={social.location_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center justify-center space-x-2 bg-accent hover:bg-accent-dark text-white px-3 py-1 rounded-md text-xs font-medium transition-colors duration-200 w-full sm:w-auto"
                                                        >
                                                            <MapPinIcon className="h-4 w-4" />
                                                            <span>{messages.profile.googleMap}</span>
                                                        </a>
                                                    )}
                                                </div>

                                            </div>
                                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-neutral-800"></div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    }
                    if ((link as { isWechat?: boolean }).isWechat && social.wechat_qr) {
                        return (
                            <div key={link.name} className="relative">
                                <button
                                    onMouseEnter={() => {
                                        if (!isWechatPinned) setShowWechat(true);
                                        setLastClickedTooltip('wechat');
                                    }}
                                    onMouseLeave={() => !isWechatPinnedRef.current && setShowWechat(false)}
                                    onClick={() => {
                                        setIsWechatPinned(!isWechatPinned);
                                        setShowWechat(!isWechatPinned);
                                        setLastClickedTooltip('wechat');
                                    }}
                                    className={`p-2 sm:p-2 transition-colors duration-200 ${isWechatPinned
                                        ? 'text-accent'
                                        : 'text-neutral-600 dark:text-neutral-400 hover:text-accent'
                                        }`}
                                    aria-label={link.name}
                                >
                                    <WeChatIcon className="h-5 w-5" />
                                </button>

                                <AnimatePresence>
                                    {(showWechat || isWechatPinned) && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.8 }}
                                            animate={{ opacity: 1, y: -10, scale: 1 }}
                                            exit={{ opacity: 0, y: -20, scale: 0.8 }}
                                            className={`absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full bg-neutral-800 text-white px-4 py-3 rounded-lg text-sm font-medium shadow-lg ${lastClickedTooltip === 'wechat' ? 'z-20' : 'z-10'
                                                }`}
                                            onMouseEnter={() => {
                                                if (!isWechatPinned) setShowWechat(true);
                                                setLastClickedTooltip('wechat');
                                            }}
                                            onMouseLeave={() => !isWechatPinnedRef.current && setShowWechat(false)}
                                        >
                                            <div className="text-center">
                                                <div className="flex items-center justify-center space-x-2 mb-2">
                                                    <p className="font-semibold">WeChat</p>
                                                    {!isWechatPinned && (
                                                        <div className="flex items-center space-x-0.5 text-xs text-neutral-400 opacity-60">
                                                            <Pin className="h-2.5 w-2.5" />
                                                            <span className="hidden sm:inline">{messages.profile.click}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={social.wechat_qr}
                                                    alt="WeChat QR"
                                                    className="block w-48 h-auto rounded bg-white"
                                                />
                                            </div>
                                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-neutral-800"></div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    }
                    if (link.isEmail) {
                        return (
                            <div key={link.name} className="relative">
                                <button
                                    onMouseEnter={() => {
                                        if (!isEmailPinned) setShowEmail(true);
                                        setLastClickedTooltip('email');
                                    }}
                                    onMouseLeave={() => !isEmailPinnedRef.current && setShowEmail(false)}
                                    onClick={() => {
                                        setIsEmailPinned(!isEmailPinned);
                                        setShowEmail(!isEmailPinned);
                                        setLastClickedTooltip('email');
                                    }}
                                    className={`p-2 sm:p-2 transition-colors duration-200 ${isEmailPinned
                                        ? 'text-accent'
                                        : 'text-neutral-600 dark:text-neutral-400 hover:text-accent'
                                        }`}
                                    aria-label={link.name}
                                >
                                    {isEmailPinned ? (
                                        <EnvelopeSolidIcon className="h-5 w-5" />
                                    ) : (
                                        <EnvelopeIcon className="h-5 w-5" />
                                    )}
                                </button>

                                {/* Email tooltip */}
                                <AnimatePresence>
                                    {(showEmail || isEmailPinned) && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.8 }}
                                            animate={{ opacity: 1, y: -10, scale: 1 }}
                                            exit={{ opacity: 0, y: -20, scale: 0.8 }}
                                            className={`absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full bg-neutral-800 text-white px-4 py-3 rounded-lg text-sm font-medium shadow-lg max-w-[calc(100vw-2rem)] sm:max-w-none sm:whitespace-nowrap ${lastClickedTooltip === 'email' ? 'z-20' : 'z-10'
                                                }`}
                                            onMouseEnter={() => {
                                                if (!isEmailPinned) setShowEmail(true);
                                                setLastClickedTooltip('email');
                                            }}
                                            onMouseLeave={() => !isEmailPinnedRef.current && setShowEmail(false)}
                                        >
                                            <div className="text-center">
                                                <div className="flex items-center justify-center space-x-2 mb-1">
                                                    <p className="font-semibold">{messages.profile.email}</p>
                                                    {!isEmailPinned && (
                                                        <div className="flex items-center space-x-0.5 text-xs text-neutral-400 opacity-60">
                                                            <Pin className="h-2.5 w-2.5" />
                                                            <span className="hidden sm:inline">{messages.profile.click}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <p className="break-words">{social.email?.replace('@', ' (at) ')}</p>
                                                <div className="mt-2">
                                                    <a
                                                        href={link.href}
                                                        className="inline-flex items-center justify-center space-x-2 bg-accent hover:bg-accent-dark text-white px-3 py-1 rounded-md text-xs font-medium transition-colors duration-200 w-full sm:w-auto"
                                                    >
                                                        <EnvelopeIcon className="h-4 w-4" />
                                                        <span className="sm:hidden">{messages.profile.send}</span>
                                                        <span className="hidden sm:inline">{messages.profile.sendEmail}</span>
                                                    </a>
                                                </div>
                                            </div>
                                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-neutral-800"></div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    }
                    return (
                        <a
                            key={link.name}
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 sm:p-2 text-neutral-600 dark:text-neutral-400 hover:text-accent transition-colors duration-200"
                            aria-label={link.name}
                        >
                            <IconComponent className="h-5 w-5" />
                        </a>
                    );
                })}
            </div>

            {/* Research Interests */}
            {researchInterests && researchInterests.length > 0 && (
                <div className="bg-neutral-100 dark:bg-neutral-800 rounded-lg p-4 mb-6 hover:shadow-lg transition-all duration-200 hover:scale-[1.02]">
                    <h3 className="font-semibold text-primary mb-3">{messages.profile.researchInterests}</h3>
                    <div className="space-y-2 text-sm text-neutral-700 dark:text-neutral-500">
                        {researchInterests.map((interest, index) => (
                            <div key={index}>{interest}</div>
                        ))}
                    </div>
                </div>
            )}

            {/* Like Button */}
            {features.enable_likes && (
                <div className="flex justify-center">
                    <div className="relative">
                        <motion.button
                            onClick={handleLike}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${hasLiked
                                ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 cursor-pointer'
                                }`}
                        >
                            {hasLiked ? (
                                <HeartSolidIcon className="h-4 w-4" />
                            ) : (
                                <HeartIcon className="h-4 w-4" />
                            )}
                            <span>{hasLiked ? messages.profile.liked : messages.profile.like}</span>
                        </motion.button>

                        {/* Thanks bubble */}
                        <AnimatePresence>
                            {showThanks && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.8 }}
                                    animate={{ opacity: 1, y: -10, scale: 1 }}
                                    exit={{ opacity: 0, y: -20, scale: 0.8 }}
                                    className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full bg-accent text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg whitespace-nowrap"
                                >
                                    {messages.profile.thanks} 😊
                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-accent"></div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            )}
        </motion.div>
    );
}
