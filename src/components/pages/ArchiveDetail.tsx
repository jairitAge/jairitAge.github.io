'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
    ArrowLeftIcon,
    ArrowTopRightOnSquareIcon,
    CalendarIcon,
    UserIcon,
    BookOpenIcon,
    MapPinIcon,
} from '@heroicons/react/24/outline';
import ReactMarkdown from 'react-markdown';
import { ArchiveItem } from '@/types/page';
import { useMessages } from '@/lib/i18n/useMessages';

const markdownComponents = {
    h1: ({ children }: React.ComponentProps<'h1'>) => (
        <h1 className="text-2xl font-serif font-bold text-primary mt-8 mb-3">{children}</h1>
    ),
    h2: ({ children }: React.ComponentProps<'h2'>) => (
        <h2 className="text-xl font-serif font-semibold text-primary mt-7 mb-3">{children}</h2>
    ),
    h3: ({ children }: React.ComponentProps<'h3'>) => (
        <h3 className="text-lg font-serif font-semibold text-primary mt-6 mb-2">{children}</h3>
    ),
    p: ({ children }: React.ComponentProps<'p'>) => (
        <p className="mb-4 last:mb-0 leading-relaxed">{children}</p>
    ),
    ul: ({ children }: React.ComponentProps<'ul'>) => (
        <ul className="list-disc list-outside pl-6 mb-4 space-y-1.5">{children}</ul>
    ),
    ol: ({ children }: React.ComponentProps<'ol'>) => (
        <ol className="list-decimal list-outside pl-6 mb-4 space-y-1.5">{children}</ol>
    ),
    li: ({ children }: React.ComponentProps<'li'>) => <li className="leading-relaxed">{children}</li>,
    a: ({ ...props }) => (
        <a
            {...props}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent font-medium transition-all duration-200 rounded hover:bg-accent/10 hover:shadow-sm"
        />
    ),
    blockquote: ({ children }: React.ComponentProps<'blockquote'>) => (
        <blockquote className="border-l-4 border-accent/50 pl-4 italic my-4 text-neutral-600 dark:text-neutral-500">
            {children}
        </blockquote>
    ),
    strong: ({ children }: React.ComponentProps<'strong'>) => (
        <strong className="font-semibold text-primary">{children}</strong>
    ),
    em: ({ children }: React.ComponentProps<'em'>) => <em className="italic">{children}</em>,
    code: ({ children }: React.ComponentProps<'code'>) => (
        <code className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-[0.95em] font-mono">
            {children}
        </code>
    ),
    pre: ({ children }: React.ComponentProps<'pre'>) => (
        <pre className="my-4 p-4 rounded-lg bg-neutral-100 dark:bg-neutral-800 overflow-x-auto text-sm font-mono leading-relaxed">
            {children}
        </pre>
    ),
    hr: () => <hr className="my-6 border-neutral-200 dark:border-neutral-800" />,
};

interface MetaRowProps {
    icon: React.ReactNode;
    label: string;
    children: React.ReactNode;
}

function MetaRow({ icon, label, children }: MetaRowProps) {
    return (
        <div className="flex items-start gap-2 text-sm">
            <span className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400 min-w-[5rem] shrink-0 pt-px">
                {icon}
                {label}
            </span>
            <span className="text-neutral-700 dark:text-neutral-300">{children}</span>
        </div>
    );
}

export default function ArchiveDetail({ item, body }: { item: ArchiveItem; body: string | null }) {
    const t = useMessages();

    const hasMeta = item.date || item.authors || item.venue || item.location || item.link;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <Link
                href="/archive"
                className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-accent transition-colors mb-6"
            >
                <ArrowLeftIcon className="h-4 w-4" />
                {t.archive.backToArchive}
            </Link>

            <header className="mb-8">
                <h1 className="text-3xl sm:text-4xl font-serif font-bold text-primary leading-tight mb-4">
                    {item.title}
                </h1>

                {item.summary && (
                    <p className="text-base text-neutral-600 dark:text-neutral-400 leading-relaxed mb-6">
                        {item.summary}
                    </p>
                )}

                {hasMeta && (
                    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 space-y-2.5">
                        {item.date && (
                            <MetaRow icon={<CalendarIcon className="h-4 w-4" />} label={t.archive.date}>
                                {item.date}
                            </MetaRow>
                        )}
                        {item.authors && (
                            <MetaRow icon={<UserIcon className="h-4 w-4" />} label={t.archive.authors}>
                                {item.authors}
                            </MetaRow>
                        )}
                        {item.venue && (
                            <MetaRow icon={<BookOpenIcon className="h-4 w-4" />} label={t.archive.venue}>
                                <span className="italic">{item.venue}</span>
                            </MetaRow>
                        )}
                        {item.location && (
                            <MetaRow icon={<MapPinIcon className="h-4 w-4" />} label={t.archive.location}>
                                {item.location}
                            </MetaRow>
                        )}
                        {item.link && (
                            <MetaRow icon={<ArrowTopRightOnSquareIcon className="h-4 w-4" />} label={t.archive.viewSource}>
                                <a
                                    href={item.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-accent font-medium hover:underline break-all"
                                >
                                    {item.link}
                                </a>
                            </MetaRow>
                        )}
                    </div>
                )}

                {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                        {item.tags.map((tag) => (
                            <span
                                key={tag}
                                className="text-xs text-neutral-500 bg-neutral-50 dark:bg-neutral-800/50 px-2 py-1 rounded border border-neutral-100 dark:border-neutral-800"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                )}
            </header>

            <article className="text-base text-neutral-700 dark:text-neutral-300">
                {body ? (
                    <ReactMarkdown components={markdownComponents}>{body}</ReactMarkdown>
                ) : (
                    <p className="text-neutral-500 dark:text-neutral-400 italic">{t.archive.noNotesYet}</p>
                )}
            </article>
        </motion.div>
    );
}
